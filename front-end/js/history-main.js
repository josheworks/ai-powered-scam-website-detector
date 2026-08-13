// history-main.js
// Responsibility: wire together api.js + ui.js for the History page.

(async function loadHistory() {
  showLoading(true);
  clearError();

  try {
    const items = await getHistory();
    renderHistory(items);
  } catch (err) {
    showError("Could not load history yet. (Backend /history endpoint not built yet.)");
  } finally {
    showLoading(false);
  }
})();
