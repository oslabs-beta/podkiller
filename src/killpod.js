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
async function killPod(namespace, sendEvent, specificPodNames = []) {
  try {
    if (!namespace) namespace = "default";
    sendEvent("info", { message: `Selected Namespace: ${namespace}` });
    console.log(chalk.underline.blue('Using specified namespace:') + ' ' + chalk.bold.underline(namespace));
    console.log(`Received specific pods to kill: ${chalk.bold.italic.underline.yellow(specificPodNames)}`);

    // Ensure array
    if (!Array.isArray(specificPodNames)) {
      specificPodNames = [specificPodNames].filter(Boolean);
    }

    // If no pod names provided, pick one automatically
    if (specificPodNames.length === 0) {
      const res = await k8sApi.listNamespacedPod({ namespace });
      const pods = res.body ? res.body.items : res.items;
      
      if (!pods || pods.length === 0) {
        sendEvent("error", { message: "❌ No pods available to kill." });
        return;
      }
      
      // Filter for running pods first, fallback to any pod
      const runningPods = pods.filter(pod => pod.status.phase === 'Running');
      const podsToChooseFrom = runningPods.length > 0 ? runningPods : pods;
      
      // Pick a random pod instead of always the first one
      const randomPod = podsToChooseFrom[Math.floor(Math.random() * podsToChooseFrom.length)];
      specificPodNames = [randomPod.metadata.name];
      
      sendEvent("info", { message: `No pods specified, randomly selected: ${specificPodNames[0]}`});
      console.log(`Randomly selected pod: ${chalk.bold.italic.underline.red(specificPodNames[0])}`);
    } else {
      sendEvent("kill", { message: `Killing ${specificPodNames.length} specified pods` });
      console.log(`Killing specified pods: ${chalk.bold.italic.underline.red(specificPodNames)}`);
    }

    // Validate that specified pods exist in the namespace
    if (specificPodNames.length > 0) {
      const res = await k8sApi.listNamespacedPod({ namespace });
      const existingPods = res.body ? res.body.items : res.items;
      const existingPodNames = existingPods.map(pod => pod.metadata.name);
      
      const invalidPods = specificPodNames.filter(name => !existingPodNames.includes(name));
      if (invalidPods.length > 0) {
        sendEvent("error", { message: `❌ Pods not found in namespace ${namespace}: ${invalidPods.join(', ')}` });
        return;
      }
    }
    console.log(`Killing Pod(s) in: ${namespace}`);

    // Track killed pods AND claimed replacements
    const killedPods = [];
    const claimedReplacements = new Set();
    const finalResults = []; // Track results for report

    // Delete pods
    for (const podName of specificPodNames) {
      sendEvent("kill", { message: `💀 Deleting pod: ${podName}` });
      console.log(`      Deleting Pod: ${chalk.bold.italic.underline.red(podName)}`);
      await k8sApi.deleteNamespacedPod({ name: podName, namespace });
      killedPods.push({
        killedPodName: podName,
        deletionTime: new Date()
      });
    }

    // Wait for replacement pod(s) and build results
    for (const killed of killedPods) {
      const newPod = await findReplacementPod(killed, namespace, sendEvent, claimedReplacements);

      let resultData = {
        killedPodName: killed.killedPodName,
        replacementPodName: null,
        recoveryTime: null
      };

      if (newPod && newPod.replacementPodName) {
        claimedReplacements.add(newPod.replacementPodName);
        resultData.replacementPodName = newPod.replacementPodName;

        const recoveryTime = await waitForPodReady(
          namespace,
          newPod.replacementPodName,
          newPod.deletionTime,
          sendEvent
        );

        resultData.recoveryTime = recoveryTime;

        if (recoveryTime !== null) {
          sendEvent("done", {
            message: `✅ ${newPod.replacementPodName} recovered in ${recoveryTime.toFixed(2)}s`
          });
          console.log(`✅ ${chalk.bold.italic.underline.green(newPod.replacementPodName)} recovered in ${chalk.bold.italic.underline.green(recoveryTime.toFixed(2))}s`);
        } else {
          sendEvent("done", {
            message: `⚠️ Replacement ${newPod.replacementPodName} never became ready`
          });
          console.log(`⚠️ Replacement ${chalk.bold.italic.underline.red(newPod.replacementPodName)} never became ready`);
        }
      } else {
        sendEvent("done", {
          message: `⚠️ No replacement pod found for ${killed.killedPodName}`
        });
        console.log(`⚠️ No replacement pod found for ${chalk.bold.italic.underline.red(killed.killedPodName)}`);
      }

      // Add this result to finalResults
      finalResults.push(resultData);
    }

    // Create and save the report
    const report = {
      deletionTime: new Date().toISOString(),
      results: finalResults,
    };

    // Send the report to the dashboard
    await saveReportToDashboard(report);
    console.log(`📊 Report saved with ${finalResults.length} results`);

  } catch (error) {
    sendEvent("error", { message: `Error in killPod operation: ${error.message}` });
    console.log(`Error in killPod operation: ${chalk.bold.italic.underline.red(error.message)}`);
  }
}

