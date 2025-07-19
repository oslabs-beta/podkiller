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

    // console.log('this is the items array', res.items);

    let numberOfPods = pods.length;

    if (numberOfPods === 0) {
      console.log('No pods matched or found.');
      return;
    }

    // Pick a random pod
    // const randomIndex = Math.floor(Math.random() * numberOfPods);
    const pod = pods[0];
    const podName = pod.metadata.name;

    console.log(
      'Original List of PodNames = ',
      pods[0].metadata.name,
      ', ',
      pods[1].metadata.name
    );
    console.log(`Killing pod: ${podName}`);

    await k8sApi.deleteNamespacedPod({ name: podName, namespace: namespace });
    // save deletionTime as a variable.
    const killedNodeDeletionTime = new Date().toISOString();

    console.log({
      killedPod: podName,
      deletionTime: new Date().toISOString(),
    });

    await measureRecovery(pod, killedNodeDeletionTime);
  } catch (error) {
    console.error('Error during pod deletion:', error.body || error);
  }
}

// this is to be swapped with sandar's code
async function measureRecovery(pod, killedNodeDeletionTime) {
  console.log(`Simulating recovery for ${pod}...`);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // pull in updated list of pods
  // compare updated list against old list, finding newly created pod
  const namespace = 'default';
  const res = await k8sApi.listNamespacedPod({ namespace });
  const pods = res.items;

  // We need to pull in the old pod name and figure out the new pod name:
  const killedPodName = pod.metadata.name;
  console.log('Old killed pod name is ', killedPodName);
  // const recoveryPods = pods.filter(
  //   (pod) => pod.metadata.name !== killedPodName
  // ); // Exclude killed pod
  // console.log(
  //   'new list of pod names = ',
  //   pods[0].metadata.name,
  //   ', ',
  //   pods[1].metadata.name,
  //   ', ',
  //   pods[2].metadata.name
  // );

  // Filter out terminating pods
  const alivePods = pods.filter(
    (pod) => !pod.metadata.deletionTimestamp // Exclude pods with deletionTimestamp (terminating)
  );

  // If you want to see the difference, log both:
  console.log('All pods (including terminating):');
  pods.forEach((pod) => {
    console.log(
      `  ${pod.metadata.name} - Phase: ${
        pod.status.phase
      } - Terminating: ${!!pod.metadata.deletionTimestamp}`
    );
  });

  console.log('Alive pods only:');
  alivePods.forEach((pod) => {
    console.log(`  ${pod.metadata.name} - Phase: ${pod.status.phase}`);
  });

  const recoveryPod = alivePods.filter((pod) => pod.status.phase === 'Pending');
  console.log(
    'measureRecovery is tracking newly created pod - ',
    recoveryPod[0].metadata.name,
    ' Phase: ',
    recoveryPod[0].status.phase
  );

  while (recoveryPod[0].status.phase === 'Pending') {
    console.log('Status of the new pod is still Pending, waiting a second');
    await sleep(1000);
    const res = await k8sApi.listNamespacedPod({ namespace });
    const pods = res.items;

    const newTarget = pods.filter(
      (pod) => pod.metadata.name === recoveryPod[0].metadata.name
    );
    recoveryPod[0].status.phase = newTarget[0].status.phase;
    if (!namespace) {
      console.log('Namespace error');
      break;
    }
  }
  //*TODO make dates return a number
  const newPodReadyTime = new Date().toISOString();
  const recoveryTime = (newPodReadyTime - killedNodeDeletionTime) / 1000;
  // make it look like a nice number and return it.
  console.log('Total Recovery Time was ', recoveryTime, ' seconds!');
  return recoveryTime;
}

killPod();

// when you kill a pod, there is a 30 sec grace period while it is labeled as "terminating"
// so even though you have a list of 2 pods, when you terminate one and are regenerating a new one,
// you will have a list of 3 pods temporarily
