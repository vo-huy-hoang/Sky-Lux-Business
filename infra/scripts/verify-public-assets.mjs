#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import { resolve6, resolve4 } from 'node:dns/promises';
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

export const DEFAULT_DOMAINS = ['optrip.vn', 'www.optrip.vn'];
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;
const MAX_REDIRECTS = 5;

const isJs = (pathname) => /\.m?js$/i.test(pathname);
const isCss = (pathname) => /\.css$/i.test(pathname);
const validMime = (pathname, contentType) => {
  if (isJs(pathname)) return /^(?:application|text)\/(?:x-)?(?:javascript|ecmascript)(?:\s*;|$)/i.test(contentType);
  if (isCss(pathname)) return /text\/css/i.test(contentType);
  return false;
};

function requestHttps(url, { timeoutMs = TIMEOUT_MS, redirects = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        clearTimeout(overallTimer);
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && location) {
          if (redirects >= MAX_REDIRECTS) return reject(new Error(`Too many redirects for ${url}`));
          const next = new URL(location, url);
          if (next.protocol !== 'https:') return reject(new Error(`Refusing non-HTTPS redirect to ${next.href}`));
          requestHttps(next, { timeoutMs, redirects: redirects + 1 }).then(resolve, reject);
          return;
        }
        resolve({
          status,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
          remoteAddress: res.socket?.remoteAddress ?? 'unknown',
          elapsedMs: Math.round(performance.now() - started),
        });
      });
    });
    const overallTimer = setTimeout(() => req.destroy(Object.assign(new Error(`Request timed out after ${timeoutMs}ms`), { code: 'ETIMEDOUT' })), timeoutMs);
    req.on('error', () => clearTimeout(overallTimer));
    req.on('timeout', () => req.destroy(Object.assign(new Error(`Request timed out after ${timeoutMs}ms`), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
  });
}

