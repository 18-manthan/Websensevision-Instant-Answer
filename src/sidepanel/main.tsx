import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type CaptureResult = {
  selectedText: string;
  pageText: string;
  title: string;
  url: string;
  screenshot?: string;
  sourceMode: 'dom' | 'ocr' | 'screenshot';
};

type AnswerItem = {
  question: string;
  answer: string;
  optionLabel?: string;
  optionText?: string;
  explanation?: string;
};

type AskResponse = { answers: AnswerItem[]; mode: 'qa' | 'mcq'; sourceMode: string; provider: string };

function App() {
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [answerMode, setAnswerMode] = useState<'qa' | 'mcq'>('qa');
  const [status, setStatus] = useState<'idle' | 'capturing' | 'ocr' | 'thinking' | 'error'>('idle');
  const [error, setError] = useState('');

  async function analyzeTab() {
    setStatus('capturing');
    setError('');
    setAnswers([]);

    try {
      const captured = await chrome.runtime.sendMessage({ type: 'capture-active-tab' }) as { ok: boolean; result?: CaptureResult; error?: string };
      if (!captured.ok || !captured.result) throw new Error(captured.error ?? 'Could not capture the active tab.');
      let context = captured.result.pageText || captured.result.selectedText;
      let sourceMode = captured.result.sourceMode;
      let ocrConfidence: number | undefined;

      if (captured.result.screenshot && !context) {
        setStatus('thinking');
        setError('');
        sourceMode = 'screenshot';
      }

      setCapture({ ...captured.result, pageText: context, sourceMode });
      setStatus('thinking');

      const response = await fetch('http://localhost:8787/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          context,
          selectedText: captured.result.selectedText,
          image: sourceMode === 'screenshot' ? captured.result.screenshot : undefined,
          page: { title: captured.result.title, url: captured.result.url },
          sourceMode,
          ocrConfidence
        })
      });
      const data = await response.json() as AskResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'The API request failed.');
      setAnswers(data.answers ?? []);
      setAnswerMode(data.mode ?? 'qa');
      setStatus('idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught) || 'Something went wrong.');
      setStatus('error');
    }
  }

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">ACTIVE TAB AI</p>
          <h1>Ask the page.</h1>
        </div>
        <span className="status-dot" aria-label="POC ready" />
      </header>

      <section className="hero">
        <p>Capture the question from the tab you are reading and get a direct answer here.</p>
        <button className="primary" onClick={analyzeTab} disabled={status === 'capturing' || status === 'ocr' || status === 'thinking'}>
          <span>{status === 'capturing' ? 'Reading tab...' : status === 'ocr' ? 'Reading image...' : status === 'thinking' ? 'Generating answer...' : 'Analyze active tab'}</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      {capture && (
        <section className="source">
          <div className="section-label"><span>CAPTURED SOURCE</span><span>{capture.sourceMode}</span></div>
          <h2>{capture.title || 'Active browser tab'}</h2>
          <p>{capture.selectedText || capture.pageText || 'Visual tab capture sent for analysis.'}</p>
        </section>
      )}

      <section className={`answer ${answers.length ? 'has-answer' : ''}`}>
        <div className="section-label"><span>{answerMode === 'mcq' ? 'MCQ ANSWERS' : 'ANSWERS'}</span><span>{answers.length ? `${answers.length} found` : 'waiting'}</span></div>
        {answers.length ? (
          <div className="answer-list">
            {answers.map((item, index) => (
              <article className="answer-card" key={`${item.question}-${index}`}>
                <div className="question-number">{String(index + 1).padStart(2, '0')}</div>
                <div className="answer-card-body">
                  <h3>{item.question}</h3>
                  <div className="answer-result">
                    {item.optionLabel && <span className="option-label">{item.optionLabel}</span>}
                    <span>{item.optionText || item.answer}</span>
                  </div>
                  {item.explanation && <p className="explanation">{item.explanation}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="muted">Your answers will appear here after the active tab is analyzed.</p>}
      </section>

      {error && <div className="error" role="alert">{error}</div>}
      <footer className="panel-footer">
        <span className="footer-tag">POC mode · Backend: localhost:8787</span>
        <span className="signature">Crafted with love by Manthan Chouhan💚, AI Engineer</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
