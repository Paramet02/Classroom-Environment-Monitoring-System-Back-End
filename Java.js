const { CosmosClient } = require("@azure/cosmos");
// ตั้งค่าการเชื่อมต่อ
const endpoint = "https://dbsmartbreathe.documents.azure.com:443/";
const key = "MSxSGURKeicAPLCzgF2ZXIUnmul6N0QDV569ppjA5uKPLAl5t4EqCyP1hpB7ILqXYI5tf5IGy962ACDbYXeNuw==";
const databaseId = "Cpe495";
const containerId = "DB1";
// สร้าง Client
const client = new CosmosClient({ endpoint, key });
async function getContentAndParse(deviceId) {
    const database = client.database(databaseId);
    const container = database.container(containerId);
    // Query ดึง Content จาก CosmosDB
    const querySpec = {
        query: "SELECT c.Content FROM c WHERE c['Device ID'] = @deviceId",
        parameters: [{ name: "@deviceId", value: deviceId }]
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    if (resources.length > 0) {
        const content = resources[0].Content;
        console.log("Raw Content:", content);

        // แปลงข้อมูล Content ให้อยู่ในรูปแบบ Object
        const parsedData = parseContent(content);
        console.log("Parsed Data:", parsedData);
    } else {
        console.log("ไม่พบข้อมูล");
    }
}
// ฟังก์ชันแยกค่าจาก Content
function parseContent(content) {
    const data = {};
    content.split(";").forEach((item) => {
        const [key, value] = item.split(":");
        if (key && value) {
            data[key.trim()] = value.trim();
        }
    });
    return data;
}
// ดึงข้อมูลและแยกค่า จาก Device ID = "4f05acf7"
getContentAndParse("4f05acf7");