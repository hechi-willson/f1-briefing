// Focused checks for the single-file bingo page and the homepage footer link.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bingoPath = path.join(root, 'bingo', 'index.html');
const indexPath = path.join(root, 'index.html');
const bingoHtml = fs.readFileSync(bingoPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const scriptMatch = bingoHtml.match(/<script id="bingo">([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('missing #bingo script');
const script = scriptMatch[1];

function element() {
  const node = { children: [], attrs: {}, style: {}, listeners: {}, _text: '' };
  node.classList = { toggle() {} };
  node.setAttribute = (key, value) => { node.attrs[key] = String(value); };
  node.getAttribute = (key) => node.attrs[key];
  node.appendChild = (child) => { node.children.push(child); return child; };
  node.removeChild = (child) => {
    const at = node.children.indexOf(child);
    if (at >= 0) node.children.splice(at, 1);
    return child;
  };
  node.addEventListener = (type, fn) => { (node.listeners[type] ||= []).push(fn); };
  node.click = () => { (node.listeners.click || []).forEach((fn) => fn()); };
  Object.defineProperty(node, 'firstChild', { get() { return node.children[0] || null; } });
  Object.defineProperty(node, 'textContent', {
    get() { return node._text; },
    set(value) {
      node._text = value == null ? '' : String(value);
      node.children.length = 0;
    },
  });
  return node;
}

function boot(options = {}) {
  const board = element();
  const win = element();
  const neu = element();
  const fx = element();
  win.hidden = true;
  const ids = { board, win, neu, fx };
  const writes = [];
  const store = {
    getItem(key) {
      if (options.throwGet) throw new Error('storage blocked');
      return Object.prototype.hasOwnProperty.call(options.saved || {}, key) ? options.saved[key] : null;
    },
    setItem(key, value) {
      writes.push(key);
      if (options.throwSet) throw new Error('storage blocked');
      (options.saved ||= {})[key] = String(value);
    },
  };
  const document = {
    getElementById: (id) => ids[id] || null,
    createElement: () => element(),
  };
  const window = {
    matchMedia: () => ({ matches: !!options.reduce }),
  };
  vm.runInNewContext(script, { document, window, localStorage: store, Math }, { filename: 'bingo.js' });
  return { board, win, neu, fx, saved: options.saved || {}, writes };
}

function texts(board) {
  return board.children.map((button) => button.textContent);
}

const POOL = [
  'McLaren slow stop',
  'Ferrari strategy fumble',
  'Audi finishes P11',
  'Stroll DNF',
  '"Superclipping"',
  'Rain expected in X minutes',
  'Max complains about downshifts',
  'FIA software bug',
  '"Wollt grad fragen"',
  'Gröbl erzählt aus den 50ern',
  'Safety Car',
  'Virtual Safety Car',
  'Red flag',
  '10-second time penalty',
  '5-second time penalty',
  'Collision between teammates',
  'Kimi track limits warning',
];

test('page shell matches the briefing constraints', () => {
  assert.match(bingoHtml, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(bingoHtml, /pushpush\.bingo\.v1/);
  assert.doesNotMatch(bingoHtml, /pushpush\.ansicht\.v1/);
  assert.doesNotMatch(bingoHtml, /serviceWorker/);
  assert.match(bingoHtml, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(bingoHtml, /#karte\{max-width:34rem/);
  assert.match(bingoHtml, /@media \(min-width:561px\)\{\.board button\{aspect-ratio:1/);
  assert.match(bingoHtml, /display:flex;align-items:center;justify-content:center/);
  assert.match(bingoHtml, /text-align:center/);
  assert.match(bingoHtml, /aria-pressed/);
  assert.doesNotMatch(bingoHtml, /✓|class="summary"/);
  assert.doesNotMatch(bingoHtml, /\bORF\b|<select/);
  assert.match(bingoHtml, /overflow-wrap:anywhere/);
  assert.equal(POOL.length, 17);
  POOL.forEach((entry) => assert.ok(bingoHtml.includes(entry), entry));
  assert.match(bingoHtml, /prefers-reduced-motion:reduce/);
  assert.match(bingoHtml, /<p class="legal"><a href="\/impressum\.html">Impressum<\/a><\/p>/);
  assert.equal((bingoHtml.match(/<footer>[\s\S]*?<\/footer>/) || [''])[0].match(/<a /g).length, 1);
  assert.match(indexHtml, /<p class="legal"><a href="\/archiv\/">Archiv<\/a> · <a href="\/bingo\/">Bingo<\/a> · <a href="\/impressum\.html">Impressum<\/a><\/p>/);
  assert.match(indexHtml, /<script id="pp-standalone-refresh">/);
  assert.match(indexHtml, /pushpush\.ansicht\.v1/);
  assert.equal(fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim(), 'pushpush.live');
});

test('first visit deals 16 distinct entries from the 17-line pool', () => {
  const game = boot();
  const labels = texts(game.board);
  assert.equal(labels.length, 16);
  assert.equal(new Set(labels).size, 16);
  labels.forEach((label) => assert.ok(POOL.includes(label), label));
  assert.equal(POOL.filter((entry) => !labels.includes(entry)).length, 1);
  const stored = JSON.parse(game.saved['pushpush.bingo.v1']);
  assert.deepEqual(stored.cells, labels);
  assert.deepEqual(stored.marks, Array(16).fill(false));
  assert.equal(game.win.hidden, true);
  assert.deepEqual(game.writes, ['pushpush.bingo.v1']);
});

test('tap toggles a mark, a full line wins once, and refresh keeps both', () => {
  const saved = {};
  const first = boot({ saved });
  for (let i = 0; i < 3; i++) first.board.children[i].click();
  assert.equal(first.win.hidden, true);
  assert.equal(first.fx.children.length, 0);
  first.board.children[3].click();
  assert.equal(first.win.hidden, false);
  assert.equal(first.win.textContent, 'Bingo. Volle Reihe.');
  assert.equal(first.fx.children.length, 18);
  first.board.children[4].click();
  assert.equal(first.fx.children.length, 18);
  const again = boot({ saved });
  assert.equal(again.board.children[0].attrs['aria-pressed'], 'true');
  assert.equal(again.board.children[3].attrs['aria-pressed'], 'true');
  assert.equal(again.board.children[4].attrs['aria-pressed'], 'true');
  assert.equal(again.board.children[5].attrs['aria-pressed'], 'false');
  assert.equal(again.win.hidden, false);
  assert.equal(again.fx.children.length, 0);
});

test('column and both diagonals win, Neu clears marks and the message', () => {
  const column = boot();
  [0, 4, 8, 12].forEach((index) => column.board.children[index].click());
  assert.equal(column.win.hidden, false);
  const diagonal = boot();
  [3, 6, 9, 12].forEach((index) => diagonal.board.children[index].click());
  assert.equal(diagonal.win.hidden, false);
  const other = boot();
  [0, 5, 10].forEach((index) => other.board.children[index].click());
  assert.equal(other.win.hidden, true);
  other.board.children[15].click();
  assert.equal(other.win.hidden, false);
  const before = texts(other.board).join('|');
  other.neu.click();
  assert.notEqual(texts(other.board).join('|'), before);
  assert.equal(other.win.hidden, true);
  assert.equal(other.fx.children.length, 0);
  other.board.children.forEach((button) => assert.equal(button.attrs['aria-pressed'], 'false'));
});

test('placeholder cards reset and a valid saved card stays', () => {
  const staleCells = Array.from({ length: 16 }, (_, i) => `Platzhalter: ${i}`);
  const stale = boot({
    saved: { 'pushpush.bingo.v1': JSON.stringify({ cells: staleCells, marks: Array(16).fill(true) }) },
  });
  const dealt = texts(stale.board);
  assert.equal(dealt.length, 16);
  assert.equal(dealt.some((label) => label.startsWith('Platzhalter')), false);
  dealt.forEach((label) => assert.ok(POOL.includes(label)));
  stale.board.children.forEach((button) => assert.equal(button.attrs['aria-pressed'], 'false'));

  const keptCells = POOL.slice(0, 16);
  const keptMarks = Array(16).fill(false);
  keptMarks[4] = true;
  const kept = boot({
    saved: { 'pushpush.bingo.v1': JSON.stringify({ cells: keptCells, marks: keptMarks }) },
  });
  assert.deepEqual(texts(kept.board), keptCells);
  assert.equal(kept.board.children[4].attrs['aria-pressed'], 'true');
  assert.equal(kept.board.children[0].attrs['aria-pressed'], 'false');
});

test('corrupt or blocked storage still deals a playable card', () => {
  const corrupt = boot({ saved: { 'pushpush.bingo.v1': '{nope' } });
  assert.equal(corrupt.board.children.length, 16);
  assert.equal(JSON.parse(corrupt.saved['pushpush.bingo.v1']).cells.length, 16);
  const blocked = boot({ throwGet: true, throwSet: true });
  assert.equal(blocked.board.children.length, 16);
  blocked.board.children[0].click();
  assert.equal(blocked.board.children[0].attrs['aria-pressed'], 'true');
});

test('reduced motion skips confetti', () => {
  const game = boot({ reduce: true });
  [0, 1, 2, 3].forEach((index) => game.board.children[index].click());
  assert.equal(game.win.hidden, false);
  assert.equal(game.fx.children.length, 0);
});
