/**
 * Gets the API key from chrome.storage.
 * @returns {Promise<string>} The API key.
 */
async function getApiKey() {
  const result = await chrome.storage.sync.get('apiKey');
  return result.apiKey;
}

/**
 * Injected function to get the text content of the page.
 * @returns {string} The text content of the page.
 */
function getPageContent() {
  return document.body.innerText;
}

/**
 * Sends the text to the Gemini API for summarization.
 * @param {string} text The text to summarize.
 * @returns {Promise<{summary?: string, error?: string}>} The summary or an error.
 */
async function generateContentWithGemini(text, prompt) {
  try {
      const apiKey = "AIzaSyBkIN7VO5KUSA232QaKRJf4gy_1rcykFyk";
   // const apiKey = await getApiKey();
    if (!apiKey) {
      return { error: 'API key not found. Please set it in the options page.' };
    }
    
    // The API URL for the Gemini-Pro model
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt}:\n\n---\n\n${text}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    return { summary: content.trim() };

  } catch (error) {
    console.error('Gemini API Error:', error.message);
    // Check for specific API key-related errors
    if (error.message.includes('API key not valid')) {
      return { error: 'Your API key is not valid. Please check it on the options page.' };
    }
    // Generic error for other issues
    return { error: `An API error occurred: ${error.message}` };
  }
}

/**
 * Injected function to replace the page's body content with a formatted summary.
 * @param {string} newContent The new content to display.
 */
