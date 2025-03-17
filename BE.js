const express = require("express");
const cors = require("cors");
const { getItems } = require("./ConnectDB.js");

const app = express();
app.use(cors());

app.get("/api/data", async (req, res) => {
  try {
    const data = await getItems();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
