# Active Tab AI Extension POC

## Client Overview

This POC is a Chrome browser extension that reads content from the active browser tab, identifies questions, sends the captured context to an AI model, and displays clear answers in a Chrome Side Panel.

The user does not need to copy and paste the question.

## 1. Technology and Approach

- **Browser:** Chrome/Chromium desktop
- **Extension standard:** Manifest V3
- **Extension language:** TypeScript
- **Extension UI:** React with Vite
- **Response surface:** Chrome Side Panel
- **Backend:** Node.js with Fastify
- **AI provider:** Groq API
- **Default model:** `meta-llama/llama-4-scout-17b-16e-instruct`
- **Communication:** HTTPS/API request from the backend to Groq

The extension uses a **DOM-first approach** because webpage text is faster and more reliable to process than an image whenever the page exposes usable text.

## 2. How Page Content Is Extracted

When the user clicks **Analyze active tab**:

1. The extension identifies the active tab in the current browser window.
2. It reads the current text selection, if available.
3. It reads the rendered page text from the page DOM.
4. It includes the page title and URL as supporting metadata.
5. The captured content is sent to the backend for analysis.

The extension supports both:

- A selected question or selected block of content.
- The broader text available in the active page.

For the current POC, the text is normalized and limited before being sent for processing. This prevents unnecessarily large page payloads.

## 3. Pages Where Text Cannot Be Selected

Yes, the POC can handle several cases where normal text selection is not available.

### Normal webpage or dynamically rendered page

If the page has text in its rendered DOM, the extension reads it even when the user does not manually select it. This works for many React, Vue, Angular, SPA, and dynamically updated pages after their content has rendered.

### Canvas, image, scanned document, or unsupported viewer

If the DOM does not provide useful text, the extension falls back to a screenshot of the visible area of the active tab.

The screenshot is sent to Groq along with an instruction to identify questions, answer choices, and answers. This is the current **vision-based fallback**.

### OCR position

A separate OCR engine such as Tesseract is not currently used. The current POC sends the screenshot directly to a vision-capable Groq model, which performs visual reading and reasoning in one step.

A dedicated OCR layer can be added later if the project needs deterministic text extraction, searchable text, bounding boxes, or stronger language-specific OCR control.

## 4. How the AI Answer Is Generated

The backend sends Groq a structured instruction containing:

- The captured page text, when available
- The selected text, when available
- The screenshot, when DOM text is unavailable
- Instructions to detect every complete question
- Instructions to identify MCQ options and preserve their labels
- Instructions to return a structured JSON response

The expected response contains:

```json
{
  "mode": "mcq",
  "answers": [
    {
      "question": "Which option is correct?",
      "answer": "Paris",
      "optionLabel": "Option B",
      "optionText": "Paris",
      "explanation": "Paris is the capital of France."
    }
  ]
}
```

The backend converts the model response into a predictable format before returning it to the extension. If the model returns unexpected formatting, the backend uses a fallback answer object so the UI can still display the result.

## 5. MCQ and Multiple-Question Handling

The model is instructed to detect all distinct questions in the captured content, not only the first question.

For each question, the response can include:

- Question text
- Correct answer
- Option label, such as `Option B`
- Option text
- Short explanation, when available

The Side Panel displays each result as a separate numbered card:

```text
01  Which language is used for styling webpages?
    Option B
    CSS

02  Which protocol is used for secure web browsing?
    Option C
    HTTPS
```

This format makes a page containing several questions easier to scan and compare.

## 6. End-to-End Flow

```text
User clicks Analyze active tab
              |
              v
Extension identifies active browser tab
              |
              v
Read selected text and rendered DOM text
              |
              +--> Useful text found
              |        |
              |        v
              |     Send text context
              |
              +--> No useful DOM text
                       |
                       v
                 Capture visible tab screenshot
                       |
                       v
              Send text and/or image to backend
                       |
                       v
              Backend sends structured request to Groq
                       |
                       v
              Groq identifies questions and answers
                       |
                       v
              Backend validates/parses response
                       |
                       v
              Side Panel displays numbered answer cards
```

## 7. Current Limitations and Edge Cases

### Content limitations

- The default DOM path reads page text; it does not understand every page layout perfectly.
- Text inside cross-origin iframes may not be included.
- Content that appears only after scrolling may not be captured in the screenshot fallback.
- Screenshot fallback captures the visible viewport, not the full webpage or full document.
- Very large pages are clipped to a configured text limit.
- Video, animation, low-resolution images, handwriting, and complex diagrams may reduce answer quality.
- A canvas may be captured visually, but interpretation depends on image quality and model capability.
- A page can contain several unrelated questions; the model may need to decide which content is relevant.
- The model may miss a question or incorrectly classify an instruction, option, or answer.
- MCQ accuracy depends on the question quality, visible options, image clarity, and model reasoning.

### Browser limitations

- Chrome blocks extension access to internal pages such as `chrome://extensions`, `chrome://settings`, and other protected browser UI pages.
- The Chrome Web Store and some protected extension pages cannot be read.
- PDF viewers, file URLs, authentication-protected pages, and embedded applications can behave differently depending on browser permissions and page implementation.
- The current POC targets Chrome/Chromium desktop first and is not yet a cross-browser implementation.
- The Side Panel requires a compatible Chrome version that supports the Side Panel API.

### AI and performance limitations

- Network latency depends on the page size, screenshot size, Groq response time, and local connection.
- Vision requests are generally larger and may cost more or take longer than text-only requests.
- The screenshot capture API should not be called continuously; this POC captures only when the user clicks the action.
- Groq rate limits, model availability, context limits, and temporary API failures can affect responses.
- The current UI waits for the completed response; streaming output is not yet implemented.
- The current POC does not maintain conversation history between analyses.

## 8. Security and Deployment Considerations

The current implementation is suitable for a technical POC, not production deployment yet.

- The Groq API key is kept in the backend environment rather than in the extension bundle.
- The extension currently requests broad page access so it can analyze normal webpages.
- Captured page text and screenshots are sent to the backend and may be sent to Groq.
- The current backend does not yet include production authentication, user accounts, quotas, audit controls, or enterprise access policies.
- Input validation, sensitive-data redaction, retention rules, provider data policies, and prompt-injection hardening should be completed before production use.
- Model output should continue to be rendered as text or safely parsed structured data rather than executable HTML.

## 9. Summary

The POC uses a practical two-stage capture strategy:

1. **DOM extraction first** for fast, accurate webpage text.
2. **Visible-tab screenshot plus Groq vision processing** when the content is not available as normal selectable text.

Groq is instructed to identify all questions and MCQ options and return structured results. The Chrome Side Panel then presents those results as clean, numbered answer cards.

This approach is well suited for validating the client workflow. Before production, the project should add stronger security controls, broader test coverage, improved document handling, and additional fallback strategies for difficult pages.
