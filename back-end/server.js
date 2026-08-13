require("dotenv").config();

const express = require("express");
const cors = require('cors');
const connectDB = require("./config/db")
const urlScoreCheck = require("./controllers/urlScoreCheck");
const Check = require("./models/ckeck");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.post("/check-url", async (req, res) => {
  
  const url = req.body.url;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  const urlscore = urlScoreCheck(url);
  const { score, verdict, reasons } = urlscore;
    await Check.create({
    url,
    score,
    verdict,
    reasons
  });

  res.json(urlscore);

});

//history
app.get("/history", async (req, res)=>{
  const check = await Check.find().sort({timestamp: -1 })

  res.json(check)
})

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