async function retryRequest(url, { request, attempts, timeoutMs, retryDelayMs, log }) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request(url, { timeoutMs });
      log(`  attempt ${attempt}/${attempts}: HTTP ${response.status} in ${response.elapsedMs ?? '?'}ms, IP ${response.remoteAddress ?? 'unknown'}, TLS validation enabled`);
      if (response.status >= 500 && attempt < attempts) {
        log(`  transient HTTP ${response.status}; retrying`);
        if (retryDelayMs) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      log(`  attempt ${attempt}/${attempts}: network/TLS error ${error.code ?? error.name}: ${error.message}`);
      if (attempt < attempts) {
        if (retryDelayMs) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Request failed without a response');
}

export async function verifyPublicAssets({
  domains = DEFAULT_DOMAINS,
  request = requestHttps,
  attempts = MAX_ATTEMPTS,
  timeoutMs = TIMEOUT_MS,
  retryDelayMs = RETRY_DELAY_MS,
  log = console.log,
} = {}) {
  const failures = [];
  for (const domain of domains) {
    const base = `https://${domain}`;
    log(`\nChecking ${base}/login`);
    try {
      const page = await retryRequest(`${base}/login`, { request, attempts, timeoutMs, retryDelayMs, log });
      if (page.status !== 200) {
        failures.push({ domain, kind: page.status >= 500 ? 'FAIL_APPLICATION' : 'FAIL_APPLICATION', message: `${base}/login returned HTTP ${page.status}` });
        log(`  FAIL_APPLICATION: ${base}/login returned HTTP ${page.status}`);
        continue;
      }

      const refs = new Set();
      for (const match of page.body.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
        try {
          const asset = new URL(match[1], base);
          if (asset.origin === base && (isJs(asset.pathname) || isCss(asset.pathname))) refs.add(asset.href);
        } catch { /* Ignore malformed/non-URL HTML attributes. */ }
      }
      const assets = [...refs];
      if (!assets.some((asset) => isJs(new URL(asset).pathname))) {
        failures.push({ domain, kind: 'FAIL_APPLICATION', message: `${base}/login did not reference a JavaScript asset` });
        log(`  FAIL_APPLICATION: ${base}/login did not reference a JavaScript asset`);
        continue;
      }
      if (!assets.some((asset) => isCss(new URL(asset).pathname))) {
        failures.push({ domain, kind: 'FAIL_APPLICATION', message: `${base}/login did not reference a CSS asset` });
        log(`  FAIL_APPLICATION: ${base}/login did not reference a CSS asset`);
        continue;
      }

      for (const asset of assets) {
        const pathname = new URL(asset).pathname;
        const response = await retryRequest(asset, { request, attempts, timeoutMs, retryDelayMs, log });
        const contentType = response.headers['content-type'] ?? response.headers.get?.('content-type') ?? '';
        if (response.status !== 200) {
          failures.push({ domain, kind: 'FAIL_APPLICATION', message: `${asset} returned HTTP ${response.status}` });
          log(`  FAIL_APPLICATION: ${asset} returned HTTP ${response.status}`);
          break;
        }
        if (!validMime(pathname, contentType)) {
          failures.push({ domain, kind: 'FAIL_APPLICATION', message: `${asset} has invalid Content-Type: ${contentType || '(missing)'}` });
          log(`  FAIL_APPLICATION: ${asset} has invalid Content-Type: ${contentType || '(missing)'}`);
          break;
        }
        log(`  PASS asset: HTTP ${response.status}, ${contentType}, ${pathname}`);
      }
      if (!failures.some((failure) => failure.domain === domain)) log(`  PASS: ${domain} login and JavaScript/CSS assets verified`);
    } catch (error) {
      const failure = { domain, kind: 'FAIL_NETWORK', message: `${base}: HTTPS request failed after ${attempts} attempts: ${error.code ?? error.name}: ${error.message}` };
      failures.push(failure);
      log(`  FAIL_NETWORK: ${failure.message}`);
    }
  }

  const result = failures.length ? failures.some((failure) => failure.kind === 'FAIL_APPLICATION') ? 'FAIL_APPLICATION' : 'FAIL_NETWORK' : 'PASS';
  return { result, failures };
}

async function collectDiagnostics(domain, log) {
  log(`\nDiagnostics for https://${domain}/login (informational; primary verification follows)`);
  for (const [label, resolver] of [['A', resolve4], ['AAAA', resolve6]]) {
    try { log(`  DNS ${label}: ${(await resolver(domain)).join(', ')}`); }
    catch (error) { log(`  DNS ${label}: unavailable (${error.code ?? error.message})`); }
  }

  const curl = spawnSync('curl', [
    '--ipv4', '--silent', '--show-error', '--output', '/dev/null', '--connect-timeout', '5', '--max-time', '12',
    '--write-out', 'remote_ip=%{remote_ip} http=%{http_code} connect_seconds=%{time_connect} total_seconds=%{time_total} content_type=%{content_type} tls_verify_result=%{ssl_verify_result}\n',
    `https://${domain}/login`,
  ], { encoding: 'utf8' });
  if (curl.stdout.trim()) log(`  curl IPv4: ${curl.stdout.trim()}`);
  if (curl.stderr.trim()) log(`  curl IPv4 error: ${curl.stderr.trim()}`);
  if (curl.error) log(`  curl IPv4 could not start: ${curl.error.message}`);
  if (curl.status !== 0) log(`  curl IPv4 exit: ${curl.status ?? 'signal/unknown'}`);
}

async function main() {
  const log = (message = '') => console.log(message);
  for (const domain of DEFAULT_DOMAINS) await collectDiagnostics(domain, log);
  const { result, failures } = await verifyPublicAssets({ log });
  const summary = [`## Public asset verification: ${result}`, '', ...DEFAULT_DOMAINS.map((domain) => `- ${domain}: ${failures.some((failure) => failure.domain === domain) ? 'FAIL' : 'PASS'}`)];
  if (failures.length) summary.push('', '### Failures', ...failures.map((failure) => `- **${failure.kind}** — ${failure.message}`));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);
  if (result !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
