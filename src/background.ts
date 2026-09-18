type CaptureResult = {
  selectedText: string;
  pageText: string;
  title: string;
  url: string;
  screenshot?: string;
  sourceMode: 'dom' | 'screenshot';
};

let lastScreenshotAt = 0;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (typeof tab?.id !== 'number') throw new Error('No active browser tab was found.');
  return tab;
}

async function captureActiveTab(): Promise<CaptureResult> {
  const tab = await getActiveTab();
  const tabId = tab.id;
  if (tabId === undefined) throw new Error('The active tab has no ID.');
  let snapshot: Omit<CaptureResult, 'screenshot' | 'sourceMode'> | undefined;

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'read-page' });
    snapshot = {
      selectedText: response?.selectedText ?? '',
      pageText: response?.pageText ?? '',
      title: response?.title ?? tab.title ?? '',
      url: response?.url ?? tab.url ?? ''
    };
  } catch {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          selectedText: window.getSelection()?.toString().trim() ?? '',
          pageText: document.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '',
          title: document.title,
          url: window.location.href
        })
      });
      snapshot = {
        selectedText: result.result?.selectedText ?? '',
        pageText: result.result?.pageText ?? '',
        title: result.result?.title ?? tab.title ?? '',
        url: result.result?.url ?? tab.url ?? ''
      };
    } catch {
      snapshot = undefined;
    }
  }

  if (snapshot && (snapshot.selectedText || snapshot.pageText)) {
    return {
      ...snapshot,
      selectedText: snapshot.selectedText.slice(0, 4000),
      pageText: snapshot.pageText.slice(0, 12000),
      sourceMode: 'dom'
    };
  }

  const elapsed = Date.now() - lastScreenshotAt;
  if (elapsed < 600) {
    await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
  }

  lastScreenshotAt = Date.now();
  let screenshot = '';
  try {
    screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 });
  } catch {
    throw new Error('This page could not be captured. Try a normal website tab instead of a browser-internal or restricted page.');
  }

  return {
    selectedText: '',
    pageText: '',
    title: tab.title ?? '',
    url: tab.url ?? '',
    screenshot,
    sourceMode: 'screenshot'
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.windowId === 'number') {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'analyze-active-tab') return;
  const tab = await getActiveTab();
  if (typeof tab.windowId === 'number') await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'capture-active-tab') return;
  captureActiveTab()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'Capture failed.';
      sendResponse({ ok: false, error: detail });
    });
  return true;
});
