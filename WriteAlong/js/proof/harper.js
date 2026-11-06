// Main-thread client for the Harper worker.
let worker = null;
let ready = null;
let seq = 0;
const pending = new Map();
let currentDialect = null;

function call(msg) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker.postMessage({ ...msg, id });
  });
}

export function harperLoaded() {
  return !!ready;
}

export function initHarper(dialect = 'American', words = []) {
  if (ready && currentDialect === dialect) return ready;
  worker?.terminate();
  currentDialect = dialect;
  worker = new Worker(new URL('./harper-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    data.ok ? p.resolve(data) : p.reject(new Error(data.error));
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'Harper worker failed to start'));
    pending.clear();
    ready = null;
  };
  ready = call({ type: 'init', dialect, words }).catch((err) => { ready = null; throw err; });
  return ready;
}

export async function setHarperWords(words) {
  if (!ready) return;
  await ready;
  await call({ type: 'words', words });
}

const KIND_MAP = { Spelling: 'spelling', Typo: 'spelling', Capitalization: 'capitalization', Punctuation: 'punctuation',
  Style: 'style', Readability: 'readability', Redundancy: 'style', Repetition: 'grammar', WordChoice: 'word-choice',
  Enhancement: 'style', Formatting: 'punctuation' };

/** @returns {Promise<object[]>} issues in the common format */
export async function harperCheck(blocks, dialect, words) {
  await initHarper(dialect, words);
  const { results } = await call({ type: 'lint', blocks: blocks.filter((b) => b.kind !== 'code') });
  const textById = new Map(blocks.map((b) => [b.id, b.text]));
  return results.map((r) => {
    const original = textById.get(r.blockId).slice(r.start, r.end);
    const replacements = r.suggestions.map((s) => (s.kind === 2 ? original + s.text : s.kind === 1 ? '' : s.text));
    return { blockId: r.blockId, start: r.start, end: r.end, message: r.message, replacements: replacements.filter((r, i) => replacements.findIndex((x) => x.trim() === r.trim()) === i).slice(0, 6),
      kind: KIND_MAP[r.kind] || 'grammar', rule: 'harper:' + r.kind, source: 'harper' };
  });
}
