require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");

// สร้าง Express App
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
        allowedHeaders: ["*"], 
    },
});

// Middleware
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['*'], 
}));
app.use(express.json());

// ตรวจสอบ Environment Variables ว่าถูกต้องหรือไม่
if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER) {
    console.error("❌ ERROR: Missing required environment variables!");
    process.exit(1); // หยุดโปรแกรมถ้าค่าที่ต้องใช้ไม่ถูกต้อง
}

// เชื่อมต่อ Cosmos DB
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
});
const database = cosmosClient.database(process.env.COSMOS_DATABASE);
const container = database.container(process.env.COSMOS_CONTAINER);

// ตรวจสอบว่า Cosmos DB เชื่อมต่อได้หรือไม่
async function checkConnection() {
    try {
        await database.read();
        console.log('✅ Connected to Cosmos DB successfully!');
    } catch (error) {
        console.error('❌ Failed to connect to Cosmos DB:', error);
    }
}
checkConnection(); 

// ✅ Route สำหรับ "/" (ป้องกัน 404 Error)
app.get("/", (req, res) => {
    res.send("✅ API is running on Azure Web App!");
});

// ✅ API ดึงข้อมูลจาก Cosmos DB
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
        console.error("❌ Error fetching data:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// ✅ WebSocket Handling
io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔌 Client disconnected:", socket.id);
    });
});

// ✅ ใช้พอร์ต 80 ตามที่ Azure ต้องการ
const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
