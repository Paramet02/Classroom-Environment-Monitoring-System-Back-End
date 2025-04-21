const express = require("express");
const router = express.Router();
const axios = require("axios");
const nodemailer = require('nodemailer');
const { poolPromise } = require("./ConnectDB");
const mssql = require('mssql');
const cron = require('node-cron');
const getUserFromToken = require('./authMiddleware')
require('dotenv').config();

const ML_API_BASE_URL = "https://ml-knn-bjdncabjdgbwexh9.southeastasia-01.azurewebsites.net";


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


router.post("/predict-air-quality", getUserFromToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const userEmail = req.users.email;
    
    if (!userEmail) {
      return res.status(400).json({ message: 'ไม่พบอีเมลใน token ผู้ใช้' });
    }

    const result = await pool.request().query(`
      SELECT TOP 10 *
      FROM DeviceSensorAQI
      ORDER BY id DESC
    `);

    const rows = result.recordset;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "No sensor data found" });
    }

    const latest = rows[0]; 

    console.log("Processing data with ID:", latest.id);

    const featuresArray = [
      latest.PM2_5,
      latest.PM10,
      latest.NO2,
      latest.CO,
      latest.SO2,
      latest.O3
    ];

    const mlRequestData = { features: featuresArray };

    const mlResponse = await axios.post(
      `${ML_API_BASE_URL}/predict`,
      mlRequestData,
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const predictionLabel = mlResponse.data.prediction;
    const adviceText = getAdviceByPrediction(predictionLabel);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'bellsiravit@gmail.com',
        pass: 'heofbxlbaxchhsvv' 
      }
    });

    const mailOptions = {
      from: '"Air Quality Monitor" <bellsiravit@gmail.com>',
      to: userEmail,
      subject: 'ผลการวิเคราะห์คุณภาพอากาศล่าสุด',
      html: `
        <h3>ข้อมูลคุณภาพอากาศล่าสุด</h3>
        <p><b>ผลการประเมิน:</b> ${predictionLabel}</p>
        <p><b>คำแนะนำ:</b> ${adviceText}</p>
        <hr />
        <p>ข้อมูลเซนเซอร์:</p>
        <ul>
          <li>PM2.5: ${latest.PM2_5}</li>
          <li>PM10: ${latest.PM10}</li>
          <li>NO2: ${latest.NO2}</li>
          <li>CO: ${latest.CO}</li>
          <li>SO2: ${latest.SO2}</li>
          <li>O3: ${latest.O3}</li>
        </ul>
      `};

    await transporter.sendMail(mailOptions);


    res.json({
      status: 'success',
      prediction: predictionLabel,
      advice: adviceText,
      message: `ส่งอีเมลไปยัง ${userEmail} เรียบร้อยแล้ว`
    });

  } catch (err) {
    console.error("Error in /predict-air-quality:", err.message);
    res.status(500).json({ status: "error", message: "Prediction failed" });
  }
});


router.get("/past-24-hours-data", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT TOP 300
                id,
                created_at,
                Temperature,
                Humidity,
                PM2_5,
                PM10,
                NO2,
                CO,
                SO2,
                O3,
                eCO2,
                TVOC,
                Thai_AQI,
                AQI_Level
                
            
            FROM DeviceSensorAQI
            ORDER BY id DESC
      `);

    const rows = result.recordset;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "No sensor data found for the past 24 hours" });
    }

    res.json({
      status: "success",
      data: rows,
      data_period: "past 24 hours"
    });

  } catch (err) {
    console.error("Error in /air-quality/past-24-hours-data:", err.message);
    res.status(500).json({ status: "error", message: "Failed to retrieve data for the past 24 hours" });
  }
});

module.exports = router;
