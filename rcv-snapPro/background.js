// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  captureScreenshotAndOpenEditor();
});

// Handle keyboard shortcut (Alt+S)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    captureScreenshotAndOpenEditor();
  }
});

// Shared screenshot function
function captureScreenshotAndOpenEditor() {
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    chrome.storage.local.set({ screenshot: dataUrl }, () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("html/editor.html")
      });
    });
  });
}