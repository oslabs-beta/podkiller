import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';

async function test() {
  const kc = new KubeConfig();
  kc.loadFromDefault();

  const k8sApi = kc.makeApiClient(CoreV1Api);

  const namespace = 'default';
  const labelSelector = 'app=dummy-app';

  console.log('Namespace:', namespace);
  try {
    const res = await k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, labelSelector);
    const podNames = res.body.items.map(p => p.metadata.name);
    console.log('Pods found:', podNames);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
