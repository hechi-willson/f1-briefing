// Behaviour tests for the Home Screen standalone refresh block in index.html.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'index.html');
const pageHtml = fs.readFileSync(pagePath, 'utf8');
const scriptMatch = pageHtml.match(/<script id="pp-standalone-refresh">([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('missing #pp-standalone-refresh');
const script = scriptMatch[1];

function withStand(html, stand) {
  const re = /<p id="stand">[\s\S]*?<\/p>/;
  if (!re.test(html)) throw new Error('stand element not found');
  return html.replace(/<p id="stand">[\s\S]*?<\/p>/, `<p id="stand">${stand}</p>`);
}

function standText(html) {
  const m = html.match(/<p id="stand">([^<]*)<\/p>/);
  if (!m) throw new Error('stand text missing');
  return m[1].replace(/\s+/g, ' ').trim();
}

function shiftStand(stand, minutes) {
  const m = /^Stand:\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})\b/.exec(stand);
  if (!m) throw new Error('unexpected stand ' + stand);
  const dt = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]));
  dt.setUTCMinutes(dt.getUTCMinutes() + minutes);
  const p = (n) => String(n).padStart(2, '0');
  return `Stand: ${p(dt.getUTCDate())}.${p(dt.getUTCMonth() + 1)}.${dt.getUTCFullYear()} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())} Wien`;
}

function standKey(stand) {
  const m = /^Stand:\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})\b/.exec(stand);
  if (!m) return '';
  return m[3] + m[2] + m[1] + m[4] + m[5];
}

const publishedStand = standText(pageHtml);
const newerStand = shiftStand(publishedStand, 1);
const olderStand = shiftStand(publishedStand, -1);

function harness(options = {}) {
  const fetches = [];
  const replaces = [];
  const storageHits = [];
  let now = 1_700_000_000_000;
  let visibility = options.visibility || 'visible';
  const stand = { textContent: options.standText ?? publishedStand };
  const listeners = { document: {}, window: {} };
  function listen(bucket, type, fn) {
    (bucket[type] ||= []).push(fn);
  }
  function dispatch(bucket, type) {
    for (const fn of bucket[type] || []) fn({ type, persisted: !!options.persisted });
  }
  const location = {
    pathname: options.pathname ?? '/',
    origin: 'https://pushpush.live',
    search: options.search ?? '',
    hash: options.hash ?? '',
    replace(url) {
      replaces.push(url);
      const hashAt = url.indexOf('#');
      const hash = hashAt === -1 ? '' : url.slice(hashAt);
      const before = hashAt === -1 ? url : url.slice(0, hashAt);
      const q = before.indexOf('?');
      location.pathname = q === -1 ? before : before.slice(0, q);
      location.search = q === -1 ? '' : before.slice(q);
      location.hash = hash;
    },
  };
  const document = {
    get readyState() { return options.readyState ?? 'loading'; },
    get visibilityState() { return visibility; },
    getElementById(id) { return id === 'stand' ? stand : null; },
    addEventListener(type, fn) { listen(listeners.document, type, fn); },
    dispatch(type) { dispatch(listeners.document, type); },
  };
  const navigator = {
    get standalone() { return options.iosStandalone; },
    get serviceWorker() { storageHits.push('serviceWorker'); return undefined; },
  };
  let fetchImpl = options.fetch;
  const g = {
    URL,
    Promise,
    decodeURIComponent,
    console,
    location,
    document,
    navigator,
    Date: { now: () => ++now },
    fetch(url, opts) {
      fetches.push({ url: String(url), opts });
      if (fetchImpl) return fetchImpl(url, opts);
      const body = options.html ?? withStand(pageHtml, newerStand);
      return Promise.resolve({
        ok: options.ok !== false,
        status: options.status ?? 200,
        url: options.responseURL ?? ('https://pushpush.live/?pp-bust=' + now),
        text: () => Promise.resolve(body),
      });
    },
    addEventListener(type, fn) { listen(listeners.window, type, fn); },
    dispatch(type) { dispatch(listeners.window, type); },
    matchMedia: options.matchMedia,
  };
  g.window = g;
  Object.defineProperty(g, 'localStorage', {
    get() { storageHits.push('localStorage'); throw new Error('localStorage'); },
  });
  Object.defineProperty(g, 'sessionStorage', {
    get() { storageHits.push('sessionStorage'); throw new Error('sessionStorage'); },
  });
  vm.runInNewContext(script, g, { filename: 'pp-standalone-refresh.js' });
  return {
    fetches,
    replaces,
    storageHits,
    document,
    location,
    stand,
    window: g,
    setVisibility(v) { visibility = v; },
    advance(ms) { now += ms; },
    setFetch(fn) { fetchImpl = fn; },
    async flush() {
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
    },
  };
}

