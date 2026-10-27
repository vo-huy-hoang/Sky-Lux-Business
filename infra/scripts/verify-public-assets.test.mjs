import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPublicAssets } from './verify-public-assets.mjs';

const domain = 'optrip.vn';
const html = '<script src="/_next/static/runtime.js"></script><link rel="stylesheet" href="/_next/static/site.css">';
const ok = (url) => ({
  status: 200,
  headers: { 'content-type': url.endsWith('.js') ? 'application/javascript; charset=utf-8' : url.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8' },
  body: url.endsWith('/login') ? html : '',
  remoteAddress: '203.0.113.10',
  elapsedMs: 5,
});
const run = (request) => verifyPublicAssets({ domains: [domain], request, attempts: 3, retryDelayMs: 0, log: () => {} });

test('Case A: HTTP 200 page and required assets pass', async () => {
  const result = await run(async (url) => ok(url));
  assert.equal(result.result, 'PASS');
});

test('Case B: JavaScript 404 is FAIL_APPLICATION', async () => {
  const result = await run(async (url) => url.endsWith('.js') ? { ...ok(url), status: 404 } : ok(url));
  assert.equal(result.result, 'FAIL_APPLICATION');
  assert.match(result.failures[0].message, /HTTP 404/);
});

test('Case C: CSS 404 is FAIL_APPLICATION', async () => {
  const result = await run(async (url) => url.endsWith('.css') ? { ...ok(url), status: 404 } : ok(url));
  assert.equal(result.result, 'FAIL_APPLICATION');
  assert.match(result.failures[0].message, /HTTP 404/);
});

test('Case D: invalid asset Content-Type is FAIL_APPLICATION', async () => {
  const result = await run(async (url) => url.endsWith('.js') ? { ...ok(url), headers: { 'content-type': 'text/html' } } : ok(url));
  assert.equal(result.result, 'FAIL_APPLICATION');
  assert.match(result.failures[0].message, /Content-Type/);
});

test('Case E: connection timeout retries a bounded number of times then FAIL_NETWORK', async () => {
  let calls = 0;
  const result = await run(async () => { calls += 1; throw Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }); });
  assert.equal(calls, 3);
  assert.equal(result.result, 'FAIL_NETWORK');
});

test('Case F: transient network failure followed by success passes', async () => {
  let failedOnce = false;
  const result = await run(async (url) => {
    if (!failedOnce) { failedOnce = true; throw Object.assign(new Error('reset'), { code: 'ECONNRESET' }); }
    return ok(url);
  });
  assert.equal(result.result, 'PASS');
});

test('persistent HTTP 5xx retries are bounded and then FAIL_APPLICATION', async () => {
  let calls = 0;
  const result = await run(async (url) => {
    calls += 1;
    return url.endsWith('/login') ? { ...ok(url), status: 503 } : ok(url);
  });
  assert.equal(calls, 3);
  assert.equal(result.result, 'FAIL_APPLICATION');
  assert.match(result.failures[0].message, /HTTP 503/);
});

test('Case G: DNS resolution failure is FAIL_NETWORK', async () => {
  const result = await run(async () => { throw Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }); });
  assert.equal(result.result, 'FAIL_NETWORK');
});

test('Case H: TLS certificate error is FAIL_NETWORK and is not bypassed', async () => {
  const result = await run(async () => { throw Object.assign(new Error('certificate has expired'), { code: 'CERT_HAS_EXPIRED' }); });
  assert.equal(result.result, 'FAIL_NETWORK');
  assert.match(result.failures[0].message, /CERT_HAS_EXPIRED/);
});

test('Case I: one domain passes while the other fails means overall failure', async () => {
  const result = await verifyPublicAssets({
    domains: ['optrip.vn', 'www.optrip.vn'],
    request: async (url) => url.startsWith('https://www.') ? { ...ok(url), status: 503 } : ok(url),
    attempts: 1,
    retryDelayMs: 0,
    log: () => {},
  });
  assert.equal(result.result, 'FAIL_APPLICATION');
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].domain, 'www.optrip.vn');
});
