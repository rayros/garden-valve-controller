import * as mqtt from 'async-mqtt';
import { connect } from './connect';

const sonoffDualR2Topic = process.env.SONOFF_DUAL_R2_TOPIC;
const movementTime = Number(process.env.MOVEMENT_TIME);

const wait = (ms: number) => new Promise<void>(resolve => {
  setTimeout(resolve, ms);
});

const setState = async (client: mqtt.AsyncMqttClient, power: 'Power1' | 'Power2', state: 'ON' | 'OFF') => {
  console.log(power, state);
  const stateResult = new Promise<void>((resolve, reject) => {
    const timerId = setTimeout(() => {
      console.log('Retry setState');
      resolve(setState(client, power, state));
    }, 10_000)
    const handler = (topic: string, message: Buffer) => {
      if (topic === `${sonoffDualR2Topic}${power}`) {
        client.off('message', handler);
        clearTimeout(timerId);
        if (message.toString() === state) {
          resolve();
        } else {
          reject(new Error(`Sonoff not respond correct. Power: ${power}, State: ${message.toString()}, Expected: ${state}`));
        }
      }
    }
    client.on('message', handler);
  });
  await client.publish(`${sonoffDualR2Topic}${power}`, state);
  return stateResult;
}

const powerOff = async (client: mqtt.AsyncMqttClient) => {
  await setState(client, 'Power1', 'OFF');
  await setState(client, 'Power2', 'OFF');
  await wait(1000);
}

const openValve = async (client: mqtt.AsyncMqttClient) => {
  console.log('Opening valve...');
  await powerOff(client);
  await setState(client, 'Power1', 'ON');
  await wait(movementTime);
  await powerOff(client);
  console.log('Valve opened.');
};

const closeValve = async (client: mqtt.AsyncMqttClient) => {
  console.log('Closing valve...');
  await powerOff(client);
  await setState(client, 'Power2', 'ON');
  await wait(movementTime);
  await powerOff(client);
  console.log('Valve closed.');
};

export const worker = () => {
  process.once('message', async (msg) => {
    const client = await connect(`garden_valve_controller_worker_${process.pid}`);

    await client.subscribe([
      `${sonoffDualR2Topic}Power1`,
      `${sonoffDualR2Topic}Power2`,
    ]);

    if (msg === 'open') {
      await openValve(client);
      process.send('OPEN');
    }

    if (msg === 'close') {
      await closeValve(client);
      process.send('CLOSE');
    }

    await client.end();
  });
}