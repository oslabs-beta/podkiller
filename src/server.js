import express from 'express';
import { exec } from 'child_process';
import { killPod } from './killpod.js';
import * as k8s from '@kubernetes/client-node';
import reportsRouter from './routes/logicReports.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// Check Minikube status
app.get('/api/status', async (req, res) => {
  try {
    await k8sApi.listNamespacedPod({ namespace: 'default' });
    res.json({ connected: true });
  } catch (error) {
    res.json({ connected: false });
  }
});

// Start Minikube
app.post('/api/minikube/start', (req, res) => {
  exec('minikube start', (error, stdout) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json({ success: true, output: stdout });
    }
  });
});

// 8/13 DJ - Get all namespaces
app.get('/api/namespaces', async (req, res) => {
  try {
    console.log('Attempting to list namespaces...');
    const result = await k8sApi.listNamespace();
    console.log('Successfully got namespaces:', result.items.length);

    const namespaces = result.items.map((ns) => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      creationTimestamp: ns.metadata.creationTimestamp,
    }));
    res.json({ namespaces });
  } catch (error) {
    console.error('Error fetching namespaces:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 8/13 DJ - Get pods from all namespaces
app.get('/api/pods', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default'; // Get from query parameter

    let result;
    if (namespace === 'all') {
      // Get pods from all namespaces
      const allNamespaces = await k8sApi.listNamespace();
      const allPods = [];

      for (const ns of allNamespaces.items) {
        try {
          const nsResult = await k8sApi.listNamespacedPod({
            namespace: ns.metadata.name,
          });
          allPods.push(...nsResult.items);
        } catch (error) {
          console.log(`Could not access namespace ${ns.metadata.name}`);
        }
      }
      result = { items: allPods };
    } else {
      result = await k8sApi.listNamespacedPod({
        namespace: namespace,
      });
    }

    const pods = result.items.map((pod) => ({
      name: pod.metadata.name,
      status: pod.metadata.deletionTimestamp ? 'Terminating' : pod.status.phase,
      namespace: pod.metadata.namespace,
    }));
    res.json({ pods });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8/13 DJ - Kill pod (accepts namespace entry)
app.post('/api/kill', async (req, res) => {
  try {
    const { namespace, labelSelector } = req.body;
    const result = await killPod(labelSelector, namespace);
    if (result.success) {
      res.json({
        success: result.success,
        recoveryTime: result.recoveryTime,
        killedPodName: result.killedPodName,
        replacementPodName: result.replacementPodName,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/reports', reportsRouter);
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.listen(3000, () => {
  console.log('Dashboard running at http://localhost:3000');
});
