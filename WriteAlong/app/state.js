/**
 * Central Document State + IndexedDB Crash-Recovery Autosave
 */
import { normalizeWaName } from './fs.js';
import { WA_READER_FILENAME } from '../runtime/render.js';

const DB_NAME = 'write-along-autosave';
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current';

export function buildStarterContent(title = 'Untitled Document') {
  const safeTitle = String(title || 'Untitled Document').replace(/\r?\n/g, ' ').trim() || 'Untitled Document';
  return `---
title: ${safeTitle}
subtitle: Drafted in Write Along
author: Your Name
date: ${new Date().toISOString().slice(0, 10)}
abstract: Replace this summary with a concise overview of your document. Open Templates → Gallery to explore over 100 publication-ready designs.
---

## Introduction

Welcome to **Write Along**. Edit \`content.md\` on the left and watch your typeset page update live on the right. Switch to the \`style.css\` tab to customize fonts, colors, page size, and spacing, or manage local assets in the \`images/\` tab.

> [!TIP]
> Press \`Ctrl+E\` to toggle between **Edit Mode** and **Read Mode**, or click **Templates** to preview 110+ styles and apply any style directly to your writing.

### Quick Checklist

- [x] Create a new \`.wa.zip\` document
- [ ] Apply a template style from the Gallery
- [ ] Save your \`.wa.zip\` archive (with live \`${WA_READER_FILENAME}\`)
`;
}

export const DEFAULT_CONTENT = buildStarterContent('Untitled Document');

export const DEFAULT_CSS = `/* ==========================================================================
   Write Along — Default Clean Serif Style
   Edit the variables below to restyle the entire document.
   ========================================================================== */

:root {
  --page-size: Letter;
  --page-margin: 1in 1in 1in 1in;

  --page-background: #ffffff;
  --text-color: #1c1f24;
  --muted-color: #5c6470;
  --accent-color: #7a1f2b;
  --accent-secondary: #1f4e79;
  --surface-color: #f6f7f9;
  --border-color: #d6dce5;

  --body-font: "Source Serif 4", Georgia, serif;
  --heading-font: "EB Garamond", Georgia, serif;
  --code-font: "JetBrains Mono", monospace;

  --body-size: 11pt;
  --line-height: 1.58;
  --scale: 1.25;
  --paragraph-spacing: 0.85em;
  --paragraph-indent: 0;
  --radius: 4px;
}

@page {
  size: Letter;
  margin: 1in 1in 1in 1in;
  @bottom-center {
    content: counter(page);
    font-family: "Source Serif 4", serif;
    font-size: 9pt;
    color: #5c6470;
  }
}

.title-block {
  border-bottom: 1.5px solid var(--accent-color);
  padding-bottom: 1.1em;
}

h2 {
  color: var(--accent-color);
}
`;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAutosaveDraft(doc) {
  try {
    const db = await openDb();
    const imagesArr = [];
    for (const [imgPath, blob] of doc.images.entries()) {
      imagesArr.push([imgPath, blob]);
    }
    const payload = {
      name: doc.name,
      content: doc.content,
      css: doc.css,
      images: imagesArr,
      updatedAt: Date.now(),
    };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, DRAFT_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (_err) {
    // IndexedDB unavailable in private browsing; ignore gracefully
  }
}

export async function loadAutosaveDraft() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (_err) {
    return null;
  }
}