function replacePageContent(newContent, imageUrl, isRtl = false) {
  // Store original content if it hasn't been stored yet
  if (!window.originalPageContent) {
    window.originalPageContent = {
      head: document.head.innerHTML,
      body: document.body.innerHTML,
      originalText: newContent,
    };
  }

  // Clear the existing head and body to remove original page styles and content
  document.head.innerHTML = '';
  document.body.innerHTML = '';

  // Set a clean base style for the page
  const style = document.createElement('style');
  style.textContent = `
    :root { --reader-text: #333; --reader-card-bg: rgba(255, 255, 255, 0.9); --reader-header-bg: #fff; --reader-border: #eee; --reader-shadow: rgba(0,0,0,0.15); }
    html { 
      background: url(${imageUrl}) no-repeat center center fixed; 
      background-size: cover;
    }
    body { margin: 0; padding: 60px 0 0 0; font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif; line-height: 1.7; color: var(--reader-text); transition: background-color 0.3s, color 0.3s; background-color: transparent; }
    .reader-sticky-menu { position: fixed; top: 0; left: 0; right: 0; background-color: var(--reader-header-bg); box-shadow: 0 2px 5px var(--reader-shadow); padding: 10px 20px; z-index: 9999; display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-bottom: 1px solid var(--reader-border); }
    .reader-sticky-menu button { background-color: #4CAF50; color: white; border: none; padding: 8px 12px; text-align: center; text-decoration: none; display: inline-block; font-size: 14px; border-radius: 4px; cursor: pointer; transition: background-color 0.3s; }
    .reader-sticky-menu button:hover { background-color: #45a049; }
    .reader-sticky-menu button#restore-button { background-color: #f44336; }
    .reader-sticky-menu button#restore-button:hover { background-color: #da190b; }
    .reader-container { max-width: 800px; margin: 40px auto; padding: 30px 40px; background-color: var(--reader-card-bg); box-shadow: 0 4px 12px var(--reader-shadow); border-radius: 8px; direction: ${isRtl ? 'rtl' : 'ltr'}; text-align: ${isRtl ? 'right' : 'left'}; }
    .reader-title { border-bottom: 2px solid var(--reader-border); padding-bottom: 15px; margin-bottom: 25px; font-size: 2.2em; font-weight: 600; color: #1a1a1a; }
    .reader-content { white-space: pre-wrap; word-wrap: break-word; font-size: 1.1em; }
  `;
  document.head.appendChild(style);

  // --- Create Sticky Menu ---
  const menu = document.createElement('div');
  menu.className = 'reader-sticky-menu';

  const translateArabicButton = document.createElement('button');
  translateArabicButton.id = 'translate-arabic-button';
  translateArabicButton.textContent = 'Translate to Arabic';
  translateArabicButton.onclick = () => {
    const contentBlock = document.getElementById('reader-content-block');
    contentBlock.textContent = 'Translating to Arabic, please wait...';
    contentBlock.style.direction = 'rtl';
    contentBlock.style.textAlign = 'right';
    chrome.runtime.sendMessage({ action: 'translateToArabic', text: window.originalPageContent.originalText }, (response) => {
      contentBlock.textContent = response.summary || response.error || 'An unknown error occurred.';
    });
  };

  const readButton = document.createElement('button');
  readButton.id = 'read-aloud-button';
  readButton.textContent = 'Read Aloud';
  readButton.onclick = () => {
    const text = document.getElementById('reader-content-block').textContent;
    if (text && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveButton = document.createElement('button');
  saveButton.id = 'save-text-button';
  saveButton.textContent = 'Save Text';
  saveButton.onclick = () => {
    const text = document.getElementById('reader-content-block').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreButton = document.createElement('button');
  restoreButton.id = 'restore-button';
  restoreButton.textContent = 'Restore Page';
  restoreButton.onclick = () => {
    if (window.originalPageContent) {
      document.head.innerHTML = window.originalPageContent.head;
      document.body.innerHTML = window.originalPageContent.body;
      window.originalPageContent = null; // Clear stored content
    }
  };

  menu.appendChild(translateArabicButton);
  menu.appendChild(readButton);
  menu.appendChild(saveButton);
  menu.appendChild(restoreButton);
  document.body.appendChild(menu);

  // Create a container for the summary
  const container = document.createElement('div');
  container.className = 'reader-container';

  // Create a title for the summary
  const title = document.createElement('h1');
  title.className = 'reader-title';
  title.textContent = 'The Core Concepts';

  // Create a block for the content
  const contentBlock = document.createElement('div');
  contentBlock.id = 'reader-content-block';
  contentBlock.className = 'reader-content';
  contentBlock.textContent = newContent;

  // Append elements to the body
  container.appendChild(title);
  container.appendChild(contentBlock);
  document.body.appendChild(container);
}

// Main listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize' || request.action === 'translate' || request.action === 'translateToArabic') {
    (async () => {
      // 1. Get the active tab
      let activeTab;
      try {
        [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
          throw new Error("Could not find active tab.");
        }
      } catch (e) {
        console.error("Error querying for active tab:", e);
        sendResponse({status: 'error', error: e.message});
        return;
      }

      let pageText = request.text; // Use text from request if available (for translation)
      if (!pageText) {
        try {
          // 2. Execute script to get page content if not provided
        const [injectionResult] = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          function: getPageContent,
        });
          if (injectionResult) {
            pageText = injectionResult.result;
          }
        } catch (e) {
          console.error('Failed to inject script or get page content:', e);
          sendResponse({status: 'error', error: `Cannot access this page. Reason: ${e.message}`});
          return;
        }
      }
      
      // 3. Generate content based on the action
      let prompt;
      if (request.action === 'summarize') {
        const prompt = 'Simplify the following text for a general audience. Explain any complex terms and focus on the main points';
      } else { // translate or translateToArabic
        prompt = `Translate the following text to ${request.action === 'translate' ? 'English' : 'Arabic'}`;
      }
 
      const response = await generateContentWithGemini(pageText, prompt);
 
      if (request.action === 'translateToArabic') {
        sendResponse(response);
      } else if (response && response.summary) {
        const imageUrl = chrome.runtime.getURL('bg5.jpg');
        const isRtl = request.action === 'translateToArabic';
        await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            function: replacePageContent,
            args: [response.summary, imageUrl, isRtl]
        });
        sendResponse({status: 'success'}); // Let the popup know it can close
      } else {
        sendResponse({status: 'error', error: response.error || 'Failed to get summary.'});
      }
    })();
    return true; // Keep the message channel open for the async response
  }
  
  if (request.action === 'replaceText') {
    (async () => {
        const imageUrl = chrome.runtime.getURL('bg5.jpg');
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                function: replacePageContent,
                args: [request.text, imageUrl]
            });
        }
    })();
    return true; // Optional, for async operations
  }
});