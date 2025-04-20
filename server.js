const express = require("express");
const cors = require("cors");
const registerRoute = require("./Register");
const loginRoute = require("./Login");
const profileRoute = require("./profile");
const airQualityController = require("./AirQualityController");

const app = express();

app.use(cors());
app.use(express.json());

app.use(registerRoute);
app.use(loginRoute);
app.use(profileRoute);

// ✅ เพิ่ม route สำหรับ Air Quality โดยตรง
// ✅ ใช้ router air-quality
app.use("/air-quality", airQualityRoute);

// ⛔️ ❌ ห้ามมีพวก app.post("/predict-air-quality", ...) หรือ app.post("/health-check", ...) ซ้ำซ้อนอีก

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
