/**
 * Filesystem Access & Archive I/O — Exclusively `.wa.zip` (v2.0.0)
 *
 * Canonical `.wa.zip` layout (flat archive root):
 *   content.md
 *   style.css
 *   images/...
 *   wa-reader.<version>.html   (live-fetching viewer, no embedded copy)
 *   syntax.md
 *
 * Uses showOpenFilePicker / showSaveFilePicker on Chromium for direct in-place
 * Save (Ctrl+S), with seamless <input type="file"> / Blob download fallback
 * on all other browsers. Backwards-compatible with legacy v1.x wrapped .wa.zip files.
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from '../vendor/fflate.esm.js';
import { buildReadHtml, WA_READER_FILENAME } from '../runtime/read-html-builder.js';
import { parseFrontMatter } from '../runtime/render.js';

let cachedSyntaxMd = null;

const RESERVED_WIN_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

// Chromium's File System Access API rejects compound extensions ('.wa.zip') in
// `accept`; use '.zip' here and supply the full `<stem>.wa.zip` via `suggestedName`.
const WA_ZIP_FILE_TYPES = [
  {
    description: 'Write Along Document (*.wa.zip)',
    accept: { 'application/zip': ['.zip'] },
  },
];

export function supportsOpenFilePicker() {
  return typeof window.showOpenFilePicker === 'function';
}

export function supportsSaveFilePicker() {
  return typeof window.showSaveFilePicker === 'function';
}

/**
 * Strip trailing .wa.zip, .zip, or .wa extension(s) to obtain a clean stem.
 */
export function stripWaExt(name) {
  return String(name || '')
    .trim()
    .replace(/(\.wa)?\.zip$/i, '')
    .replace(/(\.wa)+$/i, '')
    .trim();
}

/**
 * Sanitize any user-entered filename into a safe `<stem>.wa.zip` archive name.
 */
export function normalizeWaName(rawInput, fallback = 'untitled.wa.zip') {
  let stem = stripWaExt(rawInput);
  stem = stem
    .replace(/[\x00-\x1f/\\:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '');

  if (!stem) {
    const fbStem = stripWaExt(fallback) || 'untitled';
    return `${fbStem}.wa.zip`;
  }
  if (RESERVED_WIN_NAMES.has(stem.toLowerCase())) {
    stem = `${stem}-doc`;
  }
  if (stem.length > 100) {
    stem = stem.slice(0, 100).replace(/[.\-\s]+$/, '') || 'untitled';
  }
  return `${stem}.wa.zip`;
}

/**
 * Suggest a friendly filename stem for Save / Save As dialogs.
 * If the active document is still `untitled.wa.zip`, derive a kebab-case slug from YAML `title:`.
 */
export function suggestStemFromDoc(doc) {
  const currentStem = stripWaExt(doc?.name || 'untitled.wa.zip');
  if (currentStem && currentStem.toLowerCase() !== 'untitled') {
    return currentStem;
  }
  const { meta } = parseFrontMatter(doc?.content || '');
  const title = String(meta?.title || '').trim();
  if (title && title.toLowerCase() !== 'untitled document') {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 64);
    if (slug) return slug;
  }
  return currentStem || 'untitled';
}

export async function getCanonicalSyntaxMd() {
  if (cachedSyntaxMd !== null) return cachedSyntaxMd;
  try {
    const res = await fetch('./docs/syntax.md');
    if (res.ok) {
      cachedSyntaxMd = await res.text();
      return cachedSyntaxMd;
    }
  } catch (_err) {
    // offline fallback
  }
  return '# Write Along Syntax Guide\n\nEdit content.md (GFM) and style.css (CSS variables & selectors).\n';
}

/**
 * Build a per-document syntax.md that includes the canonical guide + this document's CSS variables.
 */
