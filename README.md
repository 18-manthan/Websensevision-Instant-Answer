# Active Tab AI POC

Chrome MV3 proof of concept that reads the active browser tab, sends the captured context to an LLM backend, and displays the answer in a Chrome Side Panel.

## Run the mock POC

Use Node.js `20.19+` or `22.12+`.

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm run api
```

Build the extension in another terminal:

```bash
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist/` folder.

Open any webpage, click the extension icon, and select **Analyze active tab** in the Side Panel. The panel detects all questions in the captured content and presents each answer as a numbered card. Questions with choices show the selected option label and answer text.

## Use a real LLM

Copy `.env.example` to `.env`, set `GROQ_API_KEY`, and restart the backend:

```bash
GROQ_API_KEY=your-key npm run api
```

The backend calls Groq's OpenAI-compatible chat-completions endpoint. For more reliable production-style responses, text captures use `GROQ_TEXT_MODEL` with Groq JSON Schema output when the selected model supports it. Screenshot-only captures use `GROQ_VISION_MODEL` with JSON Object mode because the vision fallback and structured-output support are model-dependent.

Run checks:

```bash
npm run typecheck
npm test
```

## Current POC behavior

- Scope: active tab in the current browser window.
- Host access: `<all_urls>` is enabled for this POC so the Side Panel can read normal web pages such as ChatGPT and Wikipedia.
- Browser-internal pages such as `chrome://extensions` remain blocked by Chrome.
- Default path: selected text or page DOM text.
- Fallback path: visible-tab screenshot followed by Tesseract.js OCR when no useful DOM text is available.
- OCR language: English (`eng`) in the current POC, loaded by the backend from local `eng.traineddata`.
- Answer format: structured question-and-answer cards with MCQ option labels.
- Response surface: Chrome Side Panel.
- Backend: `http://localhost:8787`.
- No continuous tab monitoring is included.
