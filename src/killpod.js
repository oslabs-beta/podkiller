// 1. LOAD LIBRARY
// pull in library that allows k8 js commands
// contains all functions we'll need to talk to our cluster (delete pod, etc.)

import * as k8s from '@kubernetes/client-node';
import chalk from 'chalk';

// 2. LOAD CONFIGURATION
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// 3. Create API client
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);


// 8/13 DJ - function to get all namespaces
async function getAvailableNamespaces() {
  try {
    const res = await k8sApi.listNamespace();
    return res.items
      .map(ns => ns.metadata.name)
      .filter(name => name !== 'kube-system' && name !== 'kube-public' && name !== 'kube-node-lease');
  } catch (error) {
    console.error('Error getting namespaces:', error.message);
    return ['default'];
  }
}

// 4. FUNCTIONALITY TO DELETE A POD
async function killPod(namespace = null, specificPodNames = []) {
    // namespace is the folder that holds the pods
    let targetNamespace;
    if (namespace) {
      targetNamespace = namespace;
      console.log(chalk.underline.blue('Using specified namespace:') + ' ' + chalk.bold.underline(targetNamespace));
    } else {
      // Auto-detect and use first available namespace with pods
      const availableNamespaces = await getAvailableNamespaces();
      console.log(chalk.cyan('Available namespaces:'), availableNamespaces.join(', '));
  
      if (availableNamespaces.length > 0) {
        const podsInNamespaces = await Promise.all(
          availableNamespaces.map(async (ns) => {
            try {
              // Try different methods to list pods
              let result;
              try {
                result = await k8sApi.listNamespacedPod({ namespace: ns });
              } catch (error1) {
                try {
                  result = await k8sApi.listNamespacedPod(ns);
                } catch (error2) {
                  result = await k8sApi.listNamespacedPod(ns, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
                }
              }
              return {
                namespace: ns,
                pods: (result.body ? result.body.items : result.items).length,
              };
            } catch (error) {
              return { namespace: ns, pods: 0 };
            }
          })
        );
        const namespaceWithPods = podsInNamespaces.find(p => p.pods > 0);
        if (namespaceWithPods) {
          targetNamespace = namespaceWithPods.namespace;
          console.log(chalk.underline.blue('Auto-detected namespace with pods:') + ' ' + chalk.bold.underline(targetNamespace));
        } else {
          throw new Error('No pods found in any namespace.');
        }
      } else {
        throw new Error('No namespaces found.');
      }
    }
  
    console.log(chalk.underline.blue('Killing Pod(s):'));
    
    // 🎯 Use Promise.all() to concurrently delete all pods in the specificPodNames array
    const killPromises = specificPodNames.map(podName => {
      return new Promise(async (resolve, reject) => {
        try {
          console.log(`Attempting to delete pod: ${podName} in namespace: ${targetNamespace}`);
          
          // Use the working method (object parameters)
          const podDeletion = await k8sApi.deleteNamespacedPod({
            name: podName,
            namespace: targetNamespace
          });
          
          // Handle different response formats
          const podData = podDeletion.body || podDeletion;
          const metadata = podData.metadata || {};
          
          console.log(`     Killed Pod: ${chalk.bold.italic.underline.red(metadata.name || podName)}`);
          resolve({ 
            killedPodName: metadata.name || podName, 
            deletionTime: new Date(metadata.deletionTimestamp || new Date()),
            deletionStamp: metadata.deletionTimestamp
          });
        } catch (error) {
          console.error(`Error killing pod ${podName}: ${error.message}`);
          reject(error);
        }
      });
    });
  
    try {
      // Wait for all kill promises to resolve before proceeding
      const killedPods = await Promise.all(killPromises);
      
      // Find the replacement pod(s) for the killed pod(s)
      const newPodPromises = killedPods.map(killedPod => findReplacementPod(killedPod, targetNamespace));
      const newPodsFound = await Promise.all(newPodPromises);
      
      const finalResults = await Promise.all(newPodsFound.map(async (newPod) => {
        if (newPod && newPod.replacementPodName) {
          const recoveryTime = await waitForPodReady(targetNamespace, newPod.replacementPodName, newPod.deletionTime);
          return {
            killedPodName: newPod.killedPodName,
            replacementPodName: newPod.replacementPodName,
            recoveryTime: recoveryTime
          };
        } else {
          return {
            killedPodName: newPod ? newPod.killedPodName : 'unknown',
            replacementPodName: null,
            recoveryTime: null
          };
        }
      }));
    
      // Create a combined report for all pods killed
      const report = {
        deletionTime: new Date().toISOString(),
        results: finalResults,
      };
      
      // Send the report to the dashboard
      await saveReportToDashboard(report);
    
      return { success: true, results: finalResults };
      
    } catch (error) {
      console.error('Error in killPod operation:', error);
      return { success: false, error: error.message };
    }
}

async function findReplacementPod(killedPod, namespace) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const maxAttempts = 30; // wait up to ~30 seconds
  const interval = 1000;  // check every 1s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await k8sApi.listNamespacedPod({ namespace });
      const pods = (res.body ? res.body.items : res.items);
      const alivePods = pods.filter(pod => !pod.metadata.deletionTimestamp);

      // Look for Pending pod (being scheduled)
      const pendingPods = alivePods.filter(pod => pod.status.phase === 'Pending');
      if (pendingPods.length > 0) {
        console.log(`     🔄 Found replacement pod (Pending): ${pendingPods[0].metadata.name}`);
        return {
          killedPodName: killedPod.killedPodName,
          replacementPodName: pendingPods[0].metadata.name,
          deletionTime: killedPod.deletionTime
        };
      }

      // Look for recently created pods (Running but new)
      const recentPods = alivePods.filter(pod => {
        const creationTime = new Date(pod.metadata.creationTimestamp);
        return creationTime > killedPod.deletionTime;
      });

      if (recentPods.length > 0) {
        console.log(`     🔄 Found recently created pod: ${recentPods[0].metadata.name}`);
        return {
          killedPodName: killedPod.killedPodName,
          replacementPodName: recentPods[0].metadata.name,
          deletionTime: killedPod.deletionTime
        };
      }

    } catch (error) {
      console.error(`Error checking for replacement pod: ${error.message}`);
    }

    await sleep(interval);
  }

  console.log(`     ⚠️ No replacement pod found for ${killedPod.killedPodName} after waiting`);
  return {
    killedPodName: killedPod.killedPodName,
    replacementPodName: null,
    deletionTime: killedPod.deletionTime
  };
}

