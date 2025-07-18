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

    if (pods.length === 0) {
      console.log('No pods matched or found.');
      return;
    }

    // Pick a random pod
    const randomIndex = Math.floor(Math.random() * pods.length);
    const pod = pods[randomIndex];
    const podName = pod.metadata.name;

    console.log(`Killing pod: ${podName}`);

    await k8sApi.deleteNamespacedPod({ name: podName, namespace: namespace });

    // save deletionTime as a variable.
    const killedNodeDeletionTime = { deletionTime: new Date().toISOString() };

    console.log({
      killedPod: podName,
      deletionTime: new Date().toISOString(),
    });

    await measureRecovery(podName, killedNodeDeletionTime);
  } catch (error) {
    console.error('Error during pod deletion:', error.body || error);
  }
}

// this is to be swapped with sandar's code
function measureRecovery(podName, killedNodeDeletionTime) {
  console.log(`Simulating recovery for ${podName}...`);
  //**PICK UP HERE ON SAT */
  // when podName returns get timestamp
  // logic that tests when pod is created again. We're looking at the podlist for a name that matches
  // when that happens record start time
  const recoveryTime = (newPodReadyTime - killedNodeDeletionTime) / 1000;
  // make it look like a nice number and return it.

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Recovery complete for ${podName}`);
      resolve();
    }, 5000);
  });
}

killPod();
