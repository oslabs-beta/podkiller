const express = require('express');
const { measureRecovery } = require('./recovery');
const app = express();
const PORT = 3000;

//Endpoint to simulate recovery measurement
app.get('/simulate', async (req, res) => {
  const killedPod = 'myapp-abc123';
  console.log(`[SIM] Killing pod: ${killedPod}...`);
  //calls measureRecovery function
  const result = await measureRecovery({
    killedPod,
    probeUrl: 'http://localhost:8081/healthz', //simulated pod //where fake pod is running
    useProbe: true,
  });
  //Once the pod becomes healthy: the result is logged and return to browser
  console.log(`[SIM] Recovery complete:`, result);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Recovery simulator running at http://localhost:${PORT}`);
});
