require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
});
const database = cosmosClient.database(process.env.COSMOS_DATABASE);
const container = database.container(process.env.COSMOS_CONTAINER);


async function checkConnection() {
    try {
        await database.read();
        console.log('Connected to Cosmos DB successfully!');
    } catch (error) {
        console.error('Failed to connect to Cosmos DB:', error);
    }
}

checkConnection(); 

async function saveSensorData(data) {
    try {
        data.timestamp = new Date().toISOString();
        await container.items.create(data);
        console.log('Data saved:', data);
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

async function getRecentSensorData() {
    try {
        const { resources } = await container.items
            .query('SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 10')
            .fetchAll();
        return resources;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

module.exports = { saveSensorData, getRecentSensorData };
