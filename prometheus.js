import client from 'prom-client'; 
import express from 'express'; 


//create registry in prom 

const register = new client.Registry();
//optional
register.setDefaultLabels({
    app:'podkillerAndPeteStory'
})
//collect & send data to that registry 
// enable default metrics like CPU usage, memory usage, etc.
client.collectDefaultMetrics({ register })

const recoveryTimeMeasurer = new client.Gauge({
  name: 'pod_recovery_time_seconds',
  help: 'Seconds it takes to start a new pod after deletion',
  registers: [register],
  labelNames: ['killedPod', 'newPod', 'recoveryTime'],
})

// create an express app
const app = express()

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  const result = await register.metrics()
  res.send(result)
})


// start the server
const startPrometheusServer = () => {
    app.listen(3000, () => {
    console.log('Prometheus Server listening on port 3000')
});
}

export { startPrometheusServer, recoveryTimeMeasurer }; 

