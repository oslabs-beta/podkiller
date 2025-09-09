// Diagnostic script to test Kubernetes API method signatures
// Run via Node in Terminal

import * as k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

async function testAPISignatures() {
  console.log('Testing Kubernetes API method signatures...\n');
  
  // Test listNamespacedPod signatures
  console.log('=== Testing listNamespacedPod ===');
  
  const testMethods = [
    {
      name: 'Method 1: Object parameter',
      test: () => k8sApi.listNamespacedPod({ namespace: 'default' })
    },
    {
      name: 'Method 2: Positional parameter',
      test: () => k8sApi.listNamespacedPod('default')
    },
    {
      name: 'Method 3: All parameters',
      test: () => k8sApi.listNamespacedPod(
        'default', 
        undefined, // pretty
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        undefined, // labelSelector
        undefined, // limit
        undefined, // resourceVersion
        undefined, // resourceVersionMatch
        undefined, // sendInitialEvents
        undefined, // timeoutSeconds
        undefined  // watch
      )
    }
  ];
  
  for (const method of testMethods) {
    try {
      console.log(`Trying ${method.name}...`);
      const result = await method.test();
      console.log(`✅ ${method.name} WORKS!`);
      console.log(`   Response has ${result.body ? 'body property' : 'direct items'}`);
      const items = result.body ? result.body.items : result.items;
      console.log(`   Found ${items.length} pods\n`);
      break; // Stop after first successful method
    } catch (error) {
      console.log(`❌ ${method.name} failed: ${error.message}\n`);
    }
  }
  
  // Test readNamespacedPod signatures (if there are pods to test with)
  try {
    console.log('\n=== Testing readNamespacedPod ===');
    const listResult = await k8sApi.listNamespacedPod({ namespace: 'default' });
    const pods = listResult.items; // We know from previous test this has direct items
    
    if (pods.length > 0) {
      const testPodName = pods[0].metadata.name;
      console.log(`Testing with pod: ${testPodName}`);
      
      const readMethods = [
        {
          name: 'Method 1: Object parameter',
          test: () => k8sApi.readNamespacedPod({ name: testPodName, namespace: 'default' })
        },
        {
          name: 'Method 2: Positional parameters',
          test: () => k8sApi.readNamespacedPod(testPodName, 'default')
        },
        {
          name: 'Method 3: With pretty parameter',
          test: () => k8sApi.readNamespacedPod(testPodName, 'default', undefined)
        }
      ];
      
      for (const method of readMethods) {
        try {
          console.log(`Trying ${method.name}...`);
          const result = await method.test();
          console.log(`✅ ${method.name} WORKS!`);
          console.log(`   Response has ${result.body ? 'body property' : 'direct metadata'}`);
          const podData = result.body || result;
          console.log(`   Pod name: ${podData.metadata.name}`);
          console.log(`   Pod status: ${podData.status.phase}\n`);
          break;
        } catch (error) {
          console.log(`❌ ${method.name} failed: ${error.message}\n`);
        }
      }
    } else {
      console.log('No pods found in default namespace to test readNamespacedPod');
    }
  } catch (error) {
    console.log('Could not test readNamespacedPod:', error.message);
  }
  
  // Check client version
  console.log('\n=== Client Information ===');
  console.log('k8s object keys:', Object.keys(k8s));
  console.log('API client type:', k8sApi.constructor.name);
}

// Run the diagnostic
testAPISignatures().catch(console.error);