function standaloneMatch(matches) {
  return (q) => ({ matches: matches && String(q) === '(display-mode: standalone)', media: String(q) });
}

async function openAndFlush(h) {
  h.document.dispatch('DOMContentLoaded');
  await h.flush();
}

test('published page keeps stand, personalization, weather, noindex, and legal links', () => {
  assert.equal(scriptMatch.length, 2);
  assert.equal(pageHtml.match(/id="pp-standalone-refresh"/g).length, 1);
  assert.match(pageHtml, /pushpush\.ansicht\.v1/);
  assert.match(pageHtml, /id="wetter"/);
  assert.match(pageHtml, /class="wk-grid"/);
  assert.match(pageHtml, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(pageHtml, /<p id="stand">Stand: \d{2}\.\d{2}\.\d{4} \d{2}:\d{2} Wien<\/p>/);
  assert.match(pageHtml, /href="\/impressum\.html"/);
  assert.match(pageHtml, /href="\/archiv\/"/);
  assert.equal(fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim(), 'pushpush.live');
  assert.doesNotMatch(script, /\blocalStorage\b|\bsessionStorage\b|serviceWorker|new Notification|navigator\.serviceWorker/);
});

test('archive copies and impressum do not contain the refresh script', () => {
  for (const file of fs.readdirSync(path.join(root, 'archiv'))) {
    const text = fs.readFileSync(path.join(root, 'archiv', file), 'utf8');
    assert.equal(text.includes('pp-standalone-refresh'), false, file);
    assert.equal(text.includes('pp-bust'), false, file);
  }
  const impressum = fs.readFileSync(path.join(root, 'impressum.html'), 'utf8');
  assert.equal(impressum.includes('pp-standalone-refresh'), false);
});

test('iOS standalone reloads once when the published Stand is newer', async () => {
  const h = harness({ iosStandalone: true, matchMedia: undefined });
  await openAndFlush(h);
  assert.equal(h.fetches.length, 1);
  assert.match(h.fetches[0].url, /^https:\/\/pushpush\.live\/\?pp-bust=\d+$/);
  assert.equal(h.fetches[0].opts.cache, 'no-store');
  assert.equal(h.fetches[0].opts.credentials, 'same-origin');
  assert.equal(h.fetches[0].opts.headers.Accept, 'text/html');
  assert.equal(h.replaces.length, 1);
  assert.match(h.replaces[0], new RegExp('^/\\?pp-rev=' + standKey(newerStand) + '&pp-bust=\\d+$'));
  assert.equal(h.storageHits.length, 0);
});

test('standard display-mode standalone reloads when Stand is newer', async () => {
  const h = harness({ iosStandalone: false, matchMedia: standaloneMatch(true) });
  await openAndFlush(h);
  assert.equal(h.replaces.length, 1);
  assert.match(h.replaces[0], /pp-rev=/);
});

test('iOS and display-mode together still reload only once', async () => {
  const h = harness({ iosStandalone: true, matchMedia: standaloneMatch(true), hash: '#top' });
  h.document.dispatch('DOMContentLoaded');
  h.window.dispatch('pageshow');
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.fetches.length, 1);
  assert.equal(h.replaces.length, 1);
  assert.match(h.replaces[0], /#top$/);
});

test('normal browser, minimal-ui, and a throwing matchMedia do not fetch or reload', async () => {
  for (const options of [
    { iosStandalone: undefined, matchMedia: standaloneMatch(false) },
    { iosStandalone: false, matchMedia: (q) => ({ matches: String(q).includes('minimal-ui'), media: q }) },
    { iosStandalone: false, matchMedia: () => { throw new Error('no media'); } },
  ]) {
    const h = harness(options);
    h.document.dispatch('DOMContentLoaded');
    h.window.dispatch('pageshow');
    h.document.dispatch('visibilitychange');
    h.document.dispatch('resume');
    await h.flush();
    assert.equal(h.fetches.length, 0);
    assert.equal(h.replaces.length, 0);
  }
});

test('archive, impressum, and other paths stay frozen even when standalone', async () => {
  for (const pathname of ['/archiv/2026-19-mexiko-mexiko-stadt.html', '/archiv/', '/impressum.html', '/favicon.ico']) {
    const h = harness({ pathname, iosStandalone: true, matchMedia: standaloneMatch(true) });
    h.document.dispatch('DOMContentLoaded');
    h.window.dispatch('pageshow');
    await h.flush();
    assert.equal(h.fetches.length, 0, pathname);
    assert.equal(h.replaces.length, 0, pathname);
  }
});

test('/index.html checks the canonical homepage and preserves personalization storage', async () => {
  const h = harness({ pathname: '/index.html', iosStandalone: true });
  await openAndFlush(h);
  assert.match(h.fetches[0].url, /^https:\/\/pushpush\.live\/\?pp-bust=\d+$/);
  assert.match(h.replaces[0], /^\//);
  assert.equal(h.storageHits.length, 0);
});

test('unchanged Stand, whitespace-equivalent Stand, and older Stand do not reload', async () => {
  const cases = [
    withStand(pageHtml, publishedStand),
    withStand(pageHtml, '\n  ' + publishedStand + '  \n'),
    withStand(pageHtml, olderStand),
  ];
  for (const html of cases) {
    const h = harness({ iosStandalone: true, html });
    await openAndFlush(h);
    assert.equal(h.fetches.length, 1);
    assert.equal(h.replaces.length, 0);
  }
});

test('a same-document lifecycle burst performs one check, then a later foreground checks again', async () => {
  const h = harness({ iosStandalone: true, html: withStand(pageHtml, publishedStand) });
  h.document.dispatch('DOMContentLoaded');
  h.window.dispatch('pageshow');
  h.document.dispatch('resume');
  await h.flush();
  assert.equal(h.fetches.length, 1);
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.fetches.length, 1);
  h.advance(1000);
  h.setVisibility('hidden');
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.fetches.length, 1);
  h.setVisibility('visible');
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.fetches.length, 2);
  assert.equal(h.replaces.length, 0);
});

