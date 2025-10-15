document.addEventListener('DOMContentLoaded', () => {
  const summarizeButton = document.getElementById('summarize-button');
  const statusDisplay = document.getElementById('status-display');
  const originalButtonText = summarizeButton.textContent;
  
  function setLoadingState(isLoading, action) {
    summarizeButton.disabled = isLoading;
    if (isLoading) {
      summarizeButton.innerHTML = `<span class="loader"></span> <span>${action}...</span>`;
      if (statusDisplay) statusDisplay.textContent = "Just a moment, don't close the pop-up...";
    } else {
      summarizeButton.textContent = originalButtonText;
      if (statusDisplay) statusDisplay.textContent = '';
    }
  }
 
  // Handle the summarize button click
  summarizeButton.addEventListener('click', () => {
    setLoadingState(true, 'Working');
    chrome.runtime.sendMessage({ action: 'summarize' }, (response) => {
        if (chrome.runtime.lastError) {
            setLoadingState(false);
            if (statusDisplay) statusDisplay.textContent = 'Error: ' + chrome.runtime.lastError.message;
            return;
        }
        if (response && response.status === 'success') {
            window.close(); // Close the popup on success
        } else {
            setLoadingState(false);
            if (statusDisplay) statusDisplay.textContent = (response && response.error) || 'An unknown error occurred.';
        }
    });    
  });
});