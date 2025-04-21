const express = require("express");
const router = express.Router();
const axios = require("axios");
const { poolPromise } = require("./ConnectDB");

// กำหนด BASE URL ของ ML API
const ML_API_BASE_URL = "https://ml-knn-bjdncabjdgbwexh9.southeastasia-01.azurewebsites.net";

// ฟังก์ชันช่วย Map ระดับคุณภาพอากาศ => ข้อความคำแนะนำ
function getAdviceByPrediction(predictionLabel) {
  switch (predictionLabel) {
    case "Good":
      return "คุณภาพอากาศอยู่ในเกณฑ์น่าพอใจและมีความเสี่ยงเพียงเล็กน้อยหรือไม่มีเลย";
    case "Moderate":
      return "ผู้ที่อ่อนไหวควรหลีกเลี่ยงกิจกรรมกลางแจ้ง เนื่องจากอาจมีอาการทางระบบทางเดินหายใจได้";
    case "Unhealthy for Sensitive Groups":
      return "โดยเฉพาะประชาชนทั่วไปและผู้ที่มีผิวแพ้ง่าย มีความเสี่ยงที่จะเกิดอาการระคายเคืองและปัญหาเกี่ยวกับระบบทางเดินหายใจ";
    case "Unhealthy":
      return "เพิ่มความเสี่ยงต่อการเกิดผลข้างเคียงและการระคายเคืองต่อหัวใจและปอดในประชาชนทั่วไป";
    case "Very Unhealthy":
      return "ประชาชนทั่วไปจะได้รับผลกระทบอย่างเห็นได้ชัด กลุ่มเสี่ยงควรงดกิจกรรมกลางแจ้ง";
    case "Hazardous":
      return "ประชาชนทั่วไปมีความเสี่ยงสูงที่จะเกิดอาการระคายเคืองและผลเสียต่อสุขภาพ ควรหลีกเลี่ยงกิจกรรมกลางแจ้ง";
    default:
      return "ไม่สามารถประเมินได้";
  }
}

// [POST] พยากรณ์คุณภาพอากาศ
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

    const mlRequestData = { features: featuresArray };

    console.log("Data being sent to ML API:", JSON.stringify(mlRequestData));

    let mlResponse;
    try {
      mlResponse = await axios.post(
        `${ML_API_BASE_URL}/predict`,
        mlRequestData,
        {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (apiErr) {
      console.error("Error calling ML API:", apiErr.message);
      return res.status(502).json({ status: "error", message: "ML service unavailable" });
    }

    const predictionLabel = mlResponse.data.prediction; // สมมติฝั่ง ML ส่ง field ชื่อ 'prediction'
    const adviceText = getAdviceByPrediction(predictionLabel);

    res.json({
      status: "success",
      prediction: predictionLabel,
      advice: adviceText
    });

  } catch (err) {
    console.error("Error in /predict-air-quality:", err.message);
    res.status(500).json({ status: "error", message: "Prediction failed" });
  }
});

// [GET] เช็กสุขภาพอากาศ
router.get("/health-check", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 1 * 
      FROM air_quality_data 
      ORDER BY timestamp DESC
    `);

    const rows = result.recordset;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "No data for health check" });
    }

    const latestData = rows[0];

    let mlResponse;
    try {
      mlResponse = await axios.post(
        `${ML_API_BASE_URL}/health-check`,
        {
          data: {
            pm25: latestData.pm25,
            co2: latestData.co2,
            humidity: latestData.humidity,
            temperature: latestData.temperature,
          }
        },
        { timeout: 5000 }
      );
    } catch (apiErr) {
      console.error("Error calling ML API (health-check):", apiErr.message);
      return res.status(502).json({ status: "error", message: "ML service unavailable" });
    }

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
