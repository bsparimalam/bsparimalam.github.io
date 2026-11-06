// Opening, saving and exporting documents. Everything happens locally in the browser:
// the File System Access API when available, plain downloads/uploads otherwise.
import { createZip, readZip } from './zip.js';
import { cleanHtmlViaMarkdown } from './markdown.js';

export const fsAccess = 'showOpenFilePicker' in window;

const ZIP_TYPES = [{ description: 'Write Along document', accept: { 'application/zip': ['.zip'] } }];
const OPEN_TYPES = [{
  description: 'Documents',
  accept: { 'application/zip': ['.zip'], 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.txt'], 'text/html': ['.html', '.htm'] },
}];

const IMAGE_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' };

export function baseName(name) {
  return (name || 'Untitled').replace(/\.(zip|md|markdown|txt|html?)$/i, '');
}

/** Reads a document file into {name, md, css, images: [[path, Blob]]}. */
export async function readDocumentFile(file) {
  const name = baseName(file.name);
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip')) {
    const entries = await readZip(file);
    // Accept archives that wrap everything in a single top-level folder.
    const names = [...entries.keys()];
    const mdName = names.find((n) => /(^|\/)text\.md$/i.test(n)) || names.find((n) => /\.md$/i.test(n) && !n.startsWith('__MACOSX'));
    if (!mdName) throw new Error('This zip has no text.md inside, so it is not a Write Along document.');
    const root = mdName.includes('/') ? mdName.slice(0, mdName.lastIndexOf('/') + 1) : '';
    const dec = new TextDecoder();
    const md = dec.decode(entries.get(mdName));
    const cssName = names.find((n) => n.toLowerCase() === (root + 'template.css').toLowerCase()) || names.find((n) => /\.css$/i.test(n));
    const css = cssName ? dec.decode(entries.get(cssName)) : null;
    const images = [];
    for (const [n, bytes] of entries) {
      if (!n.startsWith(root) || n === mdName || n === cssName || n.startsWith('__MACOSX')) continue;
      const ext = n.split('.').pop().toLowerCase();
      if (!IMAGE_MIME[ext]) continue;
      images.push([n.slice(root.length), new Blob([bytes], { type: IMAGE_MIME[ext] })]);
    }
    return { name, md, css, images };
  }
  const text = await file.text();
  if (/\.html?$/i.test(lower)) return { name, md: cleanHtmlViaMarkdown(text, document), css: null, images: [] };
  return { name, md: text, css: null, images: [] };
}

export async function buildZip({ md, css, images }) {
  return createZip([
    { name: 'text.md', data: md },
    { name: 'template.css', data: css },
    ...images.map(([path, blob]) => ({ name: path, data: blob })),
  ]);
}

/** Shows an open dialog. Resolves to {file, handle} or null when cancelled. */
export async function pickFile() {
  if (fsAccess) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: OPEN_TYPES, excludeAcceptAllOption: false, id: 'write-along' });
      return { file: await handle.getFile(), handle: handle.name.toLowerCase().endsWith('.zip') ? handle : null };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.zip,.md,.markdown,.txt,.html,.htm' });
    input.addEventListener('change', () => resolve(input.files[0] ? { file: input.files[0], handle: null } : null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export function downloadBlob(blob, filename) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

/**
 * Saves a blob. With a handle, writes in place; otherwise asks where (File System Access) or downloads.
 * @returns {Promise<FileSystemFileHandle|null|false>} the handle written to, null for downloads, false if cancelled
 */
export async function saveBlob(blob, suggestedName, handle, types = ZIP_TYPES) {
  if (handle) {
    try {
      if ((await handle.queryPermission?.({ mode: 'readwrite' })) !== 'granted' && (await handle.requestPermission?.({ mode: 'readwrite' })) !== 'granted') {
        throw new Error('Permission to write the file was denied.');
      }
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return handle;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      throw err;
    }
  }
  if ('showSaveFilePicker' in window) {
    try {
      const h = await window.showSaveFilePicker({ suggestedName, types, id: 'write-along' });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return h;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      throw err;
    }
  }
  downloadBlob(blob, suggestedName);
  return null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Builds @font-face rules (as data URLs) for the bundled fonts that the CSS actually uses. */
async function embeddedFonts(css) {
  const base = new URL('../fonts/', import.meta.url);
  const fontsCss = await (await fetch(new URL('fonts.css', base))).text();
  const rules = fontsCss.match(/@font-face\s*{[^}]*}/g) || [];
  const out = [];
  for (const rule of rules) {
    const family = /font-family:\s*"([^"]+)"/.exec(rule)?.[1];
    if (!family || !css.includes(family)) continue;
    const file = /url\("([^"]+)"\)/.exec(rule)?.[1];
    const blob = await (await fetch(new URL(file, base))).blob();
    out.push(rule.replace(/url\("[^"]+"\)/, `url("${await blobToDataUrl(blob)}")`));
  }
  return out.join('\n');
}

/** Standalone HTML file: template, page chrome, fonts and images all inlined. */
export async function buildHtml({ title, bodyHtml, css, lang, images, embedFonts = true }) {
  const pageCss = await (await fetch(new URL('../css/page.css', import.meta.url))).text();
  const tpl = document.createElement('template');
  tpl.innerHTML = bodyHtml;
  const c = tpl.content;
  c.querySelectorAll('[contenteditable]').forEach((e) => e.removeAttribute('contenteditable'));
  c.querySelectorAll('.wa-selected').forEach((e) => e.classList.remove('wa-selected'));
  c.querySelectorAll('[class=""]').forEach((e) => e.removeAttribute('class'));
  c.querySelectorAll('input[type=checkbox]').forEach((e) => e.setAttribute('disabled', ''));
  for (const img of c.querySelectorAll('img')) {
    const path = img.dataset.src;
    const blob = path && images.get(path);
    if (blob) img.src = await blobToDataUrl(blob);
    img.removeAttribute('data-src');
  }
  const div = document.createElement('div');
  div.append(c);
  const fonts = embedFonts ? await embeddedFonts(css) : '';
  const esc = (s) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Write Along">
<title>${esc(title)}</title>
<style>
${fonts}
</style>
<style>
${pageCss}
</style>
<style>
${css}
</style>
</head>
<body>
${div.innerHTML}
</body>
</html>
`;
}