test('overlapping checks while a fetch is in flight do not reload twice', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const h = harness({
    iosStandalone: true,
    fetch: () => gate.then(() => ({
      ok: true,
      url: 'https://pushpush.live/?pp-bust=1',
      text: () => Promise.resolve(withStand(pageHtml, newerStand)),
    })),
  });
  h.document.dispatch('DOMContentLoaded');
  h.window.dispatch('pageshow');
  h.document.dispatch('visibilitychange');
  h.document.dispatch('resume');
  await h.flush();
  assert.equal(h.fetches.length, 1);
  release();
  await h.flush();
  assert.equal(h.replaces.length, 1);
  h.advance(1000);
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.fetches.length, 2);
  assert.equal(h.replaces.length, 1);
});

test('hidden on open does not fetch until the app is visible again', async () => {
  const h = harness({ iosStandalone: true, visibility: 'hidden' });
  h.document.dispatch('DOMContentLoaded');
  h.window.dispatch('pageshow');
  await h.flush();
  assert.equal(h.fetches.length, 0);
  h.setVisibility('visible');
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.fetches.length, 1);
  assert.equal(h.replaces.length, 1);
});

test('going hidden before the response arrives does not reload', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const h = harness({
    iosStandalone: true,
    fetch: () => gate.then(() => ({
      ok: true,
      url: 'https://pushpush.live/?pp-bust=1',
      text: () => Promise.resolve(withStand(pageHtml, newerStand)),
    })),
  });
  h.document.dispatch('DOMContentLoaded');
  await h.flush();
  h.setVisibility('hidden');
  release();
  await h.flush();
  assert.equal(h.replaces.length, 0);
});

