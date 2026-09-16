# Active Tab AI POC

Chrome MV3 proof of concept that reads the active browser tab, sends the captured context to an LLM backend, and displays the answer in a Chrome Side Panel.

## Run the mock POC

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

The backend calls Groq's OpenAI-compatible chat-completions endpoint. It uses `meta-llama/llama-4-scout-17b-16e-instruct` by default because the model supports both page text and screenshot input. Change `GROQ_MODEL` as needed.

## Current POC behavior

- Scope: active tab in the current browser window.
- Host access: `<all_urls>` is enabled for this POC so the Side Panel can read normal web pages such as ChatGPT and Wikipedia.
- Browser-internal pages such as `chrome://extensions` remain blocked by Chrome.
- Default path: selected text or page DOM text.
- Fallback path: visible-tab screenshot when no useful DOM text is available.
- Answer format: structured question-and-answer cards with MCQ option labels.
- Response surface: Chrome Side Panel.
- Backend: `http://localhost:8787`.
- No continuous tab monitoring is included.
