/**
 * Filesystem Access (.wa Directory Open/Save) + Zip / Fallback Support
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from '../vendor/fflate.esm.js';
import { buildReadHtml } from '../runtime/read-html-builder.js';
import { parseFrontMatter } from '../runtime/render.js';

let cachedSyntaxMd = null;

export function supportsDirectoryPicker() {
  return typeof window.showDirectoryPicker === 'function';
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

/**
 * Open a .wa folder via File System Access API.
 */
export async function openWaDirectory() {
  const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  let content = '';
  let css = '';
  const images = new Map();

  try {
    const contentHandle = await dirHandle.getFileHandle('content.md');
    content = await (await contentHandle.getFile()).text();
  } catch (_e) {
    throw new Error('Selected folder does not contain content.md');
  }

  try {
    const cssHandle = await dirHandle.getFileHandle('style.css');
    css = await (await cssHandle.getFile()).text();
  } catch (_e) {
    css = '';
  }

  try {
    const imgDir = await dirHandle.getDirectoryHandle('images');
    for await (const [entryName, entryHandle] of imgDir.entries()) {
      if (entryHandle.kind === 'file') {
        const file = await entryHandle.getFile();
        images.set(`images/${entryName}`, file);
      }
    }
  } catch (_e) {
    // images/ may not exist yet
  }

  return {
    name: dirHandle.name.endsWith('.wa') ? dirHandle.name : `${dirHandle.name}.wa`,
    content,
    css,
    images,
    handle: dirHandle,
  };
}

/**
 * Write all .wa files back to a FileSystemDirectoryHandle.
 */
export async function saveWaToHandle(dirHandle, doc) {
  const writeText = async (targetDir, filename, text) => {
    const fh = await targetDir.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
  };

  const { meta } = parseFrontMatter(doc.content);
  const readHtml = buildReadHtml({
    title: meta.title || doc.name.replace(/\.wa$/, ''),
    content: doc.content,
    style: doc.css,
  });
  const syntaxMd = await buildDocumentSyntaxMd(doc.css);

  await writeText(dirHandle, 'content.md', doc.content);
  await writeText(dirHandle, 'style.css', doc.css);
  await writeText(dirHandle, 'read.html', readHtml);
  await writeText(dirHandle, 'syntax.md', syntaxMd);

  const imgDir = await dirHandle.getDirectoryHandle('images', { create: true });
  for (const [imgPath, blob] of doc.images.entries()) {
    const fname = imgPath.replace(/^images\//, '');
    const fh = await imgDir.getFileHandle(fname, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
  }
}

/**
 * Save As via showDirectoryPicker() (creates a .wa subfolder if the picked folder isn't already .wa).
 */
export async function saveWaAsDirectory(doc) {
  const picked = await window.showDirectoryPicker({ mode: 'readwrite' });
  let targetDir = picked;
  if (!picked.name.endsWith('.wa')) {
    const folderName = doc.name.endsWith('.wa') ? doc.name : `${doc.name}.wa`;
    targetDir = await picked.getDirectoryHandle(folderName, { create: true });
  }
  await saveWaToHandle(targetDir, doc);
  return {
    handle: targetDir,
    name: targetDir.name,
  };
}

/**
 * Fallback: import from <input type="file" webkitdirectory>
 */
export async function importFromFileList(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return null;

  let folderName = 'imported.wa';
  let content = '';
  let css = '';
  const images = new Map();

  for (const f of files) {
    const rel = f.webkitRelativePath || f.name;
    const parts = rel.split('/');
    if (parts.length > 1) folderName = parts[0];
    const subPath = parts.length > 1 ? parts.slice(1).join('/') : f.name;

    if (subPath === 'content.md') {
      content = await f.text();
    } else if (subPath === 'style.css') {
      css = await f.text();
    } else if (subPath.startsWith('images/') && subPath.length > 7) {
      images.set(subPath, f);
    }
  }

  if (!content) {
    throw new Error('Could not find content.md in the selected directory.');
  }

  return {
    name: folderName.endsWith('.wa') ? folderName : `${folderName}.wa`,
    content,
    css,
    images,
    handle: null,
  };
}

/**
 * Import a .wa.zip archive using fflate.
 */
export async function importFromZipFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(buf);
  let folderName = file.name.replace(/(\.wa)?\.zip$/i, '') + '.wa';
  let content = '';
  let css = '';
  const images = new Map();

  const keys = Object.keys(entries);
  // Detect optional single top-level folder prefix
  const firstParts = new Set(keys.map((k) => k.split('/')[0]));
  const stripPrefix = firstParts.size === 1 && keys.every((k) => k.includes('/'))
    ? `${[...firstParts][0]}/`
    : '';
  if (stripPrefix) {
    const base = stripPrefix.slice(0, -1);
    folderName = base.endsWith('.wa') ? base : `${base}.wa`;
  }

  for (const [rawKey, data] of Object.entries(entries)) {
    if (rawKey.endsWith('/')) continue;
    const key = stripPrefix ? rawKey.slice(stripPrefix.length) : rawKey;
    if (key === 'content.md') {
      content = strFromU8(data);
    } else if (key === 'style.css') {
      css = strFromU8(data);
    } else if (key.startsWith('images/')) {
      const mime = guessMime(key);
      images.set(key, new Blob([data], { type: mime }));
    }
  }

  if (!content) {
    throw new Error('Archive does not contain a content.md file.');
  }

  return { name: folderName, content, css, images, handle: null };
}

/**
 * Package a document into a .wa.zip Blob.
 */
export async function createWaZipBlob(doc) {
  const root = doc.name.endsWith('.wa') ? doc.name : `${doc.name}.wa`;
  const { meta } = parseFrontMatter(doc.content);
  const readHtml = buildReadHtml({
    title: meta.title || root.replace(/\.wa$/, ''),
    content: doc.content,
    style: doc.css,
  });
  const syntaxMd = await buildDocumentSyntaxMd(doc.css);

  const files = {
    [`${root}/content.md`]: strToU8(doc.content),
    [`${root}/style.css`]: strToU8(doc.css),
    [`${root}/read.html`]: strToU8(readHtml),
    [`${root}/syntax.md`]: strToU8(syntaxMd),
  };

  for (const [imgPath, blob] of doc.images.entries()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    files[`${root}/${imgPath}`] = bytes;
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
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
    const stem = dot > 0 ? rawName.slice(0, dot) : rawName;
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

function guessMime(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}