// Function to wait for pod to be ready and measure recovery time
async function waitForPodReady(namespace, podName, deletionTime) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  
  try {
    console.log(chalk.italic.grey('     Measuring Ready Time for:'), podName, '...');
    
    let attempts = 0;
    const maxAttempts = 60; // Max 60 seconds
    
    while (attempts < maxAttempts) {
      try {
        // Get the specific pod
        const res = await k8sApi.readNamespacedPod({ name: podName, namespace });
        const pod = res.body || res;
        
        // Check if pod is ready
        if (pod.status.phase === 'Running') {
          // Check if all containers are ready
          const containerStatuses = pod.status.containerStatuses || [];
          const allReady = containerStatuses.length > 0 && containerStatuses.every(status => status.ready === true);
          
          if (allReady) {
            const readyTime = new Date();
            
            //  Use creationTimestamp of the new pod
            const creationTime = new Date(pod.metadata.creationTimestamp);
            const recoveryTime = (readyTime - creationTime) / 1000;
            
            console.log(`     ✅ Pod ${podName} is ${chalk.bold.italic.underline.green('Ready')}!`);
            console.log(`     ✅ Recovery Time: ${chalk.bold.italic.underline.green(recoveryTime.toFixed(2), 'seconds')}`);
            
            return recoveryTime;
          }
        }
        
        console.log(`     ⏳ Status: ${chalk.underline.italic.yellow(pod.status?.phase || 'Unknown')} (attempt ${attempts + 1})`);
        
      } catch (error) {
        // Pod might not exist yet, continue waiting
        console.log(`     ⏳ Waiting for pod to appear... (attempt ${attempts + 1})`);
      }
      
      await sleep(1000);
      attempts++;
    }
    
    console.log(`     ⚠️ Timeout waiting for pod ${podName} to be ready`);
    return null;
    
  } catch (error) {
    console.error(`Error waiting for pod ready: ${error.message}`);
    return null;
  }
}

// Sandar's measureRecovery function
async function measureRecovery(podName, deletionTime, namespace) {
  console.log(chalk.italic.grey('     Measuring Ready Time for:'), podName,'...');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 7/31 DJ - added some flags for the while loop
  let attempts = 0;
  
  // Get updated list and filter out terminating pods
  const res = await k8sApi.listNamespacedPod({ namespace });
  const pods = res.items;
  
  const alivePods = pods.filter(
    (pod) => !pod.metadata.deletionTimestamp
  );

  const recoveryPod = alivePods.filter((pod) => pod.status.phase === 'Pending');
  
  if (recoveryPod.length === 0) {
    console.log('No pending pods found');
    return null;
  }

  // Monitor until pod is ready
  while (recoveryPod[0].status.phase === 'Pending') {
    console.log(`     ⏳ Reading Status: ${chalk.underline.italic.yellow(recoveryPod[0].status?.phase || 'Unknown')} (attempt ${attempts + 1})`);
    await sleep(1000);
    const res = await k8sApi.listNamespacedPod({ namespace });
    const pods = res.items;

    const newTarget = pods.filter(
      (pod) => pod.metadata.name === recoveryPod[0].metadata.name
    );
    recoveryPod[0].status.phase = newTarget[0].status.phase;
  }

  const newPodReadyTime = new Date();
  const recoveryTime = (newPodReadyTime - new Date(deletionTime)) / 1000;
  
  console.log(`     ✅ Pod ${podName} is ${chalk.bold.italic.underline.green('Ready')}!`);
  console.log(`     ✅ Recovery Time: ${chalk.bold.italic.underline.green(recoveryTime.toFixed(2), 'seconds')}`);
  
  return recoveryTime;
}

/* Pete's original label selector function
This makes it so when you ==> node killpod.js WhatYouWriteHereIsLabelSelector
Check if this file is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const labelSelector = process.argv[2] || null;
  const namespace = process.argv[3] || null;
  killPod(labelSelector, namespace);
}
*/

// Sandar's saveReportToDashboard function
async function saveReportToDashboard(report) {
  try {
    const axios = await import('axios');
    const respond = await axios.default.post('http://localhost:3000/api/reports', report);
    console.log(`Report sent to dashboard: ${respond.data.filename || 'success'}`);
  } catch (error) {
    console.error('Failed to send report to dashboard:', error.message);
  }
}

export {killPod, getAvailableNamespaces};