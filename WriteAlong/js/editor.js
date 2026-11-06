// WYSIWYG editor: a contenteditable document inside an iframe, styled by the document's own template.css.
// Formatting goes through execCommand wherever possible so the browser's native undo stack keeps working.

import { splitFrontMatter, serializeFrontMatter, renderMarkdownInto, renderTitleBlock, domToMarkdown,
  cleanHtmlViaMarkdown, refreshToc, hasMeta } from './markdown.js';

const APP_BASE = new URL('../', import.meta.url).href;

const EDITOR_CSS = `
body { outline: none; }
body.wa-empty > p:only-of-type::before, body.wa-empty > p:first-of-type:last-child::before {
  content: "Start writing…"; color: rgb(0 0 0 / .35); pointer-events: none; position: absolute;
}
::highlight(wa-spelling) { text-decoration: underline wavy #e5484d; text-decoration-skip-ink: none; text-underline-offset: 3px; }
::highlight(wa-grammar) { text-decoration: underline wavy #2f6fed; text-decoration-skip-ink: none; text-underline-offset: 3px; }
::highlight(wa-style) { text-decoration: underline wavy #a35ce0; text-decoration-thickness: 1px; text-decoration-skip-ink: none; text-underline-offset: 3px; }
::highlight(wa-active) { background-color: rgb(255 196 0 / .38); }
::highlight(wa-find) { background-color: rgb(255 140 0 / .30); }
#title-block-header { cursor: pointer; border-radius: 4px; transition: box-shadow .15s; }
#title-block-header:hover { box-shadow: 0 0 0 6px rgb(47 111 237 / .08), 0 0 0 7px rgb(47 111 237 / .25); }
nav.toc { cursor: default; user-select: none; }
img { cursor: pointer; }
img.wa-selected { outline: 3px solid rgb(47 111 237 / .7); outline-offset: 2px; }
li.task-list-item > input[type=checkbox], li.task-list-item > p > input[type=checkbox] { cursor: pointer; }
@media screen {
  html.wa-ui-dark { background: #1c1e23 !important; }
  html.wa-paper-dim body { --wa-paper-filter: brightness(.72) contrast(1.05); }
  html.wa-paper-dark body { --wa-paper-filter: invert(.88) hue-rotate(180deg); }
  html.wa-paper-dark body img { filter: invert(1) hue-rotate(180deg); }
  #wa-page-labels { position: absolute; left: 0; top: 0; width: 100%; pointer-events: none; user-select: none; }
  #wa-page-labels span { position: absolute; font: 11px/1 system-ui, sans-serif; color: rgb(0 0 0 / .42); transform: translateY(-50%); }
  html.wa-ui-dark #wa-page-labels span { color: rgb(255 255 255 / .45); }
}
@media print {
  #wa-page-labels { display: none; }
  ::highlight(wa-spelling), ::highlight(wa-grammar), ::highlight(wa-style), ::highlight(wa-active), ::highlight(wa-find) { text-decoration: none; background: none; }
  #title-block-header:hover { box-shadow: none; }
}
`;

const BLOCK_SEL = 'p, h1, h2, h3, h4, h5, h6, li, td, th, figcaption, pre, blockquote, div, dt, dd';
const NESTABLE_BLOCKS = new Set(['UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV', 'FIGURE', 'HR', 'NAV']);
const TRAILING_NEEDS_P = new Set(['TABLE', 'FIGURE', 'PRE', 'HR', 'NAV', 'HEADER', 'BLOCKQUOTE', 'UL', 'OL', 'DIV']);

/**
 * Rewrites a template so that, on screen, it behaves like it will when printed: @media print rules apply,
 * screen-only rules are dropped, and page breaks become breaks between the page-view columns.
 */
