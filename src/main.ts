import { AsyncMqttClient } from 'async-mqtt';
import cluster, { Worker } from 'node:cluster';
import { connect } from './connect';

const topic = process.env.GARDEN_VALVE_CONTROLLER_TOPIC;

let worker: Worker;

let chain = Promise.resolve();

let state = 'UNKNOWN';

const runWorker = (client: AsyncMqttClient, task: 'open' | 'close') => {
  worker = cluster.fork();
  worker.send(task);
  const handler = (message: string) => {
    state = message;
    client.publish(topic, message);
  }
  worker.once('message', handler)
  worker.once('exit', () => {
    worker.off('message', handler);
  })
}

const valve = (client: AsyncMqttClient, task: 'open' | 'close') => {
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

  const client = await connect('garden_valve_controller');

  await client.subscribe(topic);

  client.on('message', (_: string, message: Buffer) => {
    const messageString = message.toString();

    if (messageString === 'OPEN') {
      if (state !== 'OPEN') {
        valve(client, 'open');
      }
    }

    if (messageString === 'CLOSE') {
      if (state !== 'CLOSE') {
        valve(client, 'close');
      }
    }

    if (messageString === '') {
      client.publish(topic, state);
    }
  });

  console.log('Waiting for commands.');
}