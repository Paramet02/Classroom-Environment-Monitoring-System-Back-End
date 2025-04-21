const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("./ConnectDB");
require('dotenv').config();

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT * FROM users WHERE email = @email");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const users = result.recordset[0];
    const isMatch = await bcrypt.compare(password, users.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: users.id, username: users.username, email: users.email}, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
