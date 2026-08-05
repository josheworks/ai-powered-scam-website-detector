const express = require("express");
const path = require("path");
const urlScoreCheck = require("./controllers/urlScoreCheck");

const app = express();
const frontendDir = path.join(__dirname, "../front-end");

app.use(express.json());
app.use(express.static(frontendDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.post("/check-url", (req, res) => {
  const url = req.body.url;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const urlscore = urlScoreCheck(url);

  res.json(urlscore);
});
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
