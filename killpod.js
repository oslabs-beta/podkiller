// 1. LOAD LIBRARY
// pull in library that allows k8 js commands
// contains all functions we'll need to talk to our cluster (delete pod, etc.)
const k8s = require('@kubernetes/client-node');

// 2. TELL YOUR CODE WHERE CLUSTER IS
// launch new k8 config obj
const kc = new k8s.KubeConfig();
// tells your configuration to load credentials from default config file
// js code can now find and talk to cluster
kc.loadFromDefault();

// 3. BUILD AN API CLIENT OBJ THAT KNOWS HOW TO TALK TO CLUSTER'S API
// create a new instance of the CoreV1Api object ... can now send actual req to k8 API server using minikube
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// 4. FUNCTIONALITY TO DELETE A POD
// creates function that searches inside folder (namspace) for pods. optional label for pods - this is empty
async function killPods(namespace = 'default', labelSelector = '') {
  //call k8 to list all pods in that namspace, possibly filtered by label
  // like running: kubectl get pods -n <namespace> -l <labelSelector>
  const res = await k8sApi.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    labelSelector
  );
  //takes resp and grab the list of pods - this is how api returns the obj (body.items accesses the array of pods)
  const pods = res.body.items;
  //if no pods, return and print message
  if (pods.length === 0) {
    console.log('No pods matched or found.');
    return;
  }
  //for each pod, pull out podName, and print it
  //delete it
  //restate it (dummy placeholder logic)
  for (const pod of pods) {
    const podName = pod.metadata.name;
    console.log(`Killing pod: ${podName}`);
    await k8sApi.deleteNamespacedPod(podName, namespace);
    console.log({
      killedPod: podName,
      deletionTime: new Date().toISOString(),
    });
    // placeholder for recovery logic (Sandar)
    simulateDummyRecovery(podName);
  }
}
//helper function to simulate pod recovery
// currently just using setTimeout to make a 5 sec delay that will always return after 5 seconds
function simulateDummyRecovery(podName) {
  console.log(`Simulating recovery for ${podName}...`);
  setTimeout(() => {
    console.log(`Recovery complete for ${podName}`);
  }, 5000);
}


//call this function with actual namespace and label selector 
killPods('default', 'app=dummy-app'); 
