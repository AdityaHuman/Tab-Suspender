(() => {
  'use strict';

  let hasUnsavedInput = false;

  const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

  // Track any input into form elements
  window.addEventListener('input', (e) => {
    if (hasUnsavedInput) return;
    if (e.target && e.target.tagName) {
      const tag = e.target.tagName.toUpperCase();
      if (FORM_TAGS.has(tag) || e.target.isContentEditable) {
        hasUnsavedInput = true;
      }
    }
  }, true);

  // Provide status when requested by background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reportTabState') {
      sendResponse({
        hasUnsavedInput,
        scrollPos: document.documentElement.scrollTop || document.body.scrollTop || 0
      });
    }
    
    if (request.action === 'restoreScroll') {
      if (request.scrollPos) {
        document.documentElement.scrollTop = request.scrollPos;
        document.body.scrollTop = request.scrollPos;
      }
      sendResponse({ success: true });
    }
    return true;
  });
})();