test('offline, HTTP errors, malformed bodies, and a foreign origin stay quiet', async () => {
  const bodies = [
    { fetch: () => Promise.reject(new Error('offline')) },
    { ok: false, status: 500, html: withStand(pageHtml, newerStand) },
    { ok: false, status: 404, html: 'missing' },
    { html: '<!doctype html><title>nope</title>' },
    { html: '<p id="stand">gestern</p>' },
    { html: '<p id="stand">Stand: 07.11.2026 24:01 Wien</p>' },
    { html: '<p id="stand"></p>' },
    { html: '' },
    { responseURL: 'https://captive.example/intercept', html: withStand(pageHtml, newerStand) },
    { fetch: () => Promise.resolve({ ok: true, url: 'https://pushpush.live/?pp-bust=1', text: () => Promise.reject(new Error('body')) }) },
  ];
  for (const options of bodies) {
    const h = harness({ iosStandalone: true, ...options });
    await openAndFlush(h);
    assert.equal(h.replaces.length, 0);
    assert.equal(h.storageHits.length, 0);
  }
});

test('a failed reload does not loop on the same Stand, and a later Stand still reloads', async () => {
  const first = newerStand;
  const second = shiftStand(publishedStand, 2);
  const h = harness({ iosStandalone: true, html: withStand(pageHtml, first) });
  await openAndFlush(h);
  assert.equal(h.replaces.length, 1);
  assert.match(h.location.search, new RegExp('pp-rev=' + standKey(first)));
  h.advance(1000);
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.replaces.length, 1);
  h.setFetch(() => Promise.resolve({
    ok: true,
    url: 'https://pushpush.live/?pp-bust=2',
    text: () => Promise.resolve(withStand(pageHtml, second)),
  }));
  h.advance(1000);
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.replaces.length, 2);
  assert.match(h.replaces[1], new RegExp('pp-rev=' + standKey(second)));
});

test('an already current document does not reload on foreground', async () => {
  const h = harness({
    iosStandalone: true,
    readyState: 'complete',
    standText: newerStand,
    html: withStand(pageHtml, newerStand),
    search: '?pp-rev=' + standKey(newerStand),
  });
  await h.flush();
  h.advance(1000);
  h.document.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.replaces.length, 0);
  assert.ok(h.fetches.length >= 1);
});

test('day rollover counts as newer', async () => {
  const late = 'Stand: 07.11.2026 23:59 Wien';
  const next = 'Stand: 08.11.2026 00:00 Wien';
  const h = harness({
    iosStandalone: true,
    standText: late,
    html: withStand(pageHtml, next),
  });
  await openAndFlush(h);
  assert.match(h.replaces[0], /pp-rev=202611080000/);
});

