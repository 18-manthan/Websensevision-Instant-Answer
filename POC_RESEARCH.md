# Browser Extension AI Capture POC Research

Date: 2026-09-16

## 1. Requirement

When the user explicitly invokes the extension, it should:

1. Read the useful content from the active tab in the current browser window.
2. Process the content into a question/context payload.
3. Send the payload to an LLM.
4. Show a useful answer in an extension-owned floating experience without copy/paste.

Example: a page contains "Who is the father of the computer?" and the panel answers that Charles Babbage is widely regarded as the father of the computer.

## 2. Important clarification

For this POC, capture is limited to the active browser tab. There are two ways to read that tab:

- **Page content capture:** text and structure available in the page DOM. This is the preferred path for normal HTML pages.
- **Rendered-tab capture:** pixels currently visible in the active tab. This is needed for scanned PDFs, images, canvas apps, video frames, and content not represented as accessible DOM text.

The extension should use page content first and fall back to an image path only when needed.

## 3. Approaches considered

### Approach A: DOM extraction with a content script

A content script reads `document.body.innerText`, the current selection, or a more targeted readable-content extraction. The service worker sends the normalized text to the LLM.

#### Approach A advantages

- Low latency and payload size.
- Preserves text better than OCR.
- Easy to include title, URL, selection, headings, and nearby context.
- Works well for the stated webpage question example.

#### Approach A limitations

- Does not capture pixels outside the DOM.
- Can miss text inside cross-origin iframes or embedded viewers.
- Page layout and very large documents require clipping and ranking.
- Some sites block extension injection, including browser-internal pages.

**Best use:** default extraction path for webpages.

### Approach B: `tabs.captureVisibleTab()` plus OCR

The service worker captures the visible area of the active tab. The image is sent to an OCR engine, either locally in the extension or through a backend, and the resulting text is sent to the LLM.

#### Approach B advantages

- Captures what the user actually sees.
- Handles images, canvas, scanned pages, and many PDF viewers.
- Does not require broad persistent host access when invoked with `activeTab`.

#### Approach B limitations

- OCR quality depends on resolution, font, contrast, and language.
- Only captures the visible tab viewport, not the entire scrollable document.
- Screenshot data is sensitive and can be much larger than text.
- OCR adds processing time and another failure point.
- Chrome documents a maximum of 2 `captureVisibleTab` calls per second.

**Best use:** fallback for visual content and as a validation path for the POC.

### Approach C: Screenshot directly to a multimodal LLM

The extension captures the tab and sends the image to an LLM that accepts image input. The model extracts the question and answers it in one step.

#### Approach C advantages

- Minimal client-side OCR implementation.
- Can interpret diagrams, tables, screenshots, and mixed visual content.
- Fastest route to demonstrate the complete user journey.

#### Approach C limitations

- Higher token/image cost and latency.
- More sensitive data leaves the device.
- Visual extraction can be less deterministic than text extraction.
- Requires a carefully defined provider API and image-size policy.

**Best use:** POC fallback or a deliberate multimodal product mode, with user consent.

### Approach D: Whole-screen or desktop capture

This approach uses `getDisplayMedia()` or the Chrome `desktopCapture` flow to capture a browser window, monitor, or another application. It is outside the current POC scope and can be evaluated later if the client expands the requirement beyond the active browser tab.

## 4. Recommended POC architecture

Target Chrome/Chromium first using Manifest V3:

```text
User clicks extension action or keyboard shortcut
                 |
                 v
        MV3 service worker
          /             \
         v               v
  DOM extraction     Visible-tab image
  via scripting       via captureVisibleTab
         \               /
          v             v
      Content normalizer
                 |
                 v
       HTTPS application backend
        (API key stays server-side)
                 |
                 v
          LLM provider adapter
                 |
                 v
            Answer + sources
                 |
                 v
        Chrome Side Panel UI
```

### Recommended first interaction

1. User opens a webpage containing the question in the active browser tab.
2. User clicks the extension action or presses a shortcut.
3. The extension opens the side panel as the response surface.
4. The extension extracts selected text if there is a selection; otherwise it extracts the visible/readable page text.
5. If text is empty or below a quality threshold, it captures the visible tab image.
6. The backend processes the request and calls the selected LLM.
7. The side panel streams or displays the answer, with an indication of the source mode: page text or screenshot.

