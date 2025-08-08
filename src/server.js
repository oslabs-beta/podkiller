import express from 'express';
import { exec } from 'child_process';
import { killPod } from './killpod.js';
import * as k8s from '@kubernetes/client-node';

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

// Get pods
app.get('/api/pods/:namespace', async (req, res) => {
    try {
        const result = await k8sApi.listNamespacedPod({ 
            namespace: req.params.namespace 
        });
        const pods = result.items.map(pod => ({
            name: pod.metadata.name,
            status: pod.status.phase,
            namespace: pod.metadata.namespace
        }));
        res.json({ pods });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kill pod
app.post('/api/kill', async (req, res) => {
    try {
        const result = await killPod();
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Dashboard running at http://localhost:3000');
});