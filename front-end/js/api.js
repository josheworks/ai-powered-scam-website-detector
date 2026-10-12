// api.js
// Responsibility: talk to the backend. No DOM code here at all.

const API_BASE = "http://localhost:3000"; // change if your server runs elsewhere

async function checkUrl(url) {
  const response = await fetch(`${API_BASE}/check-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
  const errData = await response.json().catch(() => ({}));

  const error = new Error(
    errData.error ||
    errData.message ||
    `Request failed with status ${response.status}`
  );

  error.errorType = errData.errorType;
  error.status = response.status;

  throw error;
}

  return response.json(); // { score, verdict, reasons }
}

async function getHistory() {
  const response = await fetch(`${API_BASE}/history`, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Could not load history (status ${response.status})`);
  }

  return response.json(); // expected: array of { url, verdict, score, checkedAt }
}
