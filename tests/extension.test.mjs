import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = path.join(ROOT, 'wechat-moments-swipe.user.js');

test('Tampermonkey userscript metadata declares WeChat web matches and GM grants', () => {
  const src = fs.readFileSync(SCRIPT_PATH, 'utf8');
  assert.match(src, /\/\/ ==UserScript==/);
  assert.match(src, /@match\s+https:\/\/wx\.qq\.com\/\*/);
  assert.match(src, /@match\s+https:\/\/web\.wechat\.com\/\*/);
  assert.match(src, /@grant\s+GM_addStyle/);
  assert.match(src, /@run-at\s+document-end/);
});

test('swipe navigation skips dismissed moments without deleting friend items and toggles likes', () => {
  const src = fs.readFileSync(SCRIPT_PATH, 'utf8');
  const instrumented = src.replace(
    /\}\)\(\);\s*$/,
    'globalThis.__swipe = { CONFIG, state, goToSlide, goNext, goPrev, skipCurrent, toggleLike };\n})();'
  );

  const elementsById = new Map();
  const makeEl = (id = '') => ({
    id,
    className: '',
    innerHTML: '',
    textContent: '',
    title: '',
    style: {},
    dataset: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        const on = force !== undefined ? force : !this._set.has(c);
        if (on) this._set.add(c);
        else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); },
    },
    appendChild() {},
    addEventListener() {},
    querySelector: () => ({ innerHTML: '', textContent: '', classList: { contains: () => false }, click() {} }),
  });

  const sandbox = {
    window: { innerHeight: 800, addEventListener() {} },
    document: {
      readyState: 'complete',
      body: makeEl('body'),
      createElement: () => makeEl(),
      getElementById: (id) => {
        if (!elementsById.has(id)) elementsById.set(id, makeEl(id));
        return elementsById.get(id);
      },
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      addEventListener() {},
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    GM_addStyle: () => {},
    GM_getValue: (_k, def) => def,
    GM_setValue: () => {},
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    alert: () => {},
    Set,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(instrumented, sandbox, { filename: 'wechat-moments-swipe.user.js' });

  const { state, goToSlide, goNext, skipCurrent, toggleLike } = sandbox.__swipe;
  state.moments = [
    { id: 'm1', nickname: 'A', isLiked: false },
    { id: 'm2', nickname: 'B', isLiked: false },
    { id: 'm3', nickname: 'C', isLiked: false },
  ];

  goToSlide(0);
  assert.equal(state.currentIndex, 0);

  goNext();
  assert.equal(state.currentIndex, 1);

  // Skip m2 -> marks m2 in skippedIds and advances automatically to m3
  skipCurrent();
  assert.equal(state.skippedIds.has('m2'), true);
  assert.equal(state.currentIndex, 2);

  // Navigating to index 1 skips over m2 and lands on m3
  goToSlide(1);
  assert.equal(state.currentIndex, 2);

  toggleLike('m3');
  assert.equal(state.moments[2].isLiked, true);
});
