const axios = require('axios');

//Helper: sleep for X milliseconds
// This function pauses execution for a specified number of milliseconds (ms).
// You’ll use it to wait between each health check probe (e.g., 1 second delay between retries).
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//Helper: probe a health URL until it returns 200 OK
async function isHealthy(url) {
  try {
    const res = await axios.get(url);
    return res.status === 200;
  } catch {
    return false;
  }
}
//Core function : simulates measuring pod recovery time
async function measureRecovery({ killedPod, probeUrl, useProbe = true }) {
  //record when we kill the pod
  const startTime = new Date();
  if (useProbe) {
    let healthy = false;
    while (!healthy) {
      healthy = await isHealthy(probeUrl);
      if (!healthy) await sleep(1000); //retry every 1s
    }
    // This is useful when you don’t have a real app yet.
    // It simply waits 5 seconds as a placeholder for real recovery logic.
  } else {
    await sleep(5000); //fallback: fake fixed delay
  }

  const newPodReadyTime = new Date();
  const recoveryTime = (newPodReadyTime - startTime) / 1000;
  return {
    killedPod,
    startTime: startTime.toISOString(),
    newPodReadyTime: newPodReadyTime.toISOString(),
    recoveryTime: parseFloat(recoveryTime.toFixed(2)),
  };
}
module.exports = { measureRecovery };
