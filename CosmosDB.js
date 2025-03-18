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

// async function saveSensorData(data) {
//     try {
//         data.timestamp = new Date().toISOString();
//         await container.items.create(data);
//         console.log('Data saved:', data);
//     } catch (error) {
//         console.error('Error saving data:', error);
//     }
// }

async function fetchLatestData() {
    try {
        const querySpec = {
            query: "SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT 10",
        };

        const { resources } = await container.items.query(querySpec).fetchAll();
        if (resources.length > 0) {
            console.log("Latest Data Fetched:", resources);
            io.emit("newData", resources); // ส่งข้อมูลทั้งหมด 10 อัน
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}


module.exports = { fetchLatestData };
