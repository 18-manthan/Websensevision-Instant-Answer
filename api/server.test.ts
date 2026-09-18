import assert from 'node:assert/strict';
import { after, test } from 'node:test';

const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);
const canRunFastifyV5 = nodeMajor >= 20;
let app: Awaited<typeof import('./server')>['server'] | null = null;

async function getServer() {
  if (!canRunFastifyV5) {
    throw new Error('Fastify v5 route tests require Node.js 20+.');
  }

  process.env.GROQ_API_KEY = '';
  app ??= (await import('./server')).server;
  return app;
}

after(async () => {
  await app?.close();
});

test('server route tests require Node.js 20+', { skip: canRunFastifyV5 }, () => {
  assert.ok(nodeMajor < 20);
});

test('health reports mock mode when no Groq key is configured', { skip: !canRunFastifyV5 }, async () => {
  const server = await getServer();
  const response = await server.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().ok, true);
  assert.equal(response.json().provider, 'mock');
});

test('ask rejects empty capture input with a stable error code', { skip: !canRunFastifyV5 }, async () => {
  const server = await getServer();
  const response = await server.inject({
    method: 'POST',
    url: '/ask',
    payload: {}
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'no_context');
});

test('ask rejects unknown request fields through the route schema', { skip: !canRunFastifyV5 }, async () => {
  const server = await getServer();
  const response = await server.inject({
    method: 'POST',
    url: '/ask',
    payload: { context: 'Who is the father of the computer?', unexpected: true }
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.json().error, /must NOT have additional properties/);
});

test('buildCapturedContext keeps selected text and page context together', { skip: !canRunFastifyV5 }, async () => {
  const { buildCapturedContext } = await import('./server');

  const context = buildCapturedContext({
    selectedText: 'Which planet is known as the Red Planet?',
    context: 'A. Mars B. Venus C. Jupiter D. Neptune',
    sourceMode: 'dom'
  });

  assert.match(context, /Selected text:\nWhich planet/);
  assert.match(context, /Page text:\nA\. Mars B\. Venus/);
});

test('CORS allows extension origins and rejects arbitrary webpages', { skip: !canRunFastifyV5 }, async () => {
  const { isAllowedCorsOrigin } = await import('./server');

  assert.equal(isAllowedCorsOrigin('chrome-extension://abcdefghijklmnop'), true);
  assert.equal(isAllowedCorsOrigin('http://localhost:5173'), true);
  assert.equal(isAllowedCorsOrigin('https://example.com'), false);
});

test('health does not reflect disallowed browser origins', { skip: !canRunFastifyV5 }, async () => {
  const server = await getServer();
  const response = await server.inject({
    method: 'GET',
    url: '/health',
    headers: { origin: 'https://example.com' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('ask returns a normalized mock answer for captured text in dev mode', { skip: !canRunFastifyV5 }, async () => {
  const server = await getServer();
  const response = await server.inject({
    method: 'POST',
    url: '/ask',
    payload: { context: 'Who is the father of the computer?', sourceMode: 'dom' }
  });

  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(body.provider, 'mock');
  assert.equal(body.sourceMode, 'dom');
  assert.equal(body.answers[0].answer.includes('Charles Babbage'), true);
});