## 5. Why a side panel is preferable to a popup

A popup closes when it loses focus, which is awkward for a response that may take several seconds. A content-script overlay is more visually integrated but must deal with page CSS, z-index conflicts, SPA navigation, and host-page interference.

Chrome's Side Panel API is an extension-owned panel alongside the page, persists more naturally during browsing, and can be opened from an action click or another user gesture. It is the recommended POC surface for Chrome 114+.

A content overlay can be added later if the client specifically requires a small floating card over the webpage. A separate extension popup window is possible but is more disruptive and less native to the browser workflow.

## 6. Minimal MV3 permission model

For the initial POC, use the smallest practical permissions:

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "scripting", "sidePanel"],
  "background": {
    "service_worker": "service-worker.js"
  },
  "action": {
    "default_title": "Ask about this page"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

`activeTab` gives temporary access after an explicit user invocation and avoids requesting access to every website at install time. Add `tabs.captureVisibleTab()` through the same user-invoked flow. Avoid `<all_urls>` until there is a demonstrated need for always-on or automatic page monitoring.

## 7. LLM/API design

Use an HTTPS backend owned by the project for the POC:

- Keep provider-specific code behind an adapter so the client can change LLM vendors.
- Set explicit model, token, timeout, and retry limits.
- Return structured JSON such as `answer`, `confidence`, `sourceMode`, and optional `citations`.
- Stream the answer to the side panel only if the UX needs progressive output.

Suggested request shape:

```json
{
  "question": "Who is the father of the computer?",
  "context": "Relevant visible page text...",
  "image": null,
  "page": {
    "title": "Example page",
    "url": "https://example.com/page"
  },
  "sourceMode": "dom"
}
```

## 8. Deferred topics

Privacy, security, authentication, data retention, redaction, prompt injection, enterprise policy, and compliance are intentionally deferred from this technical POC. They must be assessed before production use.

## 9. POC scope

### In scope

- Chrome/Chromium desktop.
- Explicit action click and optional keyboard shortcut.
- Current-tab DOM extraction.
- Visible-tab screenshot fallback.
- One backend endpoint and one LLM provider adapter.
- Side panel with loading, answer, error, retry, and clear states.
- A small test set: plain webpage, selected question, long article, image text, canvas content, PDF viewer, and unsupported browser page.

### Out of scope for the first POC

- Whole browser-window or desktop capture.
- Automatic background monitoring.
- Multi-browser parity.
- Persistent conversation history.
- Enterprise SSO, admin policy, billing, and full DLP.
- Guaranteed extraction from every cross-origin iframe or protected viewer.

## 10. Acceptance criteria

- One click answers the example question without copy/paste.
- The side panel remains available while the user reads the page.
- DOM extraction completes within an agreed target, for example 2 seconds before the LLM request.
- Screenshot fallback works for at least one image or scanned-content case.
- The active tab is captured without requiring copy/paste.
- Unsupported pages fail with a useful message rather than a silent error.
- The test set records extraction success, answer latency, and answer quality separately.

## 11. Decisions needed from the client

1. Is Chrome/Chromium desktop sufficient for the first POC?
2. Which LLM/provider is approved for the POC?
3. Are screenshots required, or is webpage text extraction sufficient for the first release?
4. Should the answer cite the page text, URL, or visual region used?
5. Is the desired UI a Chrome side panel, an overlay card on the webpage, or a separate floating window?

## 12. Recommendation

Build the first POC as a Chrome MV3 extension for the active tab in the current browser window, with DOM-first extraction, screenshot-to-multimodal fallback, an LLM backend, and a Chrome Side Panel response surface. This gives the client the requested no-copy/paste workflow with a focused implementation scope.

Do not include whole-browser-window or desktop capture in this POC. It solves a broader problem than the example requires and can be evaluated as a later phase.

## Sources

- [Chrome `tabs.captureVisibleTab`](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab)
- [Chrome `scripting`](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome `activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome `tabCapture`](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
- [Chrome message passing and security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [MDN `tabs.captureVisibleTab`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab)
- [MDN Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API)