async function findReplacementPod(killedPod, namespace, sendEvent = () => {}, claimedReplacements = new Set()) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const maxAttempts = 30; // ~30 seconds
  const interval = 1000;  // check every 1s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await k8sApi.listNamespacedPod({ namespace });
      const pods = (res.body ? res.body.items : res.items);
      const alivePods = pods.filter(pod => !pod.metadata.deletionTimestamp);

      // 🔍 Look for Pending pod that hasn't been claimed
      const pendingPods = alivePods.filter(pod => 
        pod.status.phase === 'Pending' && 
        !claimedReplacements.has(pod.metadata.name));

      if (pendingPods.length > 0) {
        const pendingName = pendingPods[0].metadata.name;
        sendEvent('replacement', { message: `🔄 Found Replacement (Pending): ${pendingName}` });
        console.log(`🔄 Found Replacement (Pending): ${chalk.bold.italic.underline.blue(pendingName)}`);
        return {
          killedPodName: killedPod.killedPodName,
          replacementPodName: pendingName,
          deletionTime: killedPod.deletionTime
        };
      }

      // Look for recently created pods that haven't been claimed yet
      const recentPods = alivePods.filter(pod => {
        if (claimedReplacements.has(pod.metadata.name)) return false;
        const creationTime = new Date(pod.metadata.creationTimestamp);
        // Look for pods created after deletion time, with a small buffer for timing
        const timeDiff = creationTime - killedPod.deletionTime;
        return timeDiff > -5000 && timeDiff < 60000; // 5 seconds before to 60 seconds after
      });

      // Sort by creation time to get the most recent unclaimed pod
      recentPods.sort((a, b) => new Date(b.metadata.creationTimestamp) - new Date(a.metadata.creationTimestamp));

      if (recentPods.length > 0) {
        const recentName = recentPods[0].metadata.name;
        sendEvent('replacement', { message: `🔄 Found recently created pod: ${recentName}` });
        console.log(`🔄 Found recently created pod: ${chalk.bold.italic.underline.blue(recentName)}`);
        return {
          killedPodName: killedPod.killedPodName,
          replacementPodName: recentName,
          deletionTime: killedPod.deletionTime
        };
      }

      // Still waiting
      sendEvent('replacement', { message: `⏳ Waiting for replacement pod... (attempt ${attempt + 1})` });
      console.log(`⏳ Waiting for replacement pod... (attempt ${chalk.bold.italic.underline.blue(attempt + 1)})`);

    } catch (error) {
      sendEvent('error', { message: `Error checking for replacement pod: ${error.message}` });
      console.log(`Error checking for replacement pod: ${chalk.bold.italic.underline.red(error.message)}`);
    }

    await sleep(interval);
  }

  sendEvent('replacement', { message: `⚠️ No replacement pod found for ${killedPod.killedPodName} after waiting` });
  console.log(`⚠️ No replacement pod found for ${chalk.bold.italic.underline.red(killedPod.killedPodName)} after waiting`);
  return {
    killedPodName: killedPod.killedPodName,
    replacementPodName: null,
    deletionTime: killedPod.deletionTime
  };
}

// Function to wait for pod to be ready and measure recovery time
async function waitForPodReady(namespace, podName, deletionTime, sendEvent = () => {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    sendEvent('recovery', { message: `⏳ Measuring Ready Time for: ${podName}...` });
    console.log(`⏳ Measuring Ready Time for: ${chalk.bold.italic.underline.blue(podName)}...`);

    let attempts = 0;
    const maxAttempts = 60; // wait up to 60s

    while (attempts < maxAttempts) {
      try {
        const res = await k8sApi.readNamespacedPod({ name: podName, namespace });
        const pod = res.body || res;

        if (pod.status.phase === 'Running') {
          const containerStatuses = pod.status.containerStatuses || [];
          const allReady = containerStatuses.length > 0 &&
                           containerStatuses.every(status => status.ready === true);

          if (allReady) {
            const readyTime = new Date();
            const creationTime = new Date(pod.metadata.creationTimestamp);
            const recoveryTime = (readyTime - creationTime) / 1000;

            sendEvent('success', { message: `✅ Pod ${podName} is Ready!` });
            console.log(`✅ ${chalk.bold.italic.underline.green(podName)} is Ready!`);
            sendEvent('success', { message: `✅ Recovery Time: ${recoveryTime.toFixed(2)} seconds` });
            console.log(`✅ Recovery Time: ${chalk.bold.italic.underline.green(recoveryTime.toFixed(2))} seconds`);

            return recoveryTime;
          }
        }

        sendEvent('recovery', { message: `Status: ${pod.status?.phase || 'Unknown'} (attempt ${attempts + 1})` });
        console.log(`      Status: ${chalk.bold.italic.underline.blue(pod.status?.phase || 'Unknown')} (attempt ${attempts + 1})`);

      } catch (error) {
        sendEvent('recovery', { message: `⏳ Waiting for pod ${podName} to appear... (attempt ${attempts + 1})` });
        console.log(`      Waiting for pod ${chalk.bold.italic.underline.blue(podName)} to appear... (attempt ${attempts + 1})`);
      }

      await sleep(1000);
      attempts++;
    }

    sendEvent('recovery', { message: `⚠️ Timeout waiting for pod ${podName} to be ready` });
    console.log(`⚠️ Timeout waiting for pod ${chalk.bold.italic.underline.blue(podName)} to be ready`);

    return null;

  } catch (error) {
    sendEvent('error', { message: `Error waiting for pod ready: ${error.message}` });
    console.log(`Error waiting for pod ready: ${chalk.bold.italic.underline.red(error.message)}`);

    return null;
  }
}

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

/* 
Pete's original label selector function

This makes it so when you ==> node killpod.js WhatYouWriteHereIsLabelSelector
Check if this file is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const labelSelector = process.argv[2] || null;
  const namespace = process.argv[3] || null;
  killPod(labelSelector, namespace);
}

Sandar's old measureRecovery function

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
*/