require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

app.use(cors());
app.use(express.json());

const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
});
const database = cosmosClient.database(process.env.COSMOS_DATABASE);
const container = database.container(process.env.COSMOS_CONTAINER);

const PORT = process.env.PORT || 4000;


async function checkConnection() {
    try {
        await database.read();
        console.log('Connected to Cosmos DB successfully!');
    } catch (error) {
        console.error('Failed to connect to Cosmos DB:', error);
    }
}

checkConnection(); 

app.get("/fetchData", async (req, res) => {
    try {
        
        const querySpec = {
            query: `
                SELECT TOP 10 * 
                FROM c 
                ORDER BY c._ts DESC`,  
        };

        const { resources } = await container.items.query(querySpec).fetchAll();
        console.log("Fetched Data:", resources); 

        if (resources.length > 0) {
            res.json(resources); 
        } else {
            res.status(404).json({ message: "No data found" });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});



server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
