require('dotenv').config();
const mqtt = require('mqtt');
const { saveSensorData } = require('./database');

const mqttClient = mqtt.connect(process.env.MQTT_BROKER);
let ioInstance = null;

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
    mqttClient.subscribe(process.env.MQTT_TOPIC, (err) => {
        if (!err) console.log(`Subscribed to topic: ${process.env.MQTT_TOPIC}`);
    });
});

mqttClient.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        await saveSensorData(data);
        if (ioInstance) ioInstance.emit('sensorData', data);
    } catch (error) {
        console.error('Error processing MQTT message:', error);
    }
});

function setSocketIo(io) {
    ioInstance = io;
}

module.exports = { setSocketIo };
