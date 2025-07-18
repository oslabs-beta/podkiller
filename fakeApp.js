const express = require('express');
const app = express();
const PORT = 8081;

let isHealthy = false;
//Becomes healthy after 5 seconds
setTimeout(() => {
  isHealthy = true;
  console.log('Fake pod is now healthy');
}, 5000);
app.get('/healthz', (req, res) => {
  if (isHealthy) res.send('OK');
  else res.status(503).send('not ready');
});

app.listen(PORT, () => {
  console.log(`Fake app running at http://localhost:${PORT}`);
});
