type PageSnapshot = {
  selectedText: string;
  pageText: string;
  title: string;
  url: string;
};

function getPageSnapshot(): PageSnapshot {
  const selection = window.getSelection()?.toString().trim() ?? '';
  const pageText = document.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '';

  return {
    selectedText: selection.slice(0, 4000),
    pageText: pageText.slice(0, 12000),
    title: document.title,
    url: window.location.href
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'read-page') return;
  sendResponse(getPageSnapshot());
});
