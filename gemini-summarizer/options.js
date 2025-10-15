document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveButton = document.getElementById('save-button');
  const statusDiv = document.getElementById('status');

  // Load the saved API key when the options page opens
  chrome.storage.sync.get('apiKey', (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Save the API key when the save button is clicked
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    chrome.storage.sync.set({ apiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
      } else {
        statusDiv.textContent = 'API key saved.';
      }
      setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    });
  });
});