export function cssForPageView(css) {
  let out = '';
  let i = 0;
  const re = /@media\s+([^{;]+)\{/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    if (m.index < i) continue;
    let depth = 1;
    let j = m.index + m[0].length;
    while (j < css.length && depth) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const cond = m[1].trim().toLowerCase();
    const inner = css.slice(m.index + m[0].length, j - 1);
    out += css.slice(i, m.index);
    if (/^print\b/.test(cond)) out += inner.replace(/--page-background\s*:/g, '--wa-print-page-background:');
    else if (!/^(only\s+)?screen\b/.test(cond)) out += css.slice(m.index, j);
    i = j;
    re.lastIndex = j;
  }
  out += css.slice(i);
  return out
    .replace(/\b(break-(?:before|after))\s*:\s*(page|left|right|recto|verso)\b/g, '$1: column')
    .replace(/\bpage-break-(before|after)\s*:\s*always\b/g, 'break-$1: column');
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function safeName(name) {
  return name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'image';
}

export class ImageStore {
  constructor() { this.map = new Map(); }
  url(path) { return this.map.get(path)?.url || null; }
  has(path) { return this.map.has(path); }
  set(path, blob) {
    const old = this.map.get(path);
    if (old) URL.revokeObjectURL(old.url);
    this.map.set(path, { blob, url: URL.createObjectURL(blob) });
  }
  /** Stores a new image and returns its zip path (images/<name>). */
  add(blob, name) {
    const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    let base = safeName(name || `image-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}`);
    if (!/\.\w{2,4}$/.test(base)) base += '.' + ext;
    let path = `images/${base}`;
    for (let i = 2; this.map.has(path); i++) path = `images/${base.replace(/(\.\w+)$/, `-${i}$1`)}`;
    this.set(path, blob);
    return path;
  }
  clear() {
    for (const { url } of this.map.values()) URL.revokeObjectURL(url);
    this.map.clear();
  }
  entries() { return [...this.map.entries()]; }
}

export class Editor extends EventTarget {
  constructor(iframe) {
    super();
    this.iframe = iframe;
    this.images = new ImageStore();
    this.meta = splitFrontMatter('').meta;
    this.blockIds = new WeakMap();
    this.blockSeq = 0;
    this.css = '';
    this.paged = false;
    this.userZoom = 1;
  }

  get doc() { return this.iframe.contentDocument; }
  get win() { return this.iframe.contentWindow; }
  get body() { return this.doc.body; }

  async init() {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${APP_BASE}fonts/fonts.css">
<link rel="stylesheet" href="${APP_BASE}css/page.css">
<style id="wa-template"></style>
<style id="wa-editor">${EDITOR_CSS}</style>
</head><body contenteditable="true" spellcheck="true"><p><br></p></body></html>`;
    await new Promise((resolve) => {
      this.iframe.addEventListener('load', resolve, { once: true });
      this.iframe.srcdoc = html;
    });
    const doc = this.doc;
    doc.execCommand('defaultParagraphSeparator', false, 'p');
    doc.execCommand('styleWithCSS', false, false);
    this.bindEvents();
  }

  /* ------------------------------------------------------------ content */

  load({ md = '', css = '' }) {
    const { meta, body } = splitFrontMatter(md);
    this.meta = meta;
    renderMarkdownInto(body, this.body, (p) => this.images.url(p));
    this.renderTitle();
    this.setCss(css);
    this.normalize();
    refreshToc(this.body);
    this.win.scrollTo(0, 0);
    this.emitChange(true);
    this.schedulePages();
  }

  setCss(css) {
    this.css = css;
    this.doc.getElementById('wa-template').textContent = this.paged ? cssForPageView(css) : css;
    this.schedulePages();
  }

  /* ------------------------------------------------------------ page view & appearance */

  /** Shows the document as printed pages (or as one continuous sheet when off). */
  setPageView(on) {
    this.paged = on;
    this.doc.documentElement.classList.toggle('wa-paged', on);
    this.setCss(this.css);
    this.setZoom(this.userZoom);
  }

  /** mode: light | dim | dark. uiDark darkens the desk around the page. */
  setPaper(mode, uiDark) {
    const cl = this.doc.documentElement.classList;
    cl.toggle('wa-paper-dim', mode === 'dim');
    cl.toggle('wa-paper-dark', mode === 'dark');
    cl.toggle('wa-ui-dark', uiDark);
  }

  pagedSupported() {
    return !!this.win.CSS?.supports('column-wrap', 'wrap');
  }

  /** Page geometry in (unzoomed) CSS pixels, read from the template's variables. */
  pageMetrics() {
    const probe = this.doc.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;box-sizing:content-box;width:var(--page-width);height:var(--page-min-height);padding-top:var(--page-gap,24px)';
    this.doc.documentElement.append(probe);
    const width = probe.offsetWidth;
    const gap = parseFloat(getComputedStyle(probe).paddingTop) || 24;
    const height = probe.offsetHeight - gap;
    probe.remove();
    return { width, height, gap };
  }

  /** {count, current} pages, or null when not in page view. */
  pageInfo() {
    if (!this.paged) return null;
    const { height, gap } = this.pageMetrics();
    const total = this.body.offsetHeight;
    const count = Math.max(1, Math.round((total + gap) / (height + gap)));
    let current = 1;
    const r = this.caretRange();
    if (r && this.body.contains(r.startContainer)) {
      const b = this.body.getBoundingClientRect();
      const el = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
      const rect = r.getClientRects()[0] || el.getBoundingClientRect();
      // Convert from (possibly zoomed) client coordinates to layout pixels via the body's own size.
      const y = ((rect.top - b.top) / (b.height || 1)) * total;
      current = Math.min(count, Math.max(1, Math.floor(y / (height + gap)) + 1));
    }
    return { count, current, approximate: !this.pagedSupported() };
  }

  schedulePages() {
    if (this.pagesQueued) return;
    this.pagesQueued = true;
    requestAnimationFrame(() => {
      this.pagesQueued = false;
      this.renderPageLabels();
      this.dispatchEvent(new Event('pages'));
    });
  }

  /** Small "n / total" labels in the gap under each page (outside <body>, so never saved or edited). */
  renderPageLabels() {
    let box = this.doc.getElementById('wa-page-labels');
    if (!this.paged || !this.pagedSupported()) { box?.remove(); return; }
    if (!box) {
      box = this.doc.createElement('div');
      box.id = 'wa-page-labels';
      box.setAttribute('aria-hidden', 'true');
      this.doc.documentElement.append(box);
    }
    const info = this.pageInfo();
    const { height, gap } = this.pageMetrics();
    // body.offsetTop/Left are always 0, so derive the body's layout position from client rects.
    const b = this.body.getBoundingClientRect();
    const scale = b.height / (this.body.offsetHeight || 1) || 1;
    const top = (b.top + this.win.scrollY * scale) / scale;
    const right = (b.right + this.win.scrollX * scale) / scale;
    if (box.childElementCount !== info.count || box.dataset.key !== `${height}|${top}|${right}`) {
      box.dataset.key = `${height}|${top}|${right}`;
      box.replaceChildren(...Array.from({ length: info.count }, (_, i) => {
        const span = this.doc.createElement('span');
        span.textContent = `${i + 1} / ${info.count}`;
        span.style.top = `${top + (i + 1) * height + i * gap + gap / 2}px`;
        span.style.left = `${right - 48}px`;
        return span;
      }));
    }
  }

  setMeta(meta) {
    this.meta = { ...this.meta, ...meta };
    this.renderTitle();
    this.emitChange();
  }

  renderTitle() {
    this.body.querySelector(':scope > #title-block-header')?.remove();
    if (hasMeta(this.meta)) this.body.prepend(renderTitleBlock(this.meta, this.doc));
  }

  getMarkdown() {
    return serializeFrontMatter(this.meta) + domToMarkdown(this.body);
  }

  /** Image paths referenced from the document. */
  referencedImages() {
    return new Set([...this.body.querySelectorAll('img[data-src]')].map((i) => i.dataset.src));
  }

  setLang(lang) {
    this.doc.documentElement.lang = lang;
  }

  setSpellcheck(on) {
    this.body.spellcheck = on;
    // Force browsers to re-evaluate squiggles.
    this.body.blur();
  }

  /** Applies zoom; in page view the page is also shrunk to fit narrow windows. */
  setZoom(z) {
    this.userZoom = z;
    let zoom = z;
    if (this.paged) {
      this.doc.documentElement.style.zoom = 1;
      const { width } = this.pageMetrics();
      const avail = this.iframe.clientWidth - 24;
      if (width * z > avail && avail > 0) zoom = Math.max(0.3, avail / width);
    }
    this.doc.documentElement.style.zoom = zoom;
    this.schedulePages();
    return zoom;
  }

  focus() {
    this.body.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ events */

  bindEvents() {
    const doc = this.doc;
    let timer = 0;
    doc.addEventListener('input', () => {
      this.cleanup();
      this.normalize();
      clearTimeout(timer);
      timer = setTimeout(() => refreshToc(this.body), 400);
      this.emitChange();
    });
    doc.addEventListener('selectionchange', () => { this.dispatchEvent(new Event('selection')); if (this.paged) this.dispatchEvent(new Event('pages')); });
    // Printing must use the template exactly as written (page-view rewrites breaks into column breaks).
    this.win.addEventListener('beforeprint', () => { this.doc.getElementById('wa-template').textContent = this.css; });
    this.win.addEventListener('afterprint', () => this.setCss(this.css));
    new ResizeObserver(() => this.schedulePages()).observe(this.body);
    new ResizeObserver(() => this.setZoom(this.userZoom)).observe(this.iframe);
    this.doc.fonts?.addEventListener?.('loadingdone', () => this.schedulePages());
    doc.addEventListener('keydown', (e) => this.onKeyDown(e));
    doc.addEventListener('paste', (e) => this.onPaste(e));
    doc.addEventListener('drop', (e) => this.onDrop(e));
    doc.addEventListener('dragover', (e) => e.preventDefault());
    doc.addEventListener('mousedown', (e) => this.onMouseDown(e));
    doc.addEventListener('click', (e) => this.onClick(e));
    doc.addEventListener('contextmenu', (e) => this.dispatchEvent(new CustomEvent('contextmenu-doc', { detail: e })));
    this.win.addEventListener('scroll', () => this.dispatchEvent(new Event('scroll')), { passive: true });
  }

  emitChange(initial = false) {
    this.body.classList.toggle('wa-empty', !this.body.textContent.trim() && !this.body.querySelector('img, hr, table, nav, header'));
    this.dispatchEvent(new CustomEvent('change', { detail: { initial } }));
  }

  onMouseDown(e) {
    const box = e.target.closest?.('input[type=checkbox]');
    if (box) {
      e.preventDefault();
      box.checked = !box.checked;
      box.toggleAttribute('checked', box.checked);
      this.emitChange();
    }
  }

  onClick(e) {
    const t = e.target;
    for (const img of this.body.querySelectorAll('img.wa-selected')) if (img !== t) img.classList.remove('wa-selected');
    if (t.closest('#title-block-header')) {
      this.dispatchEvent(new Event('edit-meta'));
      return;
    }
    const tocLink = t.closest('nav.toc a');
    if (tocLink) {
      e.preventDefault();
      this.doc.getElementById(tocLink.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (t.localName === 'img') {
      t.classList.add('wa-selected');
      const range = this.doc.createRange();
      range.selectNode(t);
      const sel = this.win.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      this.dispatchEvent(new CustomEvent('image-click', { detail: t }));
      return;
    }
    const a = t.closest('a[href]');
    if (a) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) window.open(a.href, '_blank', 'noopener');
      else this.dispatchEvent(new CustomEvent('link-click', { detail: a }));
    }
    this.dispatchEvent(new CustomEvent('doc-click', { detail: e }));
  }

  onKeyDown(e) {
    const mod = e.ctrlKey || e.metaKey;
    // Shortcuts handled by the app shell (save/open/etc.) are re-dispatched to the parent window.
    if ((mod && /^[sopnkf/=+-]$/i.test(e.key)) || e.key === 'F7') {
      e.preventDefault();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey }));
      return;
    }
    if (mod && !e.shiftKey && e.key === 'e') { e.preventDefault(); this.toggleInlineCode(); return; }
    if (mod && e.altKey && /^[0-6]$/.test(e.key)) { e.preventDefault(); this.formatBlock(e.key === '0' ? 'p' : 'h' + e.key); return; }
    if (mod && e.shiftKey && (e.key === 'X' || e.key === 'x')) { e.preventDefault(); this.exec('strikeThrough'); return; }
    if (mod && e.shiftKey && (e.key === '7' || e.key === '&')) { e.preventDefault(); this.exec('insertOrderedList'); return; }
    if (mod && e.shiftKey && (e.key === '8' || e.key === '*')) { e.preventDefault(); this.exec('insertUnorderedList'); return; }

    const block = this.currentBlock();
    if (e.key === 'Tab') {
      const cell = this.closest('td, th');
      if (cell) { e.preventDefault(); this.moveCell(cell, e.shiftKey ? -1 : 1); return; }
      if (this.closest('li')) { e.preventDefault(); this.exec(e.shiftKey ? 'outdent' : 'indent'); return; }
      if (this.closest('pre')) { e.preventDefault(); this.exec('insertText', '  '); return; }
      e.preventDefault();
      return;
    }
    const pre = this.closest('pre');
    if (e.key === 'Enter' && !e.shiftKey && pre) {
      e.preventDefault();
      const last = pre.querySelector('code')?.lastChild || pre.lastChild;
      if (this.caretAtEnd(pre) && last?.nodeName === 'BR' && last.previousSibling?.nodeName === 'BR') {
        // Enter on an empty last line leaves the code block.
        last.previousSibling.remove();
        last.remove();
        this.exitAfter(pre);
        return;
      }
      this.exec('insertLineBreak');
      return;
    }
    const bq = this.closest('blockquote');
    if (e.key === 'Enter' && !e.shiftKey && bq && block && !block.textContent.trim() && !block.querySelector('img')) {
      e.preventDefault();
      if (block === bq) {
        this.replaceUndoable(bq, '<p><br></p>');
      } else {
        block.remove();
        if (!bq.textContent.trim()) bq.remove();
        this.exitAfter(bq);
      }
      return;
    }
    if (e.key === 'Enter' && block?.localName === 'p' && !e.shiftKey) {
      const text = block.textContent;
      if (/^(---|\*\*\*|___)$/.test(text.trim()) && this.caretAtEnd(block) && block.parentElement === this.body) {
        e.preventDefault();
        const index = [...this.body.children].indexOf(block);
        this.replaceUndoable(block, '<hr><p><br></p>');
        const next = this.body.children[index + 1];
        if (next?.localName === 'p') this.placeCaret(next, 0);
        return;
      }
      const fence = /^```([\w+#.-]*)$/.exec(text.trim());
      if (fence && this.caretAtEnd(block)) {
        e.preventDefault();
        this.selectNodeContents(block);
        const index = [...this.body.children].indexOf(block);
        this.exec('insertHTML', `<pre><code${fence[1] ? ` class="language-${fence[1]}"` : ''}><br></code></pre>`);
        const target = this.body.children[index]?.querySelector('code') || [...this.body.querySelectorAll('pre code')].find((c) => !c.textContent);
        if (target) this.placeCaret(target, 0);
        this.normalize();
        return;
      }
    }
    if (e.key === ' ' && block && /^(p|div)$/.test(block.localName) && !block.closest('li, td, th, blockquote, pre')) {
      const before = this.textBeforeCaret(block);
      const map = { '#': 'h1', '##': 'h2', '###': 'h3', '####': 'h4', '#####': 'h5', '######': 'h6', '>': 'blockquote' };
      let action = null;
      if (map[before]) action = () => this.formatBlock(map[before]);
      else if (/^[-*+]$/.test(before)) action = () => this.exec('insertUnorderedList');
      else if (/^1[.)]$/.test(before)) action = () => this.exec('insertOrderedList');
      else if (/^\[[ x]?\]$/.test(before)) action = () => { this.exec('insertUnorderedList'); this.toggleTask(before.includes('x')); };
      if (action) {
        e.preventDefault();
        const sel = this.win.getSelection();
        const r = this.doc.createRange();
        r.setStart(block, 0);
        r.setEnd(sel.focusNode, sel.focusOffset);
        sel.removeAllRanges();
        sel.addRange(r);
        this.exec('delete');
        action();
      }
    }
  }

  async onPaste(e) {
    const dt = e.clipboardData;
    if (!dt) return;
    const files = [...dt.files].filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      for (const f of files) this.insertImageBlob(f, f.name);
      return;
    }
    const html = dt.getData('text/html');
    const text = dt.getData('text/plain');
    if (this.closest('pre')) {
      e.preventDefault();
      this.exec('insertText', text);
      return;
    }
    if (html) {
      e.preventDefault();
      const md = cleanHtmlViaMarkdown(html, this.doc);
      this.insertMarkdown(md, text);
      return;
    }
    if (text && (/\n/.test(text.trim()) || /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)|\*\*|\[.+\]\(.+\)/m.test(text))) {
      e.preventDefault();
      this.insertMarkdown(text, text);
    }
  }

  onDrop(e) {
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    const docs = files.filter((f) => /\.(zip|md|markdown|txt|html?)$/i.test(f.name));
    if (docs.length) {
      this.dispatchEvent(new CustomEvent('file-drop', { detail: docs[0] }));
      return;
    }
    const pos = this.doc.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (pos) {
      const sel = this.win.getSelection();
      sel.removeAllRanges();
      sel.addRange(pos);
    }
    for (const f of files.filter((f) => f.type.startsWith('image/'))) this.insertImageBlob(f, f.name);
  }

  /** Inserts markdown at the caret, rendering it to editor HTML first. */
  insertMarkdown(md, fallbackText = md) {
    const holder = this.doc.createElement('div');
    renderMarkdownInto(md, holder, (p) => this.images.url(p));
    for (const img of holder.querySelectorAll('img[src^="data:"]')) {
      const blob = dataUrlToBlob(img.src);
      if (blob) {
        const path = this.images.add(blob, img.alt);
        img.dataset.src = path;
        img.src = this.images.url(path);
      }
    }
    const blocks = holder.children;
    if (blocks.length === 1 && blocks[0].localName === 'p') {
      // Inline paste: don't split the current paragraph.
      this.exec('insertHTML', blocks[0].innerHTML || escapeHtml(fallbackText));
    } else if (holder.innerHTML) {
      this.exec('insertHTML', holder.innerHTML);
    } else if (fallbackText) {
      this.exec('insertText', fallbackText);
    }
  }

  /* ------------------------------------------------------------ dom helpers */

  selection() {
    const sel = this.win.getSelection();
    return sel && sel.rangeCount ? sel : null;
  }

  closest(selector) {
    const sel = this.selection();
    if (!sel) return null;
    let n = sel.focusNode;
    if (n && n.nodeType !== 1) n = n.parentElement;
    const el = n?.closest?.(selector);
    return el && this.body.contains(el) && el !== this.body ? el : null;
  }

  currentBlock() {
    return this.closest(BLOCK_SEL);
  }

  textBeforeCaret(block) {
    const sel = this.selection();
    if (!sel) return '';
    const r = this.doc.createRange();
    r.setStart(block, 0);
    try { r.setEnd(sel.focusNode, sel.focusOffset); } catch { return ''; }
    return r.toString();
  }

  caretAtEnd(block) {
    const sel = this.selection();
    if (!sel || !sel.isCollapsed) return false;
    const r = this.doc.createRange();
    r.selectNodeContents(block);
    r.setStart(sel.focusNode, sel.focusOffset);
    return !r.toString().trim();
  }

  selectNodeContents(node) {
    const r = this.doc.createRange();
    r.selectNodeContents(node);
    const sel = this.win.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  selectRange(range) {
    const sel = this.win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  placeCaret(node, offset) {
    const r = this.doc.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    this.selectRange(r);
  }

  /** Adds an empty paragraph after `node` and moves the caret into it. */
  exitAfter(node) {
    const p = Object.assign(this.doc.createElement('p'), { innerHTML: '<br>' });
    node.after(p);
    this.placeCaret(p, 0);
    this.emitChange();
  }

  /** Puts the caret `offset` characters into the text of `el`. */
  setCaretAtTextOffset(el, offset) {
    const w = this.doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (offset <= n.length) { this.placeCaret(n, offset); return; }
      offset -= n.length;
    }
    this.placeCaret(el, el.childNodes.length && el.lastChild.nodeName === 'BR' ? el.childNodes.length - 1 : el.childNodes.length);
  }

  /** Runs fn and restores the selection afterwards (DOM moves would otherwise collapse it). */
  keepSelection(fn) {
    const sel = this.selection();
    const r = sel?.getRangeAt(0);
    const saved = r && [r.startContainer, r.startOffset, r.endContainer, r.endOffset];
    fn();
    if (saved && saved[0].isConnected && saved[2].isConnected) {
      try {
        const nr = this.doc.createRange();
        nr.setStart(saved[0], saved[1]);
        nr.setEnd(saved[2], saved[3]);
        this.selectRange(nr);
      } catch { /* selection could not be restored */ }
    }
  }

  /** Wraps text and inline elements sitting directly in <body> into paragraphs (adjacent runs share one). */
  wrapStrayInline() {
    let p = null;
    for (const node of [...this.body.childNodes]) {
      const inline = (node.nodeType === Node.TEXT_NODE && (node.textContent.trim() || p)) ||
        (node.nodeType === Node.ELEMENT_NODE && /^(b|i|em|strong|span|a|code|img|s|del|u|br)$/.test(node.localName));
      if (!inline) { p = null; continue; }
      if (!p) { p = this.doc.createElement('p'); node.before(p); }
      p.append(node);
    }
  }

  /** Repairs structure the browser sometimes leaves behind (bare text in body, missing trailing paragraph). */
  normalize() {
    const body = this.body;
    const stray = [...body.childNodes].some((n) => (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) ||
      (n.nodeType === Node.ELEMENT_NODE && /^(b|i|em|strong|span|a|code|img|s|del|u)$/.test(n.localName)));
    if (stray) this.keepSelection(() => this.wrapStrayInline());
    const nested = [...body.querySelectorAll('p')].filter((p) => [...p.children].some((c) => NESTABLE_BLOCKS.has(c.nodeName)));
    if (nested.length) {
      this.keepSelection(() => {
        for (const p of nested) {
          if (!p.isConnected) continue;
          const parts = [];
          let cur = null;
          for (const child of [...p.childNodes]) {
            if (child.nodeType === 1 && NESTABLE_BLOCKS.has(child.nodeName)) { cur = null; parts.push(child); continue; }
            if (!cur) { cur = this.doc.createElement('p'); parts.push(cur); }
            cur.append(child);
          }
          p.replaceWith(...parts.filter((n) => n.nodeName !== 'P' || n.textContent.trim() || n.querySelector('img, br')));
        }
      });
    }
    // Text typed straight into a blockquote belongs in a paragraph.
    for (const bq of body.querySelectorAll('blockquote')) {
      if (![...bq.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() || (n.nodeType === 1 && !NESTABLE_BLOCKS.has(n.nodeName) && n.nodeName !== 'P'))) continue;
      this.keepSelection(() => {
        const p = this.doc.createElement('p');
        const inline = [...bq.childNodes].filter((n) => !(n.nodeType === 1 && (NESTABLE_BLOCKS.has(n.nodeName) || n.nodeName === 'P')));
        inline[0].before(p);
        p.append(...inline);
      });
    }
    const meaningful = [...body.children].filter((c) => c.id !== 'title-block-header');
    if (!meaningful.length) body.append(Object.assign(this.doc.createElement('p'), { innerHTML: '<br>' }));
    const last = body.lastElementChild;
    if (last && (TRAILING_NEEDS_P.has(last.nodeName) && !(last.nodeName === 'DIV' && !last.className))) {
      body.append(Object.assign(this.doc.createElement('p'), { innerHTML: '<br>' }));
    }
  }

  cleanup() {
    for (const el of this.body.querySelectorAll('[style]')) el.removeAttribute('style');
    for (const el of this.body.querySelectorAll('font')) el.replaceWith(...el.childNodes);
  }

  /* ------------------------------------------------------------ commands */

  exec(cmd, value = null) {
    this.focus();
    const ok = this.doc.execCommand(cmd, false, value ?? '');
    this.cleanup();
    this.normalize();
    return ok;
  }

  formatBlock(tag) {
    if (tag === 'blockquote') {
      const bq = this.closest('blockquote');
      if (bq) { this.replaceUndoable(bq, bq.innerHTML); return; }
      const block = this.currentBlock();
      if (block && block !== this.body && !block.closest('li, td, th, pre')) {
        const offset = this.textBeforeCaret(block).length;
        const index = [...this.body.children].indexOf(block);
        this.replaceUndoable(block, `<blockquote><p>${block.innerHTML || '<br>'}</p></blockquote>`);
        const p = this.body.children[index]?.querySelector('p');
        if (p) this.setCaretAtTextOffset(p, offset);
        return;
      }
    }
    const cur = this.currentBlock();
    if (cur && cur.localName === tag && tag !== 'p') tag = 'p';
    if (this.closest('li') && tag !== 'blockquote') {
      // Leave the list first so headings don't end up inside list items.
      const li = this.closest('li');
      this.exec(li.parentElement.localName === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
    }
    this.exec('formatBlock', `<${tag}>`);
  }

  /** Replaces a node with HTML through execCommand so the change is undoable. */
  replaceUndoable(node, html) {
    const r = this.doc.createRange();
    r.selectNode(node);
    this.selectRange(r);
    this.exec('insertHTML', html);
  }

  toggleInlineCode() {
    const code = this.closest('code');
    if (code && !code.closest('pre')) {
      const r = this.doc.createRange();
      r.selectNode(code);
      this.selectRange(r);
      this.exec('insertText', code.textContent);
      return;
    }
    const text = this.selectedText();
    this.exec('insertHTML', `<code>${escapeHtml(text || 'code')}</code>`);
    if (!text) {
      // Select the placeholder so typing replaces it.
      const sel = this.selection();
      const code = sel && (sel.focusNode.nodeType === 1 ? sel.focusNode : sel.focusNode.parentElement).closest('code') ||
        [...this.body.querySelectorAll('code')].find((c) => c.textContent === 'code');
      if (code) this.selectNodeContents(code);
    }
  }

  toggleTask(checked = false) {
    const li = this.closest('li');
    if (!li) {
      this.exec('insertUnorderedList');
      return this.toggleTask(checked);
    }
    const box = li.querySelector(':scope > input[type=checkbox], :scope > p > input[type=checkbox]');
    if (box) {
      box.remove();
      li.classList.remove('task-list-item');
      if (!li.parentElement.querySelector(':scope > li.task-list-item')) li.parentElement.classList.remove('contains-task-list');
    } else {
      const input = this.doc.createElement('input');
      input.type = 'checkbox';
      if (checked) { input.checked = true; input.setAttribute('checked', ''); }
      const host = li.firstElementChild?.localName === 'p' ? li.firstElementChild : li;
      host.prepend(input, this.doc.createTextNode(' '));
      li.classList.add('task-list-item');
      li.parentElement.classList.add('contains-task-list');
      if (!li.textContent.trim()) this.placeCaret(host.childNodes[1], 1);
    }
    this.emitChange();
  }

  insertLink(url, text) {
    const sel = this.selection();
    if (sel && !sel.isCollapsed) this.exec('createLink', url);
    else this.exec('insertHTML', `<a href="${escapeHtml(url)}">${escapeHtml(text || url)}</a>&nbsp;`);
  }

  insertImageBlob(blob, name) {
    const path = this.images.add(blob, name);
    const url = this.images.url(path);
    const block = this.currentBlock();
    const html = `<img src="${url}" data-src="${escapeHtml(path)}" alt="">`;
    if (block && block.localName === 'p' && !block.textContent.trim()) this.exec('insertHTML', html);
    else this.exec('insertHTML', `<p>${html}</p>`);
    this.emitChange();
    return path;
  }

  setImageCaption(img, caption) {
    const fig = img.closest('figure');
    const holderP = img.parentElement?.localName === 'p' && [...img.parentElement.childNodes].every((n) => n === img || !n.textContent.trim()) ? img.parentElement : null;
    const imgHtml = `<img src="${img.src}" data-src="${escapeHtml(img.dataset.src || img.getAttribute('src'))}" alt="${escapeHtml(caption)}">`;
    if (fig) {
      this.replaceUndoable(fig, caption ? `<figure>${imgHtml}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : `<p>${imgHtml}</p>`);
    } else if (holderP && caption) {
      this.replaceUndoable(holderP, `<figure>${imgHtml}<figcaption>${escapeHtml(caption)}</figcaption></figure>`);
    } else {
      img.alt = caption;
      this.emitChange();
    }
  }

  removeNode(node) {
    const target = node.closest('figure') || node;
    this.replaceUndoable(target, '');
  }

  insertTable(rows = 3, cols = 3) {
    const head = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Column ${i + 1}</th>`).join('')}</tr>`;
    const row = `<tr>${'<td><br></td>'.repeat(cols)}</tr>`;
    this.exec('insertHTML', `<table><thead>${head}</thead><tbody>${row.repeat(Math.max(1, rows - 1))}</tbody></table><p><br></p>`);
  }

  tableOp(op) {
    const cell = this.closest('td, th');
    if (!cell) return;
    const table = cell.closest('table');
    const rowEl = cell.parentElement;
    const rows = [...table.querySelectorAll('tr')];
    const r = rows.indexOf(rowEl);
    const c = [...rowEl.children].indexOf(cell);
    const clone = table.cloneNode(true);
    const crows = [...clone.querySelectorAll('tr')];
    const width = Math.max(...crows.map((x) => x.children.length));
    let focus = [r, c];
    const mk = (tag) => Object.assign(this.doc.createElement(tag), { innerHTML: '<br>' });
    switch (op) {
      case 'row-above': case 'row-below': {
        const tr = this.doc.createElement('tr');
        for (let i = 0; i < width; i++) tr.append(mk('td'));
        const ref = crows[r];
        if (ref.parentElement.localName === 'thead') {
          let tbody = clone.querySelector('tbody');
          if (!tbody) { tbody = this.doc.createElement('tbody'); clone.append(tbody); }
          tbody.prepend(tr);
          focus = [1, c];
        } else {
          op === 'row-above' ? ref.before(tr) : ref.after(tr);
          focus = [op === 'row-above' ? r : r + 1, c];
        }
        break;
      }
      case 'col-left': case 'col-right':
        for (const tr of crows) {
          const ref = tr.children[Math.min(c, tr.children.length - 1)];
          const nc = mk(tr.parentElement.localName === 'thead' ? 'th' : 'td');
          op === 'col-left' ? ref.before(nc) : ref.after(nc);
        }
        focus = [r, op === 'col-left' ? c : c + 1];
        break;
      case 'delete-row':
        if (crows[r].parentElement.localName === 'thead' || crows.length <= 2) { this.removeNode(table); return; }
        crows[r].remove();
        focus = [Math.min(r, crows.length - 2), c];
        break;
      case 'delete-col':
        if (width <= 1) { this.removeNode(table); return; }
        for (const tr of crows) tr.children[c]?.remove();
        focus = [r, Math.max(0, c - 1)];
        break;
      case 'align-left': case 'align-center': case 'align-right': {
        const a = op.slice(6);
        for (const tr of crows) tr.children[c]?.setAttribute('align', a);
        break;
      }
      case 'delete-table':
        this.removeNode(table);
        return;
    }
    const index = [...this.body.querySelectorAll('table')].indexOf(table);
    this.replaceUndoable(table, clone.outerHTML);
    const newTable = this.body.querySelectorAll('table')[index];
    const target = newTable?.querySelectorAll('tr')[focus[0]]?.children[focus[1]];
    if (target) this.placeCaret(target, 0);
  }

  moveCell(cell, dir) {
    const cells = [...cell.closest('table').querySelectorAll('th, td')];
    const i = cells.indexOf(cell) + dir;
    if (i >= cells.length) { this.tableOp('row-below'); return; }
    const next = cells[Math.max(0, i)];
    this.selectNodeContents(next);
  }

  insertPageBreak() {
    this.exec('insertHTML', '<div class="page-break" contenteditable="false"></div><p><br></p>');
  }

  insertToc() {
    this.exec('insertHTML', '<nav class="toc" contenteditable="false"></nav><p><br></p>');
    refreshToc(this.body);
  }

  /** Toolbar state for the current selection. */
  state() {
    const q = (c) => { try { return this.doc.queryCommandState(c); } catch { return false; } };
    const block = this.currentBlock();
    let blockTag = block?.localName || 'p';
    if (this.closest('pre')) blockTag = 'pre';
    else if (/^(li|td|th|div|figcaption|dt|dd)$/.test(blockTag)) blockTag = this.closest('h1,h2,h3,h4,h5,h6')?.localName || 'p';
    return {
      bold: q('bold'), italic: q('italic'), strike: q('strikeThrough'),
      code: !!this.closest('code') && !this.closest('pre'),
      ul: !!this.closest('ul'), ol: !!this.closest('ol'), task: !!this.closest('li.task-list-item'),
      quote: !!this.closest('blockquote'), link: this.closest('a'), table: !!this.closest('table'),
      block: blockTag,
    };
  }

  selectedText() {
    return this.selection()?.toString() || '';
  }

  /** Replaces the current selection (or a given range) with markdown/plain text. */
  replaceWith(text, range, asMarkdown = true) {
    if (range) this.selectRange(range);
    if (asMarkdown && /[*_`#>\n[]/.test(text)) this.insertMarkdown(text, text);
    else this.exec('insertText', text);
  }

  /* ------------------------------------------------------------ proofreading support */

  blockId(el) {
    let id = this.blockIds.get(el);
    if (!id) { id = 'b' + (++this.blockSeq); this.blockIds.set(el, id); }
    return id;
  }

  /**
   * Extracts plain-text blocks with offset maps back into DOM text nodes.
   * @returns {{id: string, text: string, kind: string, el: Element, segs: {node: Text, start: number, len: number}[]}[]}
   */
  getBlocks() {
    const blocks = new Map();
    const order = [];
    const walker = this.doc.createTreeWalker(this.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => {
        if (n.nodeType === 1) {
          if (n.id === 'title-block-header' || n.localName === 'nav' || n.classList?.contains('page-break')) return NodeFilter.FILTER_REJECT;
          return n.localName === 'br' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const host = (n.nodeType === 1 ? n : n.parentElement).closest(BLOCK_SEL) || this.body;
      if (host === this.body && !n.textContent.trim()) continue;
      let b = blocks.get(host);
      if (!b) {
        const tag = host.localName;
        const kind = tag === 'pre' || host.closest('pre') ? 'code' : /^h\d$/.test(tag) ? 'heading' : tag === 'li' ? 'li' : /^t[dh]$/.test(tag) ? 'cell' : tag === 'figcaption' ? 'caption' : 'p';
        b = { id: this.blockId(host), text: '', kind, el: host, segs: [] };
        blocks.set(host, b);
        order.push(b);
      }
      if (n.nodeType === 1) { b.text += '\n'; continue; }
      if (n.parentElement.closest('code') && b.kind !== 'code') {
        // Mask inline code so checkers don't flag identifiers, but keep offsets aligned.
        b.segs.push({ node: n, start: b.text.length, len: n.length });
        b.text += n.textContent.replace(/\S/g, ' ');
        continue;
      }
      b.segs.push({ node: n, start: b.text.length, len: n.length });
      b.text += n.textContent.replace(/\u00a0/g, ' ');
    }
    return order.filter((b) => b.text.trim());
  }

  rangeFor(block, start, end) {
    const pos = (offset, preferEnd) => {
      for (const s of block.segs) {
        if (offset < s.start + s.len || (preferEnd && offset === s.start + s.len)) {
          if (offset >= s.start) return [s.node, offset - s.start];
        }
      }
      const last = block.segs[block.segs.length - 1];
      return last ? [last.node, last.len] : null;
    };
    const a = pos(start, false);
    const b = pos(end, true);
    if (!a || !b || !a[0].isConnected || !b[0].isConnected) return null;
    const r = this.doc.createRange();
    try {
      r.setStart(a[0], Math.min(a[1], a[0].length));
      r.setEnd(b[0], Math.min(b[1], b[0].length));
    } catch { return null; }
    return r;
  }

  highlightsSupported() {
    return !!(this.win.CSS && this.win.CSS.highlights && this.win.Highlight);
  }

  setHighlight(name, ranges) {
    if (!this.highlightsSupported()) return;
    if (!ranges.length) this.win.CSS.highlights.delete(name);
    else this.win.CSS.highlights.set(name, new this.win.Highlight(...ranges));
  }

  /** Viewport (parent window) rectangle of a range inside the frame. */
  rectFor(range) {
    const f = this.iframe.getBoundingClientRect();
    const r = range.getBoundingClientRect();
    const zoom = parseFloat(this.doc.documentElement.style.zoom) || 1;
    return new DOMRect(f.left + r.left * zoom, f.top + r.top * zoom, r.width * zoom, r.height * zoom);
  }

  caretRange() {
    const sel = this.selection();
    return sel ? sel.getRangeAt(0) : null;
  }

  stats() {
    const text = this.body.innerText || '';
    const words = (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
    return { words, chars: text.replace(/\s/g, '').length, charsWithSpaces: text.length, minutes: Math.max(1, Math.round(words / 230)) };
  }

  outline() {
    return [...this.body.querySelectorAll('h1, h2, h3, h4')].filter((h) => !h.closest('#title-block-header, nav')).map((h) => ({ el: h, level: +h.localName[1], text: h.textContent }));
  }
}

export function dataUrlToBlob(url) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
  if (!m) return null;
  const bytes = m[2] ? Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[3]));
  return new Blob([bytes], { type: m[1] });
}

