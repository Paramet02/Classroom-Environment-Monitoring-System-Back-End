require("dotenv").config(); 
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_DB_URI;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.DATABASE_NAME;
const containerId = process.env.CONTAINER_NAME;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function getItems() {
    try {
      console.log("Connecting to Cosmos DB...");
      const { resources } = await container.items.readAll().fetchAll();
      console.log("Connected! Data:", resources);
      return resources;
    } catch (error) {
      console.error("Error connecting:", error);
      throw error;
    }
  }
  

module.exports = { getItems };
