const express = require("express");
const router = express.Router();
const axios = require("axios");
const { poolPromise, } = require("./ConnectDB");




router.post("/predict-air-quality", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 1 *
      FROM SensorData
      ORDER BY created_at DESC
    `);

    const rows = result.recordset;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "No sensor data found" });
    }

    const featuresArray = [
      rows[0].PM2_5,
      rows[0].PM10,
      rows[0].NO2,
      rows[0].CO,
      rows[0].SO2,
      rows[0].O3
    ];

    const mlRequestData = {
      features: featuresArray
    };

    console.log("Data being sent to ML API:", JSON.stringify(mlRequestData)); 

    const mlResponse = await axios.post(
      `https://ml-knn-bjdncabjdgbwexh9.southeastasia-01.azurewebsites.net/predict`,
      mlRequestData, 
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json' 
        }
      }
    );

    res.json({ status: "success", prediction: mlResponse.data });

  } catch (err) {
    console.error("Error in /predict-air-quality:", err.message);
    res.status(500).json({ status: "error", message: "Prediction failed" });
  }
});


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