export function createAppState() {
  const listeners = new Set();

  let initialSync = true;
  try {
    const stored = localStorage.getItem('wa-scroll-sync');
    if (stored === 'false') initialSync = false;
  } catch (_e) {
    // ignore
  }

  const state = {
    doc: {
      name: 'untitled.wa.zip',
      content: DEFAULT_CONTENT,
      css: DEFAULT_CSS,
      images: new Map(), // Map<'images/foo.png', Blob>
      handle: null,      // FileSystemFileHandle | null
    },
    dirty: false,
    mode: 'edit',         // 'edit' | 'read'
    activeTab: 'content', // 'content' | 'css' | 'images'
    zoom: 1.0,
    pageGrid: false,
    syncScroll: initialSync,
    viewingGuide: false,
    previousStyleCss: null,
    previousStyleImages: null,
  };

  function emit(changeType = 'all') {
    for (const fn of listeners) fn(state, changeType);
  }

  return {
    state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit,
    setName(rawName, { markDirty = false, detachHandle = false } = {}) {
      const normalized = normalizeWaName(rawName, state.doc.name || 'untitled.wa.zip');
      const changed = normalized !== state.doc.name;
      const hadHandle = Boolean(state.doc.handle);
      state.doc.name = normalized;
      let detached = false;
      if (changed && detachHandle && hadHandle) {
        state.doc.handle = null;
        detached = true;
      }
      if (changed && markDirty) state.dirty = true;
      emit('name');
      return { name: normalized, changed, detached };
    },
    setContent(text, { markDirty = true } = {}) {
      state.doc.content = text;
      if (markDirty) state.dirty = true;
      emit('content');
    },
    setCss(text, { markDirty = true } = {}) {
      state.doc.css = text;
      if (markDirty) state.dirty = true;
      emit('css');
    },
    setSyncScroll(enabled) {
      state.syncScroll = Boolean(enabled);
      try {
        localStorage.setItem('wa-scroll-sync', String(state.syncScroll));
      } catch (_e) {
        // ignore
      }
      emit('sync-scroll');
    },
    addImages(entries) {
      for (const [imgPath, blob] of entries) {
        state.doc.images.set(imgPath, blob);
      }
      state.dirty = true;
      emit('images');
    },
    renameImage(oldPath, newPath, { nextContent = null, nextCss = null } = {}) {
      if (!state.doc.images.has(oldPath) || oldPath === newPath) return false;
      const blob = state.doc.images.get(oldPath);
      // Preserve order when renaming key
      const rebuilt = new Map();
      for (const [k, v] of state.doc.images.entries()) {
        rebuilt.set(k === oldPath ? newPath : k, k === oldPath ? blob : v);
      }
      state.doc.images = rebuilt;
      if (nextContent !== null) state.doc.content = nextContent;
      if (nextCss !== null) state.doc.css = nextCss;
      state.dirty = true;
      emit('images');
      return true;
    },
    replaceImage(imgPath, newBlob) {
      if (!state.doc.images.has(imgPath)) return false;
      state.doc.images.set(imgPath, newBlob);
      state.dirty = true;
      emit('images');
      return true;
    },
    deleteImage(imgPath) {
      if (!state.doc.images.has(imgPath)) return null;
      const blob = state.doc.images.get(imgPath);
      state.doc.images.delete(imgPath);
      state.dirty = true;
      emit('images');
      return blob;
    },
    loadDocument({ name, content, css, images = new Map(), handle = null, dirty = false }) {
      state.doc = {
        name: normalizeWaName(name || 'untitled.wa.zip'),
        content,
        css,
        images,
        handle,
      };
      state.dirty = dirty;
      state.viewingGuide = false;
      emit('document');
    },
    applyTemplateStyle(newCss, templateImages = new Map()) {
      state.previousStyleCss = state.doc.css;
      state.previousStyleImages = new Map(state.doc.images);
      state.doc.css = newCss;
      for (const [k, v] of templateImages.entries()) {
        if (!state.doc.images.has(k)) {
          state.doc.images.set(k, v);
        }
      }
      state.dirty = true;
      state.viewingGuide = false;
      emit('style-applied');
    },
    revertTemplateStyle() {
      if (state.previousStyleCss === null) return false;
      state.doc.css = state.previousStyleCss;
      if (state.previousStyleImages) {
        state.doc.images = state.previousStyleImages;
      }
      state.previousStyleCss = null;
      state.previousStyleImages = null;
      state.dirty = true;
      emit('style-applied');
      return true;
    },
  };
}
