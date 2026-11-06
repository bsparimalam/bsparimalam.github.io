// Module worker hosting Harper (offline WASM grammar checker). Loaded from our own origin so the
// service worker can serve the WASM binary from cache.
import { LocalLinter, Dialect } from '../../vendor/harper/index.js';
import { binary } from '../../vendor/harper/binary.js';

let linter = null;

function toUtf16Index(text) {
  // Harper spans are Unicode scalar (code point) indices; JS strings are UTF-16.
  if (!/[\uD800-\uDBFF]/.test(text)) return (i) => i;
  const map = [];
  let u = 0;
  for (const ch of text) { map.push(u); u += ch.length; }
  map.push(u);
  return (i) => map[i] ?? u;
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === 'init') {
      linter = new LocalLinter({ binary, dialect: Dialect[data.dialect] ?? Dialect.American });
      await linter.setup();
      if (data.words?.length) await linter.importWords(data.words);
      self.postMessage({ id, ok: true });
    } else if (type === 'words') {
      await linter.clearWords();
      if (data.words.length) await linter.importWords(data.words);
      self.postMessage({ id, ok: true });
    } else if (type === 'lint') {
      const results = [];
      for (const block of data.blocks) {
        const lints = await linter.lint(block.text, { language: 'plaintext' });
        const conv = toUtf16Index(block.text);
        for (const lint of lints) {
          const span = lint.span();
          results.push({
            blockId: block.id,
            start: conv(span.start),
            end: conv(span.end),
            message: lint.message(),
            kind: lint.lint_kind(),
            suggestions: lint.suggestions().map((s) => ({ kind: s.kind(), text: s.get_replacement_text() })),
          });
          lint.free?.();
        }
      }
      self.postMessage({ id, ok: true, results });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) });
  }
};
