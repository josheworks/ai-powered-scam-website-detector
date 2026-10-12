require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const urlScoreCheck = require("./controllers/urlScoreCheck");
const Check = require("./models/ckeck");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.post("/check-url", async (req, res) => {
  try {
    const url =
      typeof req.body?.url === "string"
        ? req.body.url.trim()
        : "";

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
        errorType: "INVALID_URL"
      });
    }

    const result = await urlScoreCheck(url);

    // Return URL-fetch errors directly to the frontend.
    if (!result.success) {
      const statusByErrorType = {
        INVALID_URL: 400,
        BLOCKED_URL: 400,
        DNS_ERROR: 422,
        TIMEOUT: 504,
        NETWORK_ERROR: 502,
        HTTP_ERROR: 502,
        INVALID_CONTENT_TYPE: 422,
        BODY_READ_ERROR: 502,
        EMPTY_CONTENT: 422,
        FETCH_FAILED: 502
      };

      const status =
        statusByErrorType[result.errorType] || 502;

      return res.status(status).json({
        success: false,
        error: result.error || "Unable to check this website",
        errorType: result.errorType || "FETCH_FAILED"
      });
    }

    const {
  score,
  verdict,
  reasons,
  warnings,
  analysisStatus
} = result;

    // Save only successful URL checks.
    await Check.create({
      url,
      score,
      verdict,
      reasons
    });

    return res.json({
      success: true,
      score,
      verdict,
      reasons
    });
  } catch (err) {
    console.error("POST /check-url failed:", err);

    return res.status(500).json({
      success: false,
      error: "Something went wrong while checking this website",
      errorType: "INTERNAL_ERROR"
    });
  }
});

// History
app.get("/history", async (req, res) => {
  try {
    const checks = await Check.find().sort({
      timestamp: -1
    });

    return res.json(checks);
  } catch (err) {
    console.error("GET /history failed:", err);

    return res.status(500).json({
      error: "Could not load check history",
      errorType: "INTERNAL_ERROR"
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

