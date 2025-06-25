chrome.action.onClicked.addListener(() => {
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    chrome.storage.local.set({ screenshot: dataUrl }, () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("html/editor.html")
      });
    });
  });
});