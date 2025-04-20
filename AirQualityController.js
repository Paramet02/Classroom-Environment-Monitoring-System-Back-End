const express = require("express");
const router = express.Router();
const axios = require("axios");
const { poolPromise } = require("./ConnectDB");
const ML_API_BASE_URL = "http://localhost:8000"; // เปลี่ยนเป็น URL จริงตอนใช้จริงนะ

// 2.1 คาดการณ์คุณภาพอากาศ
router.post("/predict-air-quality", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT * FROM air_quality_data 
      WHERE timestamp > DATEADD(MINUTE, -10, GETDATE())
      ORDER BY timestamp ASC
    `);

    const rows = result.recordset;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "No recent data" });
    }

    const dataForML = rows.map(row => ({
      pm25: row.pm25,
      co2: row.co2,
      humidity: row.humidity,
      temperature: row.temperature,
      timestamp: row.timestamp,
    }));

    const mlResponse = await axios.post(`${ML_API_BASE_URL}/predict`, {
      data: dataForML,
      predictMinutes: req.body.predictMinutes || 15,
    }, { timeout: 5000 });

    res.json({ status: "success", prediction: mlResponse.data });

  } catch (err) {
    console.error("Error in /predict-air-quality:", err.message);
    res.status(500).json({ status: "error", message: "Prediction failed" });
  }
});

// 2.2 ตรวจสอบสุขภาพและแนะนำ
router.get("/health-check", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 1 * FROM air_quality_data 
      ORDER BY timestamp DESC
    `);

    const rows = result.recordset;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "No data for health check" });
    }

    const latestData = rows[0];

    const mlResponse = await axios.post(`${ML_API_BASE_URL}/health-check`, {
      data: {
        pm25: latestData.pm25,
        co2: latestData.co2,
        humidity: latestData.humidity,
        temperature: latestData.temperature,
      }
    }, { timeout: 5000 });

    res.json({
      status: "success",
      advice: mlResponse.data.advice,
      healthRisk: mlResponse.data.healthRisk,
    });

  } catch (err) {
    console.error("Error in /health-check:", err.message);
    res.status(500).json({ status: "error", message: "Health check failed" });
  }
});

module.exports = router;