function startServer(state) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
  };
  const server = http.createServer(async (req, res) => {
    try {
    const u = new URL(req.url, 'http://127.0.0.1');
    state.hits.push(u.pathname + u.search);
    const home = u.pathname === '/' || u.pathname === '/index.html';
    if (home && (u.searchParams.has('pp-bust') || u.searchParams.has('pp-rev'))) {
      if (state.hold) await state.hold;
      if (state.probe === 'offline') {
        req.socket.destroy();
        return;
      }
      if (state.probe === 'error') {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        res.end('nope');
        return;
      }
      if (state.probe === 'malformed') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end('<!doctype html><html><body><p id="stand">gestern Abend</p></body></html>');
        return;
      }
      const stand = state.probe === 'older' ? olderStand : state.probe === 'same' ? publishedStand : newerStand;
      const body = u.searchParams.has('pp-rev') && state.staleReload
        ? withStand(pageHtml, publishedStand)
        : withStand(pageHtml, stand);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
      return;
    }
    if (home) {
      const stand = state.initial === 'newer' ? newerStand : publishedStand;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'max-age=600' });
      res.end(withStand(pageHtml, stand));
      return;
    }
    const rel = decodeURIComponent(u.pathname);
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'cache-control': 'no-store' });
      res.end('missing');
      return;
    }
    res.writeHead(200, {
      'content-type': types[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(err && err.message || err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function startChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-chrome-'));
  const proc = spawn('/opt/google/chrome/chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--disable-extensions',
    '--remote-debugging-port=0',
    `--user-data-dir=${dir}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const browserWs = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('chrome did not open a debug port\n' + buf)), 20000);
    proc.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('chrome exited ' + code + '\n' + buf));
    });
  });
  return { proc, dir, port: new URL(browserWs).port };
}

function killChrome(chrome) {
  if (!chrome) return;
  try { chrome.proc.kill('SIGTERM'); } catch { /* already gone */ }
  try { fs.rmSync(chrome.dir, { recursive: true, force: true }); } catch { /* temp dir */ }
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      for (const fn of this.listeners) fn(msg);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(fn) { this.listeners.push(fn); }
  close() { this.ws.close(); }
}

async function openTab(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!res.ok) throw new Error('json/new ' + res.status);
  const info = await res.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const cdp = new Cdp(ws);
  const exceptions = [];
  cdp.on((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.text || 'exception');
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  return { cdp, info, exceptions, close: () => cdp.close() };
}

const IOS = `(() => {
  try { Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: () => true }); } catch (e) {}
  const orig = window.matchMedia ? window.matchMedia.bind(window) : null;
  window.matchMedia = (q) => {
    const standalone = false;
    if (String(q).includes('display-mode')) {
      return { matches: standalone && String(q).includes('standalone'), media: String(q), addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} };
    }
    return orig ? orig(q) : { matches: false, media: String(q) };
  };
})();`;

const DISPLAY_MODE = `(() => {
  try { Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: () => false }); } catch (e) {}
  const orig = window.matchMedia ? window.matchMedia.bind(window) : null;
  window.matchMedia = (q) => {
    if (String(q) === '(display-mode: standalone)') {
      return { matches: true, media: String(q), addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} };
    }
    return orig ? orig(q) : { matches: false, media: String(q) };
  };
})();`;

async function runBrowser(chrome, state, { inject = '', path: urlPath = '/', waitMs = 1200, visibility = 'visible' } = {}) {
  const tab = await openTab(chrome.port);
  try {
    let source = inject;
    if (visibility === 'hidden') {
      source += `(() => {
        let state = 'hidden';
        window.__setVis = (v) => { state = v; document.dispatchEvent(new Event('visibilitychange')); };
        Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => state });
        Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => state === 'hidden' });
      })();`;
    }
    if (source) await tab.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source });
    const loaded = new Promise((resolve) => {
      const timer = setTimeout(resolve, waitMs + 4000);
      tab.cdp.on((msg) => {
        if (msg.method === 'Page.loadEventFired') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    await Promise.race([
      tab.cdp.send('Page.navigate', { url: `http://127.0.0.1:${state.port}${urlPath}` }),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
    await loaded;
    if (visibility === 'hidden') {
      await new Promise((r) => setTimeout(r, 500));
      const early = state.hits.filter((h) => h.includes('pp-bust=') || h.includes('pp-rev='));
      assert.deepEqual(early, [], 'checked while hidden: ' + early.join(', '));
      await tab.cdp.send('Runtime.evaluate', { expression: "window.__setVis('visible')", awaitPromise: true });
    }
    await new Promise((r) => setTimeout(r, waitMs));
    const snap = await tab.cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        href: location.href,
        stand: (document.getElementById('stand') || {}).textContent || '',
        hiddenBtn: document.getElementById('pz-btn') ? document.getElementById('pz-btn').hidden : null,
        weather: document.querySelectorAll('#wetter .wk').length,
        view: localStorage.getItem('pushpush.ansicht.v1'),
        regs: navigator.serviceWorker ? 'present' : 'absent'
      })`,
      returnByValue: true,
    });
    assert.equal(tab.exceptions.length, 0, tab.exceptions.join('\n'));
    return JSON.parse(snap.result.value);
  } finally {
    tab.close();
  }
}

test('browser: normal tab, standalone modes, errors, foreground, archives', { timeout: 120000 }, async () => {
  const state = { hits: [], probe: 'newer', initial: 'published', hold: null, staleReload: false, port: 0 };
  const server = await startServer(state);
  state.port = server.address().port;
  let chrome;
  try {
    chrome = await startChrome();
    state.hits.length = 0;
    state.probe = 'newer';
    const normal = await runBrowser(chrome, state, { waitMs: 800 });
    assert.match(normal.stand, /09:43|Stand:/);
    assert.equal(normal.stand.replace(/\s+/g, ' ').trim(), publishedStand);
    assert.equal(new URL(normal.href).search, '');
    assert.equal(normal.hiddenBtn, false);
    assert.ok(normal.weather >= 1);
    assert.equal(state.hits.some((h) => h.includes('pp-bust=')), false);

    state.hits.length = 0;
    const ios = await runBrowser(chrome, state, { inject: IOS, waitMs: 1500 });
    const iosURL = new URL(ios.href);
    assert.equal(iosURL.searchParams.get('pp-rev'), standKey(newerStand));
    assert.equal(ios.stand.replace(/\s+/g, ' ').trim(), newerStand);
    assert.equal(state.hits.filter((h) => h.includes('pp-rev=')).length, 1);

    state.hits.length = 0;
    state.probe = 'same';
    const same = await runBrowser(chrome, state, { inject: DISPLAY_MODE, waitMs: 900 });
    assert.equal(new URL(same.href).search, '');
    assert.equal(same.stand.replace(/\s+/g, ' ').trim(), publishedStand);

    state.hits.length = 0;
    state.probe = 'older';
    state.initial = 'newer';
    const older = await runBrowser(chrome, state, { inject: IOS, waitMs: 900 });
    assert.equal(new URL(older.href).search, '');
    assert.equal(older.stand.replace(/\s+/g, ' ').trim(), newerStand);
    state.initial = 'published';

    state.hits.length = 0;
    state.probe = 'error';
    const broken = await runBrowser(chrome, state, { inject: DISPLAY_MODE, waitMs: 900 });
    assert.equal(new URL(broken.href).search, '');
    assert.equal(broken.stand.replace(/\s+/g, ' ').trim(), publishedStand);

    state.hits.length = 0;
    state.probe = 'malformed';
    const malformed = await runBrowser(chrome, state, { inject: IOS, waitMs: 900 });
    assert.equal(new URL(malformed.href).search, '');

    state.hits.length = 0;
    state.probe = 'offline';
    const offline = await runBrowser(chrome, state, { inject: IOS, waitMs: 900 });
    assert.equal(new URL(offline.href).search, '');
    assert.equal(offline.stand.replace(/\s+/g, ' ').trim(), publishedStand);

    state.hits.length = 0;
    state.probe = 'newer';
    state.staleReload = true;
    const loop = await runBrowser(chrome, state, { inject: IOS, waitMs: 1800 });
    assert.equal(new URL(loop.href).searchParams.get('pp-rev'), standKey(newerStand));
    assert.equal(state.hits.filter((h) => h.startsWith('/?pp-rev=') || h.startsWith('/?pp-rev=')).length, 1);
    const reloads = state.hits.filter((h) => h.includes('pp-rev='));
    assert.equal(reloads.length, 1, reloads.join('\n'));
    state.staleReload = false;

    state.hits.length = 0;
    state.probe = 'newer';
    const hidden = await runBrowser(chrome, state, { inject: IOS, visibility: 'hidden', waitMs: 1200 });
    assert.equal(new URL(hidden.href).searchParams.get('pp-rev'), standKey(newerStand));
    const beforeVisible = state.hits.findIndex((h) => h.includes('pp-bust='));
    assert.ok(beforeVisible >= 0);

    state.hits.length = 0;
    state.probe = 'newer';
    const archived = await runBrowser(chrome, state, {
      inject: IOS,
      path: '/archiv/2026-19-mexiko-mexiko-stadt.html',
      waitMs: 800,
    });
    assert.equal(archived.href.includes('pp-rev'), false);
    assert.equal(state.hits.some((h) => h.includes('pp-bust=')), false);

    state.hits.length = 0;
    let release;
    state.hold = new Promise((resolve) => { release = resolve; });
    state.probe = 'newer';
    const tab = await openTab(chrome.port);
    try {
      await tab.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: IOS });
      const loaded = new Promise((resolve) => {
        tab.cdp.on((msg) => { if (msg.method === 'Page.loadEventFired') resolve(); });
      });
      await tab.cdp.send('Page.navigate', { url: `http://127.0.0.1:${state.port}/` });
      await loaded;
      await tab.cdp.send('Runtime.evaluate', {
        expression: `localStorage.setItem('pushpush.ansicht.v1', ${JSON.stringify('{"order":["wetter"],"hidden":["fia"]}')})`,
      });
      release();
      await new Promise((r) => setTimeout(r, 1500));
      const kept = await tab.cdp.send('Runtime.evaluate', {
        expression: `localStorage.getItem('pushpush.ansicht.v1')`,
        returnByValue: true,
      });
      assert.equal(kept.result.value, '{"order":["wetter"],"hidden":["fia"]}');
      const href = await tab.cdp.send('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
      assert.match(href.result.value, /pp-rev=/);
      assert.equal(tab.exceptions.length, 0, tab.exceptions.join('\n'));
    } finally {
      tab.close();
      state.hold = null;
    }
  } finally {
    server.close();
    killChrome(chrome);
  }
});
