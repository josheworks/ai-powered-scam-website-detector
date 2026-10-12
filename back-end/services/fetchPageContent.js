// services/fetchPageContent.js
// JOB: safely download a web page and return CLEAN TEXT.
// CONTRACT: this function NEVER throws. It always returns one of two shapes:
//   success -> { success: true,  content, url, contentType }
//   failure -> { success: false, error, errorType, url }

// ---------- 1. Constants (defined once, reused everywhere) ----------

// Fixed vocabulary of failure types, so callers never compare against typo-prone strings.
const ERROR_TYPES = {
  INVALID_URL: "INVALID_URL",               // malformed / wrong protocol
  BLOCKED_URL: "BLOCKED_URL",               // well-formed but unsafe to visit (SSRF protection)
  TIMEOUT: "TIMEOUT",                       // server too slow
  DNS_ERROR: "DNS_ERROR",                   // domain does not exist
  NETWORK_ERROR: "NETWORK_ERROR",           // connection refused / other network failure
  HTTP_ERROR: "HTTP_ERROR",                 // server answered with 4xx / 5xx
  INVALID_CONTENT_TYPE: "INVALID_CONTENT_TYPE", // not an HTML page
  BODY_READ_ERROR: "BODY_READ_ERROR",       // connection broke while reading
  EMPTY_CONTENT: "EMPTY_CONTENT",           // page had no readable text
};

const TIMEOUT_MS = 8000;        // give up on slow sites after 8 seconds
const MAX_BYTES = 500 * 1024;   // never read more than ~500 KB (protects server memory)
const MAX_TEXT_CHARS = 6000;    // cap text sent to Gemini (controls cost and speed)

// ---------- 2. Small helpers ----------

// Builds the failure object in one place so every failure has the same shape.
function fail(url, errorType, error) {
  return { success: false, error, errorType, url };
}

// Returns true for addresses our server must never visit (SSRF protection).
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();

  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  if (h.startsWith("[")) return true; // IPv6 literal such as [::1]; blocked for simplicity

  // IPv4 literal: check the private ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;      // this-host, private, loopback
    if (a === 169 && b === 254) return true;                // link-local (cloud metadata lives here)
    if (a === 172 && b >= 16 && b <= 31) return true;       // private range
    if (a === 192 && b === 168) return true;                // private range
  }
  return false;
}

// STEP 1: validate the URL. Returns { ok: true, url } or { ok: false, errorType, error }.
function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl); // throws if the string is not a valid URL
  } catch {
    return { ok: false, errorType: ERROR_TYPES.INVALID_URL, error: "Malformed URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, errorType: ERROR_TYPES.INVALID_URL, error: "Only http and https are allowed" };
  }
  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, errorType: ERROR_TYPES.BLOCKED_URL, error: "Address is not allowed" };
  }
  return { ok: true, url: parsed };
}

// Throws away an unread response body so the connection is released.
async function discard(response) {
  try {
    await response.body?.cancel();
  } catch {
    // nothing useful to do if cancel fails
  }
}

// STEP 5: read the body, but stop once we hit MAX_BYTES.
async function readBodyWithLimit(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total >= MAX_BYTES) {
      await reader.cancel(); // enough data; stop downloading
      break;
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

// STEP 6: turn raw HTML into plain readable text.
function extractText(html) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ") // remove code blocks
    .replace(/<!--[\s\S]*?-->/g, " ")                          // remove comments
    .replace(/<[^>]+>/g, " ")                                  // remove remaining tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")                                      // collapse whitespace
    .trim();
}

// ---------- 3. The main function ----------

async function fetchPageContent(rawUrl) {
  // STEP 1: validate
  const check = validateUrl(rawUrl);
  if (!check.ok) return fail(rawUrl, check.errorType, check.error);
  const url = check.url.href;

  // STEP 2: fetch. Network-level failures THROW, so we use try/catch.
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "ScamShieldBot/1.0 (student project)",
        Accept: "text/html",
      },
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return fail(url, ERROR_TYPES.TIMEOUT, "Request timed out");
    }
    const code = err.cause && err.cause.code;
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return fail(url, ERROR_TYPES.DNS_ERROR, "Domain could not be resolved");
    }
    return fail(url, ERROR_TYPES.NETWORK_ERROR, "Could not connect to the server");
  }

  // fetch follows redirects automatically, so re-check where we ended up.
  const finalCheck = validateUrl(response.url);
  if (!finalCheck.ok) {
    await discard(response);
    return fail(url, ERROR_TYPES.BLOCKED_URL, "Redirected to a blocked address");
  }

  // STEP 3: a 404 does NOT throw, so we must check the status ourselves.
  if (!response.ok) {
    await discard(response);
    return fail(url, ERROR_TYPES.HTTP_ERROR, `Server responded with status ${response.status}`);
  }

  // STEP 4: check the content type BEFORE downloading the body.
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    await discard(response);
    return fail(url, ERROR_TYPES.INVALID_CONTENT_TYPE, `Unsupported content type: ${contentType || "unknown"}`);
  }

  // STEP 5: read the body (with a size limit)
  let html;
  try {
    html = await readBodyWithLimit(response);
  } catch {
    return fail(url, ERROR_TYPES.BODY_READ_ERROR, "Failed while reading the response body");
  }

  // STEP 6: extract clean text
  const text = extractText(html).slice(0, MAX_TEXT_CHARS);
  if (!text) {
    return fail(url, ERROR_TYPES.EMPTY_CONTENT, "Page contains no readable text");
  }

  // STEP 7: return the success shape
  return { success: true, content: text, url, contentType };
}

module.exports = { fetchPageContent, ERROR_TYPES };
