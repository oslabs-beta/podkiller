import express from 'express';
//usually, Node.js is single-threaded. One CPU core max.
// (might be 4 chefs in the restaurant, but can only use one at a time)
// USing worker lets us spin up parallelle threads for CPU-heavy work without blocking main server loop
// need main server loop to keep server responding. Can't block main loop. Workers work on diff threads
import { Worker } from 'node:worker_threads';

//another Node.js module that gives you info about operation system
// os.cpus() --> used in func below, returns an array describing each logical CPU core
// "logical" -- as opposed to "physical" -- logical are created by hyperthreading and may be > than physical 
// (Use it to figure out how many Workers to launch for full CPU saturation)
import os from 'node:os';

const app = express();
let port = 3003;
let workers = [];

const startCPUSpike = () => {
  if (workers.length) return;
  console.log('Starting CPU Spike presently...');
  const cores = os.cpus().length;
  for (let i = 0; i < cores; i++) {
    const worker = new Worker(
      `
      while (true) {
      Math.sqrt(Math.random());
      }`,
      //this is an options object ... Node treats eval: true as CODE not a file plath , creating the loop 
      { eval: true }
    );
    workers.push(worker);
  }
};

const stopCPUSpike = () => {
  console.log('Stopping CPU Spike');
  //.terminate() is built into Node's Worker class from the worker_threads module
  // tells thread to exit ASAP - so kills the thread even though it's stuck in CPU spike mode
  workers.forEach((worker) => worker.terminate());
  workers = [];
};

app.post('/start', (req, res) => {
  startCPUSpike();
  res.send({ status: 'spike started' });
});

app.post('/stop', (req, res) => {
  stopCPUSpike();
  res.send({ status: 'spike stopped' });
});

app.get('/status', (req, res) => {
  res.send({ running: workers.length > 0 });
});

app.listen(port, () => {
  console.log(`CPU Spike control server running on port ${port}`);
});
