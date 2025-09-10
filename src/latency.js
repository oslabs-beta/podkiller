import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function setLatency(podName, namespace, latencyMs) {
  try {
    const cmd = `kubectl exec -n ${namespace} ${podName} -- tc qdisc replace dev eth0 root netem delay ${latencyMs}ms`;
    await execAsync(cmd);
    console.log(`🌐 Injected ${latencyMs}ms latency into ${podName}`);
  } catch (err) {
    console.error(
      `Failed to inject latency into ${podName}:`,
      err.stderr || err
    );
    throw err;
  }
}

export async function clearLatency(podName, namespace) {
  try {
    const cmd = `kubectl exec -n ${namespace} ${podName} -- tc qdisc del dev eth0 root netem || true`;
    await execAsync(cmd);
    console.log(`Cleared latency from ${podName}`);
  } catch (err) {
    console.error(`Failed to clear latency from ${podName}:`, err);
    throw err;
  }
}