import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const vendorDir = path.join(root, 'vendor');
fs.mkdirSync(vendorDir, { recursive: true });

// 1. Bundle marked + dompurify as standalone ESM and IIFE (IIFE for inline read.html)
await esbuild.build({
  entryPoints: [path.join(root, 'node_modules/marked/lib/marked.esm.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: path.join(vendorDir, 'marked.esm.js'),
});

await esbuild.build({
  entryPoints: [path.join(root, 'node_modules/dompurify/dist/purify.es.mjs')],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: path.join(vendorDir, 'dompurify.esm.js'),
});

// 2. Bundle fflate for zip import/export
await esbuild.build({
  entryPoints: [path.join(root, 'node_modules/fflate/esm/browser.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: path.join(vendorDir, 'fflate.esm.js'),
});

// 3. Bundle CodeMirror 6 single-file ESM for markdown + css editing
const cmEntry = `
export { EditorState, Compartment } from '@codemirror/state';
export {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars
} from '@codemirror/view';
export {
  defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, selectAll
} from '@codemirror/commands';
export {
  defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,
  foldGutter, foldKeymap, HighlightStyle
} from '@codemirror/language';
export { search, searchKeymap, openSearchPanel, highlightSelectionMatches } from '@codemirror/search';
export { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
export { markdown, markdownLanguage } from '@codemirror/lang-markdown';
export { css } from '@codemirror/lang-css';
export { oneDark } from '@codemirror/theme-one-dark';
export { tags } from '@lezer/highlight';
`;

await esbuild.build({
  stdin: {
    contents: cmEntry,
    resolveDir: root,
    sourcefile: 'cm-entry.js',
  },
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: path.join(vendorDir, 'codemirror.esm.js'),
});

// 4. Write vendor manifest with versions
const pkgNames = ['marked', 'dompurify', 'fflate', '@codemirror/view', '@codemirror/state'];
const versions = {};
for (const name of pkgNames) {
  const p = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
  versions[name] = p.version;
}
fs.writeFileSync(path.join(vendorDir, 'manifest.json'), JSON.stringify(versions, null, 2) + '\n');

for (const f of ['marked.esm.js', 'dompurify.esm.js', 'fflate.esm.js', 'codemirror.esm.js']) {
  const sz = fs.statSync(path.join(vendorDir, f)).size;
  console.log(`vendor/${f}: ${(sz / 1024).toFixed(1)} KB`);
}
