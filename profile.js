const express = require("express");
const verifyToken = require("./authMiddleware");
const { sql, poolPromise } = require("./ConnectDB");

const router = express.Router();

router.get("/profile", verifyToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, req.user.id)
      .query("SELECT id, username, email, created_at FROM users WHERE id = @id");

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
