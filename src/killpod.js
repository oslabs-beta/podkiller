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

// 4. FUNCTIONALITY TO DELETE A RANDOM POD
//add a conditional variable (if no argument, labelSelector defaults to null)

async function killPod(labelSelector = null) {
  console.log('The Label Selector is:', labelSelector);
  //namespace is the folder that holds the pods
  const namespace = 'default';

  try {
    // Get a list of the pods in the namespace
    const res = await k8sApi.listNamespacedPod({ 
      namespace,
      ...(labelSelector ? { labelSelector } : {}), 
    });

    console.log(chalk.underline.blue('Namespace Title:') + ' ' + chalk.bold.underline(namespace));

    if (!namespace) return 'Namespace is required';

    // Assign it to var
    const pods = res.items;
    console.log(chalk.italic.cyan('     Original Pods List: '), pods.map(p => p.metadata.name).join(' /// '));
    let numberOfPods = pods.length;

    if (numberOfPods === 0) {
      console.log(chalk.red('No pods matched or found.'));
      return;
    }

    // 7/31 DJ - Store the original pod names to identify new ones later
    const originalPodNames = pods.map(p => p.metadata.name);

    // Pick a random pod
    const randomIndex = Math.floor(Math.random() * numberOfPods);
    console.log('Random Index:', randomIndex);
    const pod = pods[randomIndex];
    const podName = pod.metadata.name;

    console.log(chalk.underline.red('Killing Pod:') + ' ' + chalk.bold.underline(podName));

    await k8sApi.deleteNamespacedPod({ name: podName, namespace: namespace });

    const podsNew = res.items;
    let newPodNumber = podsNew.length;

    // save deletionTime as a variable.
    const killedNodeDeletionTime = new Date().toISOString();

    console.log(chalk.magenta.italic('     Killed Pod: ') + podName);
    console.log(chalk.magenta.italic('     Deletion Stamp: ') + killedNodeDeletionTime);

    // 7/31 DJ - Wait a moment for Kubernetes to start creating replacement
    await new Promise(resolve => setTimeout(resolve, 1000));

    const res2 = await k8sApi.listNamespacedPod({ namespace });
    const pods2 = res2.items;

    // 7/31 DJ - Find the new pod (one that wasn't in original list)
    const newPod = pods2.find(pod => 
      !originalPodNames.includes(pod.metadata.name) && 
      pod.metadata.name !== podName
    );

    if (newPod) {
      console.log(chalk.underline.green('New Replacement Pod:') + ' ' + chalk.bold.underline(newPod.metadata.name));
      // 8/6 DJ - Added recoveryTime variable so backend would communicate value to frontend
      const recoveryTime = await measureRecovery(newPod.metadata.name, killedNodeDeletionTime, namespace, labelSelector);
      return { success: true, recoveryTime: recoveryTime };
    } else {
      console.log('No new replacement pod found yet');
      return { success: true, recoveryTime: null };
    }

  } catch (error) {
    console.error('Error during pod deletion:', error.body || error);
    return { success: false, error: error.message };
  }
}

// this is to be swapped with sandar's code
async function measureRecovery(podName, deletionTime, namespace, labelSelector = null) {
  console.log(chalk.italic.grey('     Measuring Ready Time for:'), podName,'...');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 7/31 DJ - added some flags for the while loop
  let podReady = false;
  let attempts = 0;
  const maxAttempts = 60

  while (!podReady && attempts < maxAttempts) {
    try {
      // Get the specific new pod
      const podRes = await k8sApi.readNamespacedPod({ 
        name: podName, 
        namespace: namespace 
      });
      
      const pod = podRes;
      
      if (pod.status && pod.status.phase === 'Running') {
        // Check if all containers are ready
        const containerStatuses = pod.status.containerStatuses || [];
        const allContainersReady = containerStatuses.every(status => status.ready);
        
        if (allContainersReady) {
          podReady = true;
          const readyTime = new Date().toISOString();
          
          // Calculate recovery time
          const deletionTimeMs = new Date(deletionTime).getTime();
          const readyTimeMs = new Date(readyTime).getTime();
          const recoveryTimeSeconds = (readyTimeMs - deletionTimeMs) / 1000;
          
          console.log(`     ✅ Pod ${podName} is ${chalk.bold.italic.underline.green('Ready')}!`);
          console.log(`     🕐 Recovery Time: ${chalk.bold.italic.underline.green(recoveryTimeSeconds.toFixed(2), 'seconds')}`);
          
          return recoveryTimeSeconds;
        }
      }
      
      console.log(`     ⏳ Reading Status: ${chalk.underline.italic.yellow(pod.status?.phase || 'Unknown')} (attempt ${attempts + 1})`);
      
    } catch (error) {
      console.log(`     ⚠️  Error checking pod status: ${chalk.red(error.message)}`);
    }
    
    attempts++;
    await sleep(1000);
  }

  if (!podReady) {
    console.log(`     ❌ Pod ${podName} did not become ready within ${maxAttempts} seconds`);
    return null;
  }
}

// This makes it so when you ==> node killpod.js WhatYouWriteHereIsLabelSelector
// Check if this file is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const labelSelector = process.argv[2] || null;
  killPod(labelSelector);
}

export {killPod};
