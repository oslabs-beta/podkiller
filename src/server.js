import express from 'express';
import { exec } from 'child_process';
import { killPod } from './killpod.js';
import * as k8s from '@kubernetes/client-node';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
let k8sApi = kc.makeApiClient(k8s.CoreV1Api); // 9/8 DJ - Allow reassignment

// Check Minikube status
app.get('/api/status', async (req, res) => {
  try {
    // Try a simple API call to verify real connectivity
    await k8sApi.listNamespacedPod({ namespace: 'default', limit: 1 });
    res.json({ connected: true });
  } catch (error) {
    // If the call fails, we are not connected. Do not retry.
    console.log('❌ Kubernetes connection failed:', error.message);
    res.json({ connected: false, error: error.message });
  }
});
    
    /*
    // Try reloading config if connection fails
    if (reloadKubeConfig()) {
      try {
        await k8sApi.listNamespacedPod({ 
          namespace: 'default',
          limit: 1 
        });
        console.log('✅ Connection restored after config reload');
        res.json({ connected: true });
        return;
      } catch (retryError) {
        console.log('❌ Still failed after config reload');
      }
    }
    res.json({ connected: false, error: error.message });
  }});
  */

// Start Minikube
app.post('/api/minikube/start', (req, res) => {
  exec('minikube start', async (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Reload config and verify client
    reloadKubeConfig();
    try {
      // Make a simple call to ensure the new client works
      await k8sApi.listNamespace();
      console.log('✅ Verified Kubernetes client after start');
    } catch (err) {
      console.error('❌ Could not verify client after start:', err.message);
      return res.status(500).json({ error: 'Failed to verify connection after start' });
    }

    res.json({ success: true, output: stdout });
  });
});

// Stop Minikube
app.post('/api/minikube/stop', (req, res) => {
  exec('minikube stop', (error, stdout) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json({ success: true, output: stdout });
    }
  });
});

// 9/8 - Reload Minikube Config function
function reloadKubeConfig() {
  try {
    kc.loadFromDefault();
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    console.log('✅ Kubernetes configuration reloaded');
    return true;
  } catch (error) {
    console.error('❌ Failed to reload Kubernetes config:', error);
    return false;
  }
}

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

// Sandar's GET reports
app.get('/api/reports', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const files = await fs.default.readdir('./reports');
    const reports = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) =>
          fs.default.readFile(path.default.join('./reports', file), 'utf8')
        )
    );
    res.status(200).json({ reports: reports.map((r) => JSON.parse(r)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// Sandar's POST reports
app.post('/api/reports', async (req, res) => {
  const report = req.body;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `chaos-report-${timestamp}.json`;

  try {
    const fs = await import('fs/promises');
    await fs.default.mkdir('./reports', { recursive: true });
    await fs.default.writeFile(
      `./reports/${filename}`,
      JSON.stringify(report, null, 2)
    );
    res.status(201).json({ message: 'Report saved', filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.listen(3000, () => {
  console.log('Dashboard running at http://localhost:3000');
});
