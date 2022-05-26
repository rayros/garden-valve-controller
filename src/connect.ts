import * as mqtt from 'async-mqtt';

export const connect = () => mqtt.connectAsync(`mqtt://${process.env.MQTT_HOST}`, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
});
