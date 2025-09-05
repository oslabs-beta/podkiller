// 1. LOAD LIBRARY
// pull in library that allows k8 js commands
// contains all functions we'll need to talk to our cluster (delete pod, etc.)

import * as k8s from '@kubernetes/client-node';
import chalk from 'chalk';
import { setLatency, clearLatency } from './latency.js';

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
  let podName;

  try {
    // Get a list of the pods in the namespace
    const res = await k8sApi.listNamespacedPod({
      namespace,
      ...(labelSelector ? { labelSelector } : {}),
    });

    console.log(
      chalk.underline.blue('Namespace Title:') +
        ' ' +
        chalk.bold.underline(namespace)
    );

    if (!namespace) return 'Namespace is required';

    // Assign it to var
    const pods = res.items;
    console.log(
      chalk.italic.cyan('     Original Pods List: '),
      pods.map((p) => p.metadata.name).join(' /// ')
    );
    let numberOfPods = pods.length;

    if (numberOfPods === 0) {
      console.log(chalk.red('No pods matched or found.'));
      return;
    }

    // 7/31 DJ - Store the original pod names to identify new ones later
    const originalPodNames = pods.map((p) => p.metadata.name);

    // Pick a random pod
    const randomIndex = Math.floor(Math.random() * numberOfPods);
    console.log('Random Index:', randomIndex);
    const pod = pods[randomIndex];
    podName = pod.metadata.name;

    console.log(
      chalk.underline.red('Killing Pod:') + ' ' + chalk.bold.underline(podName)
    );

    //inject latency ... 
    // set a min and a max and this will test under varying latency situations 
    // ... also adds to the chaos!!
    const minLatencyMs = 100;
    const maxLatencyMs = 2000;

    const latencyMs =
      Math.floor(Math.random() * (maxLatencyMs - minLatencyMs + 1)) +
      minLatencyMs;

    try {
      await setLatency(podName, namespace, latencyMs);
      console.log(`Inject latency of ${latencyMs}ms into pod ${podName}`);
    } catch (err) {
      console.error(`Latency injection skipped for ${podName}:`, err);
    }

    await k8sApi.deleteNamespacedPod({ name: podName, namespace: namespace });

    const podsNew = res.items;
    let newPodNumber = podsNew.length;

    // save deletionTime as a variable.
    const killedNodeDeletionTime = new Date().toISOString();

    console.log(chalk.magenta.italic('     Killed Pod: ') + podName);
    console.log(
      chalk.magenta.italic('     Deletion Stamp: ') + killedNodeDeletionTime
    );

    // 7/31 DJ - Wait a moment for Kubernetes to start creating replacement
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const res2 = await k8sApi.listNamespacedPod({ namespace });
    const pods2 = res2.items;

    // 7/31 DJ - Find the new pod (one that wasn't in original list)
    const newPod = pods2.find(
      (pod) =>
        !originalPodNames.includes(pod.metadata.name) &&
        pod.metadata.name !== podName
    );

    if (newPod) {
      console.log(
        chalk.underline.green('New Replacement Pod:') +
          ' ' +
          chalk.bold.underline(newPod.metadata.name)
      );
      // 8/6 DJ - Added recoveryTime variable so backend would communicate value to frontend
      const recoveryTime = await measureRecovery(
        newPod.metadata.name,
        killedNodeDeletionTime,
        namespace,
        labelSelector
      );
      // Sandar's report variable
      const report = {
        killedPodName: podName,
        namespace,
        deletionTime: killedNodeDeletionTime,
        recoveryPodName: newPod ? newPod.metadata.name : null,
        recoveryTime: recoveryTime,
      };

      // Sandar's dashboard saving function
      await saveReportToDashboard(report);
      return { success: true, recoveryTime: recoveryTime };
    } else {
      console.log('No new replacement pod found yet');
      return { success: true, recoveryTime: null };
    }
  } catch (error) {
    console.error('Error during pod deletion:', error.body || error);
    return { success: false, error: error.message };
  } finally {
    if (podName) {
      await clearLatency(podName, namespace).catch((err) =>
        console.error(`Latency clear error for ${podName}`, err)
      );
    }
  }
}

// Sandar's measureRecovery function
async function measureRecovery(
  podName,
  deletionTime,
  namespace,
  labelSelector = null
) {
  console.log(
    chalk.italic.grey('     Measuring Ready Time for:'),
    podName,
    '...'
  );
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 7/31 DJ - added some flags for the while loop
  let attempts = 0;

  // Get updated list and filter out terminating pods
  const res = await k8sApi.listNamespacedPod({ namespace });
  const pods = res.items;

  const alivePods = pods.filter((pod) => !pod.metadata.deletionTimestamp);

  const recoveryPod = alivePods.filter((pod) => pod.status.phase === 'Pending');

  if (recoveryPod.length === 0) {
    console.log('No pending pods found');
    return null;
  }

  // Monitor until pod is ready
  while (recoveryPod[0].status.phase === 'Pending') {
    console.log(
      `     ⏳ Reading Status: ${chalk.underline.italic.yellow(
        recoveryPod[0].status?.phase || 'Unknown'
      )} (attempt ${attempts + 1})`
    );
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

  console.log(
    `     ✅ Pod ${podName} is ${chalk.bold.italic.underline.green('Ready')}!`
  );
  console.log(
    `     ✅ Recovery Time: ${chalk.bold.italic.underline.green(
      recoveryTime.toFixed(2),
      'seconds'
    )}`
  );

  return recoveryTime;
}

// This makes it so when you ==> node killpod.js WhatYouWriteHereIsLabelSelector
// Check if this file is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const labelSelector = process.argv[2] || null;
  killPod(labelSelector);
}

// Sandar's saveReportToDashboard function
async function saveReportToDashboard(report) {
  try {
    const axios = await import('axios');
    const respond = await axios.default.post(
      'http://localhost:3000/api/reports',
      report
    );
    console.log(
      `Report sent to dashboard: ${respond.data.filename || 'success'}`
    );
  } catch (error) {
    console.error('Failed to send report to dashboard:', error.message);
  }
}

export { killPod };
