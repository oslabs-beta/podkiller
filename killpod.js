// 1. LOAD LIBRARY
// pull in library that allows k8 js commands
// contains all functions we'll need to talk to our cluster (delete pod, etc.)

import * as k8s from '@kubernetes/client-node';

// 2. LOAD CONFIGURATION
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// create api client
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// test to create and delete a namespace -- this worked
// let namespace = {
//   metadata: {
//     name: 'test3',
//   }
// }

// try {
//   const response = await k8sApi.createNamespace({ body: namespace });
//   console.log('Namespace created:', response.body);
//   const res = await k8sApi.readNamespace({ name: namespace.metadata.name });
//   console.log(res);
//   await k8sApi.deleteNamespace({ name: namespace.metadata.name });
// } catch (error) {
//   console.error('Error creating namespace:', error);
// }

// 4. FUNCTIONALITY TO DELETE A RANDOM POD
async function killPod() {
  //namespace is the folder that holds the pods
  const namespace = 'default';

  try {
    //get a list of the pods in the namespace //TRIPS UP HERE - returns NULL?
    const res = await k8sApi.listNamespacedPod('default');

    if (!namespace) return 'Namespace is required';

    // assign it to var
    const pods = res.body.items;

    if (pods.length === 0) {
      console.log('No pods matched or found.');
      return;
    }

    // Pick a random pod
    const randomIndex = Math.floor(Math.random() * pods.length);
    const pod = pods[randomIndex];
    const podName = pod.metadata.name;

    console.log(`Killing pod: ${podName}`);

    await k8sApi.deleteNamespacedPod(podName, namespace);

    console.log({
      killedPod: podName,
      deletionTime: new Date().toISOString(),
    });

    await simulateDummyRecovery(podName);
  } catch (error) {
    console.error('Error during pod deletion:', error.body || error);
  }
}

// this is to be swapped with sandar's code
function simulateDummyRecovery(podName) {
  console.log(`Simulating recovery for ${podName}...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Recovery complete for ${podName}`);
      resolve();
    }, 5000);
  });
}

killPod();
