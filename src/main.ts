import cluster, { Worker } from 'node:cluster';
import { connect } from './connect';

const topic = process.env.GARDEN_VALVE_CONTROLLER_TOPIC;

let worker: Worker;

let chain = Promise.resolve();

let state = 'UNKNOWN';

const runWorker = (client, task: 'open' | 'close') => {
  worker = cluster.fork();
  worker.send(task);
  worker.on('message', (message) => {
    state = message;
    client.publish(topic, state);
  })
}

const valve = (client, task: 'open' | 'close') => {
  chain = chain.then(() => {
    return new Promise<void>((resolve) => {
      if (worker) {
        worker.process.kill();
        worker.once('exit', () => {
          runWorker(client, task);
          resolve();
        })
      } else {
        runWorker(client, task);
        resolve();
      }
    })
  })
}

export const main = async () => {

  const client = await connect();

  await client.subscribe(topic);

  client.on('message', (_: string, message: Buffer) => {
    const messageString = message.toString();

    if (messageString === 'OPEN') {
      if (state === 'OPEN') {
        client.publish(topic, state);
      } else {
        valve(client, 'open');
      }
    }

    if (messageString === 'CLOSE') {
      if (state === 'CLOSE') {
        client.publish(topic, state);
      } else {
        valve(client, 'close');
      }
    }

    if (messageString === '') {
      client.publish(topic, state);
    }
  });

  console.log('Waiting for commands.');
}