export async function buildDocumentSyntaxMd(styleCss) {
  const base = await getCanonicalSyntaxMd();
  const vars = [];
  const re = /(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi;
  let m;
  while ((m = re.exec(styleCss || '')) !== null) {
    vars.push(`| \`${m[1]}\` | \`${m[2].trim()}\` |`);
  }
  if (vars.length === 0) return base;
  return `${base}\n\n---\n\n## Template Variables in This Document\n\n| Variable | Current Value |\n|---|---|\n${vars.join('\n')}\n`;
}

function isSafeZipPath(p) {
  if (!p || p.startsWith('/') || p.includes('\0')) return false;
  const parts = p.split('/');
  if (parts.some((seg) => seg === '..')) return false;
  if (parts[0] === '__MACOSX' || parts[parts.length - 1] === '.DS_Store') return false;
  return true;
}

/**
 * Parse raw .wa.zip Uint8Array bytes into `{ name, content, css, images, handle: null }`.
 * Supports canonical v2.0.0 flat-root archives as well as legacy v1.x wrapped `<name>.wa/` archives.
 */
export function parseWaZipBytes(uint8Array, sourceFileName = 'untitled.wa.zip') {
  const rawEntries = unzipSync(uint8Array);

  const safeEntries = [];
  for (const [rawKey, data] of Object.entries(rawEntries)) {
    const norm = rawKey.replace(/\\/g, '/').replace(/^\.\//, '');
    if (norm.endsWith('/') || !isSafeZipPath(norm)) continue;
    safeEntries.push([norm, data]);
  }

  // Detect legacy single-root-directory wrapping (e.g. `my-doc.wa/content.md`)
  const hasRootContent = safeEntries.some(([k]) => k === 'content.md');
  let stripPrefix = '';
  if (!hasRootContent && safeEntries.length > 0) {
    const firstParts = new Set(safeEntries.map(([k]) => k.split('/')[0]));
    if (firstParts.size === 1 && safeEntries.every(([k]) => k.includes('/'))) {
      stripPrefix = `${[...firstParts][0]}/`;
    }
  }

  let content = '';
  let css = '';
  const images = new Map();

  for (const [rawKey, data] of safeEntries) {
    const key = stripPrefix ? rawKey.slice(stripPrefix.length) : rawKey;
    if (key === 'content.md') {
      content = strFromU8(data);
    } else if (key === 'style.css') {
      css = strFromU8(data);
    } else if (key.startsWith('images/') && key.length > 7) {
      const mime = guessMime(key);
      images.set(key, new Blob([data], { type: mime }));
    }
  }

  if (!content) {
    throw new Error('Archive does not contain a content.md file.');
  }

  return {
    name: normalizeWaName(sourceFileName),
    content,
    css,
    images,
    handle: null,
  };
}

/**
 * Open a `.wa.zip` archive via File System Access API (returns a FileSystemFileHandle for in-place Save).
 */
export async function openWaZipFile() {
  const [fileHandle] = await window.showOpenFilePicker({
    multiple: false,
    types: WA_ZIP_FILE_TYPES,
  });
  const file = await fileHandle.getFile();
  const buf = new Uint8Array(await file.arrayBuffer());
  const parsed = parseWaZipBytes(buf, file.name);
  return {
    ...parsed,
    handle: fileHandle,
  };
}

/**
 * Universal fallback: import a `.wa.zip` File from `<input type="file">` or drag-and-drop.
 */
export async function importFromZipFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  return parseWaZipBytes(buf, file.name);
}

/**
 * Package a document into a canonical flat-root `.wa.zip` Blob
 * (`content.md`, `style.css`, `images/*`, `wa-reader.<version>.html`, `syntax.md`).
 */
export async function createWaZipBlob(doc) {
  const { meta } = parseFrontMatter(doc.content);
  const readerHtml = buildReadHtml({
    title: meta.title || stripWaExt(doc.name) || 'Write Along Document',
  });
  const syntaxMd = await buildDocumentSyntaxMd(doc.css);

  const files = {
    'content.md': strToU8(doc.content),
    'style.css': strToU8(doc.css),
    [WA_READER_FILENAME]: strToU8(readerHtml),
    'syntax.md': strToU8(syntaxMd),
  };

  for (const [imgPath, blob] of doc.images.entries()) {
    const cleanPath = imgPath.startsWith('images/') ? imgPath : `images/${imgPath}`;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    files[cleanPath] = bytes;
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
}

/**
 * Write a `.wa.zip` archive atomically to an existing FileSystemFileHandle.
 */
export async function saveWaZipToHandle(fileHandle, doc) {
  const blob = await createWaZipBlob(doc);
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Save As via showSaveFilePicker() with suggested `.wa.zip` filename.
 */
export async function saveWaZipAsFile(doc, { chosenName = '' } = {}) {
  const suggestedName = normalizeWaName(chosenName || doc.name);
  const fileHandle = await window.showSaveFilePicker({
    suggestedName,
    types: WA_ZIP_FILE_TYPES,
  });
  const savedName = normalizeWaName(fileHandle.name, suggestedName);
  await saveWaZipToHandle(fileHandle, { ...doc, name: savedName });
  return {
    handle: fileHandle,
    name: savedName,
  };
}

/**
 * Insert image File(s) into doc.images with collision-safe names under images/.
 */
export function addImageBlobsToDoc(doc, files) {
  const insertedPaths = [];
  for (const file of files) {
    const rawName = (file.name || `image-${Date.now()}.png`)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-');
    const dot = rawName.lastIndexOf('.');
    const stem = (dot > 0 ? rawName.slice(0, dot) : rawName).replace(/^[.-]+|[.-]+$/g, '') || 'image';
    const ext = dot > 0 ? rawName.slice(dot) : '.png';

    let candidate = `images/${stem}${ext}`;
    let idx = 2;
    while (doc.images.has(candidate)) {
      candidate = `images/${stem}-${idx++}${ext}`;
    }
    doc.images.set(candidate, file);
    insertedPaths.push(candidate);
  }
  return insertedPaths;
}

/**
 * Sanitize an image filename (preserving extension if omitted) into `images/<clean>`.
 */
export function sanitizeImageFilename(rawInput, fallbackExt = '.png') {
  let clean = String(rawInput || '').trim().replace(/^images\//i, '');
  clean = clean.replace(/[\x00-\x1f/\\:*?"<>|]+/g, '-').replace(/\s+/g, '-').replace(/-{2,}/g, '-');
  clean = clean.replace(/^[.\-]+|[.\-]+$/g, '');
  if (!clean) return null;
  if (!/\.[a-z0-9]{2,5}$/i.test(clean)) {
    clean = `${clean}${fallbackExt.startsWith('.') ? fallbackExt : `.${fallbackExt}`}`;
  }
  return `images/${clean}`;
}

function guessMime(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  };
  return map[ext] || 'application/octet-stream';
}
