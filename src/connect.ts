import * as mqtt from 'async-mqtt';

export const connect = (clientId: string) => mqtt.connectAsync(`mqtt://${process.env.MQTT_HOST}`, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clientId: clientId,
});
