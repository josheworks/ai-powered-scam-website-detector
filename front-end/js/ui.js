// ui.js
// Responsibility: update the DOM. No fetch/network code here at all.

function showLoading(show) {
  document.getElementById("loading").classList.toggle("hidden", !show);
}

function showError(message) {
  const box = document.getElementById("errorBox");
  box.textContent = message;
  box.classList.remove("hidden");
}

function clearError() {
  const box = document.getElementById("errorBox");
  box.textContent = "";
  box.classList.add("hidden");
}

// --- Check URL page ---

function renderResult(data) {
  const { score, verdict, reasons } = data;

  const card = document.getElementById("resultCard");
  const badge = document.getElementById("verdictBadge");
  const scoreText = document.getElementById("scoreText");
  const list = document.getElementById("reasonsList");

  badge.textContent = verdict;
  badge.className = "badge " + verdict.toLowerCase();
  scoreText.textContent = `Trust Score: ${score}/100`;

  list.innerHTML = "";
  reasons.forEach(reason => {
    const li = document.createElement("li");
    li.textContent = reason;
    list.appendChild(li);
  });

  card.classList.remove("hidden");
}

function hideResult() {
  document.getElementById("resultCard").classList.add("hidden");
}

// --- History page ---

function renderHistory(items) {
  const container = document.getElementById("historyList");
  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = `<p style="color:#9aa0b4;">No history yet. Check a URL first.</p>`;
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <span class="url">${item.url}</span>
      <span class="badge ${item.verdict.toLowerCase()}">${item.verdict}</span>
    `;
    container.appendChild(div);
  });
}
