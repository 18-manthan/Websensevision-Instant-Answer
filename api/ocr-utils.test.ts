import assert from 'node:assert/strict';
import test from 'node:test';
import { extractJsonPayload, normalizeOcrText } from './ocr-utils';

test('normalizeOcrText preserves question and option boundaries for MCQ text', () => {
  const input = 'Q1. Which planet is known as the Red Planet? A. Mars B. Venus C. Jupiter D. Neptune Q2. What is 2 + 2? A. 3 B. 4 C. 5 D. 6';

  const result = normalizeOcrText(input);

  assert.match(result, /Q1\. Which planet is known as the Red Planet\?/);
  assert.match(result, /A\. Mars\nB\. Venus\nC\. Jupiter\nD\. Neptune/);
  assert.match(result, /Q2\. What is 2 \+ 2\?/);
  assert.match(result, /A\. 3\nB\. 4\nC\. 5\nD\. 6/);
});

test('extractJsonPayload pulls structured JSON out of surrounding narrative text', () => {
  const input = 'Here is the answer: {"mode":"mcq","answers":[{"question":"What is AI?","answer":"To simulate human intelligence","optionLabel":"Option B","optionText":"To simulate human intelligence for specific tasks","explanation":"This is the correct choice."}]} Thanks!';

  const result = extractJsonPayload(input);

  assert.ok(result);
  assert.match(result ?? '', /"mode":"mcq"/);
  assert.match(result ?? '', /"question":"What is AI\?"/);
});

test('extractJsonPayload handles Generated answer banners before JSON output', () => {
  const input = 'look\n\n### Generated answer\n{ "mode": "mcq", "answers": [{ "question": "What is AI?", "answer": "To simulate human intelligence for specific tasks", "optionLabel": "Option B", "optionText": "To simulate human intelligence for specific tasks", "explanation": "AI aims to mimic human cognition." }] }';

  const result = extractJsonPayload(input);

  assert.ok(result);
  assert.match(result ?? '', /"mode": "mcq"/);
  assert.match(result ?? '', /"question": "What is AI\?"/);
});
