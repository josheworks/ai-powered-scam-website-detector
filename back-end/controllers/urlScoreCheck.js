const httpsCheck = require("../services/httpscheck.js");
const ippatterncheck = require("../services/ipPatterncheck.js");
const resultVerdict = require("../utils/getVerdict.js");
const {
  fetchPageContent
} = require("../services/fetchPageContent");
const {
  analyzeContent
} = require("../services/aiContentAnalyzer");

async function urlScoreCheck(url) {
  // Step 1: Run rule-based checks first.
  // These do not depend on successfully downloading the website.
  const httpsResult = httpsCheck(url);
  const ipPatternResult = ippatterncheck(url);

  let score =
    100 +
    httpsResult.points +
    ipPatternResult.points;

  const reasons = [];
  const warnings = [];

  if (!httpsResult.passed) {
    reasons.push(httpsResult.reasons);
  }

  if (!ipPatternResult.passed) {
    reasons.push(ipPatternResult.reasons);
  }

  // Step 2: Try to fetch the website.
  const page = await fetchPageContent(url);

  // Reject only malformed URLs and destinations blocked by
  // the existing URL safety checks.
  if (
    !page.success &&
    ["INVALID_URL", "BLOCKED_URL"].includes(page.errorType)
  ) {
    return {
      success: false,
      error: page.error,
      errorType: page.errorType,
      url: page.url || url
    };
  }

  // Step 3: If the website cannot be fetched, preserve the
  // rule-based assessment instead of rejecting the entire scan.
  if (!page.success) {
    warnings.push({
      errorType: page.errorType || "FETCH_FAILED",
      message:
        page.errorType === "DNS_ERROR"
          ? "Unable to reach this website because its domain could not be resolved. The risk assessment is based on URL checks only."
          : page.errorType === "TIMEOUT"
          ? "The website took too long to respond. The risk assessment is based on URL checks only."
          : "Website content could not be analysed. The risk assessment is based on URL checks only."
    });
  } else {
    // Step 4: Run AI analysis when page content is available.
    const ai = await analyzeContent(
      page.content,
      page.url
    );

    if (ai.success) {
      score -= Math.round(ai.riskScore * 0.5);

      reasons.push(
        ...ai.reasons.map(
          reason => "AI: " + reason
        )
      );
    } else {
      warnings.push({
        errorType: ai.errorType || "AI_ANALYSIS_FAILED",
        message:
          "AI content analysis is temporarily unavailable. The risk assessment uses URL checks only."
      });
    }
  }

  // Step 5: Produce the verdict even if fetching or AI analysis failed.
  score = Math.max(0, Math.min(100, score));

  const verdict = resultVerdict(score);

  return {
    success: true,
    score,
    verdict,
    reasons,
    warnings,
    analysisStatus:
      warnings.length > 0
        ? "partial"
        : "complete"
  };
}

module.exports = urlScoreCheck;