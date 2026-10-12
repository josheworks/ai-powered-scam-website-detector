const httpsCheck = require("../services/httpscheck.js");
const ippatterncheck = require("../services/ipPatterncheck.js");
const resultVerdict = require("../utils/getVerdict.js");
const { fetchPageContent } = require("../services/fetchPageContent");
const { analyzeContent } = require("../services/aiContentAnalyzer");

async function urlScoreCheck(url) {
  const httpsResult = httpsCheck(url);
  const ippatternresult = ippatterncheck(url);
  let score = 100 + httpsResult.points + ippatternresult.points;

  const reasons = [];
  if (!httpsResult.passed) {
    reasons.push(httpsResult.reasons);
  }
  if (!ippatternresult.passed) {
    reasons.push(ippatternresult.reasons);
  }

  const page = await fetchPageContent(url);
const ai = page.success
  ? await analyzeContent(page.content, page.url)
  : {
      success: false,
      error: page.error || "Page content fetching failed",
      errorType: page.errorType || "FETCH_FAILED"
    };  console.log("AI:", ai)

  if (ai && ai.success) {
    score -= Math.round(ai.riskScore * 0.5);
    reasons.push(...ai.reasons.map((r) => "AI: " + r));
  } else {
    reasons.push("AI content analysis unavailable");
  }

  score = Math.max(0, score);
  const verdict = resultVerdict(score);

  return { score, reasons, verdict };
}

module.exports = urlScoreCheck;