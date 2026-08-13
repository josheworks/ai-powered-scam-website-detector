// main.js
// Responsibility: wire together api.js + ui.js for the Check URL page.

document.getElementById("checkForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const url = document.getElementById("urlInput").value.trim();
  if (!url) return;

  clearError();
  hideResult();
  showLoading(true);
  document.getElementById("checkBtn").disabled = true;

  try {
    const data = await checkUrl(url);
    renderResult(data);
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
  } finally {
    showLoading(false);
    document.getElementById("checkBtn").disabled = false;
  }
});
