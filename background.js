chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PLEXDL_DOWNLOAD') {
    chrome.downloads.download({url: msg.url, filename: msg.filename});
  }
});