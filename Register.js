const express = require("express");
const bcrypt = require("bcrypt");
const { sql, poolPromise } = require("./ConnectDB");

const router = express.Router();

router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
  
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
  
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
  
    try {
      const pool = await poolPromise;
      await pool
        .request()
        .input("username", sql.VarChar, username)
        .input("email", sql.VarChar, email)
        .input("password_hash", sql.Text, password_hash)
        .query("INSERT INTO users (username, email, password_hash, created_at) VALUES (@username, @email, @password_hash, GETDATE())");
  
      res.json({ message: "User registered successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

module.exports = router;
