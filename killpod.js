// 1. LOAD LIBRARY
// pull in library that allows k8 js commands
// contains all functions we'll need to talk to our cluster (delete pod, etc.)

import * as k8s from '@kubernetes/client-node';

// 2. LOAD CONFIGURATION
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// create api client
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// 4. FUNCTIONALITY TO DELETE A RANDOM POD
async function killPod() {
  //namespace is the folder that holds the pods
  const namespace = 'default';

  try {
    //get a list of the pods in the namespace //TRIPS UP HERE - returns NULL?
    const res = await k8sApi.listNamespacedPod({ namespace });

    console.log('namespace title', namespace);

    if (!namespace) return 'Namespace is required';

    // assign it to var
    const pods = res.items;

    console.log('this is the items array', res.items);

    let numberOfPods = pods.length;

    if (numberOfPods === 0) {
      console.log('No pods matched or found.');
      return;
    }

    // Pick a random pod
    // const randomIndex = Math.floor(Math.random() * numberOfPods);
    const pod = pods[0];
    const podName = pod.metadata.name;

    console.log(`Killing pod: ${podName}`);

    await k8sApi.deleteNamespacedPod({ name: podName, namespace: namespace });

    const podsNew = res.items;

    let newPodNumber = podsNew.length;

    // save deletionTime as a variable.
    const killedNodeDeletionTime = new Date().toISOString();

    console.log({
      killedPod: podName,
      deletionTime: new Date().toISOString(),
    });

    const res2 = await k8sApi.listNamespacedPod({ namespace });
    const pods2 = res2.items;

    console.log(
      'this is the new items array',
      res2.items[0].metadata.name,
      res2.items[1].metadata.name
    );

    await measureRecovery(podName, killedNodeDeletionTime);
  } catch (error) {
    console.error('Error during pod deletion:', error.body || error);
  }
}

// this is to be swapped with sandar's code
async function measureRecovery(podName, killedNodeDeletionTime) {
  console.log(`Simulating recovery for ${podName}...`);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (podName.status.phase !== 'Running') {
    await sleep(1000);

    if (!namespace) {
      console.log('Namespace error');
      break;
    }

    const res = await k8sApi.listNamespacedPod(namespace);
    const pods = res.items;
    podName = pods.metadata.name;
  }

  const newPodReadyTime = new Date().toISOString();

  const recoveryTime = (newPodReadyTime - killedNodeDeletionTime) / 1000;
  // make it look like a nice number and return it.

  return recoveryTime;
}

killPod();
