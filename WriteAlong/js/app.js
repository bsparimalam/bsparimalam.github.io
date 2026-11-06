// Write Along — application shell.
import { Editor } from './editor.js';
import { Proofreader } from './proof/engine.js';
import { finishOpenRouterLogin } from './proof/llm.js';
import { loadSettings, saveSettings as persistSettings, idbGet, idbSet } from './store.js';
import { readDocumentFile, buildZip, buildHtml, pickFile, saveBlob, downloadBlob, baseName, fsAccess } from './files.js';
import { DEFAULT_TEMPLATE, loadTemplate } from './templates.js';
import { h, fill, icon, toast, openDialog, promptDialog, confirmDialog, showMenu, closeMenu, showPopover, hidePopover, popoverOpen } from './ui/dom.js';
import { initProofPanel, showIssuePopover } from './ui/proof-panel.js';
import { initAssist } from './ui/assist.js';
import { initStylePanel, openGallery, PAGE_SIZES, withPageSize, describePage, parseQuick } from './ui/style-panel.js';
import { openSettings as openSettingsDialog } from './ui/settings.js';
import { initAiRewrite, initAiStyle, createReviewBar } from './ui/ai-tools.js';

const $ = (sel) => document.querySelector(sel);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl+';

const settings = loadSettings();
const saveSettings = () => persistSettings(settings);
const getSettings = () => settings;

const state = {
  name: 'Untitled',
  handle: null,       // FileSystemFileHandle of the open .zip, when the browser supports it
  dirty: false,       // changed since last save to a file
  everSaved: false,
  mode: 'visual',
  zoom: parseFloat(localStorage.getItem('write-along:zoom')) || 1,
  swReg: null,
  swVersion: '',
};

const editor = new Editor($('#editor-frame'));
const proof = new Proofreader(editor, getSettings);
const source = $('#source');
let panels = {};
let review = null;

/* ================================================================ document lifecycle */

function currentMarkdown() {
  return state.mode === 'source' ? source.value : editor.getMarkdown();
}

function imagesForSave() {
  const used = state.mode === 'source'
    ? new Set([...source.value.matchAll(/\]\((images\/[^)\s]+)/g)].map((m) => decodeURIComponent(m[1])))
    : editor.referencedImages();
  return editor.images.entries().filter(([p]) => used.has(p)).map(([p, v]) => [p, v.blob]);
}

/** Replaces the document text (keeping its images and style), e.g. after an AI rewrite. */
function replaceMarkdown(md) {
  if (state.mode === 'source') source.value = md;
  else editor.load({ md, css: editor.css });
  markDirty();
  proof.clear();
  proof.runAuto();
}

async function loadDocument({ name, md, css, images = [], handle = null, dirty = false, everSaved = false }) {
  review?.hide();
  if (state.mode === 'source') setMode('visual', { skipSync: true });
  editor.images.clear();
  for (const [path, blob] of images) editor.images.set(path, blob);
  if (!css) css = (await loadTemplate(DEFAULT_TEMPLATE)).css;
  editor.load({ md, css });
  Object.assign(state, { name: name || 'Untitled', handle, dirty, everSaved });
  $('#doc-name').value = state.name;
  document.title = `${state.name} — Write Along`;
  proof.clear();
  proof.runAuto();
  panels.style?.render();
  updateSaveState();
  scheduleSession();
}

async function newDocument(templateId = DEFAULT_TEMPLATE, withSample = false) {
  if (!(await confirmDiscard())) return;
  const t = await loadTemplate(templateId);
  await loadDocument({ name: withSample ? t.name : 'Untitled', md: withSample ? t.sample : '', css: t.css });
  editor.focus();
}

/** Asks to save unsaved changes. Resolves false if the user cancels. */
async function confirmDiscard() {
  if (!state.dirty || isBlank()) return true;
  const choice = await confirmDialog('Save changes?', `“${state.name}” has changes that haven’t been saved to a file. They are only kept in this browser’s autosave, which the next document will replace.`,
    { okLabel: 'Save', cancelLabel: 'Cancel', extra: 'Don’t save' });
  if (choice === 'extra') return true;
  if (choice === true) return saveDocument();
  return false;
}

function isBlank() {
  return !currentMarkdown().trim();
}

async function openDocument(file, handle = null) {
  if (!file) {
    const picked = await pickFile();
    if (!picked) return;
    ({ file, handle } = picked);
  }
  if (!(await confirmDiscard())) return;
  try {
    const doc = await readDocumentFile(file);
    let css = doc.css;
    if (!css) css = (await loadTemplate(DEFAULT_TEMPLATE)).css;
    await loadDocument({ ...doc, css, handle, everSaved: !!handle });
    if (!file.name.toLowerCase().endsWith('.zip')) toast(`Imported ${file.name}. Save to create a Write Along .zip document.`);
  } catch (err) {
    toast(`Could not open ${file.name}: ${err.message}`, { error: true });
  }
}

async function saveDocument(saveAs = false) {
  try {
    const blob = await buildZip({ md: currentMarkdown(), css: editor.css, images: imagesForSave() });
    const result = await saveBlob(blob, `${state.name}.zip`, saveAs ? null : state.handle);
    if (result === false) return false;
    if (result) {
      state.handle = result;
      const n = baseName(result.name);
      if (n !== state.name) { state.name = n; $('#doc-name').value = n; }
    }
    state.dirty = false;
    state.everSaved = true;
    updateSaveState();
    scheduleSession();
    toast(result ? `Saved ${result.name}` : `Downloaded ${state.name}.zip`);
    return true;
  } catch (err) {
    toast(`Save failed: ${err.message}`, { error: true });
    return false;
  }
}

function updateSaveState() {
  const el = $('#save-state');
  el.classList.toggle('dirty', state.dirty);
  el.textContent = state.dirty ? (state.everSaved ? 'Unsaved changes' : 'Not saved to a file') : state.everSaved ? (state.handle ? 'Saved' : 'Downloaded') : '';
  el.title = state.dirty ? 'Your work is autosaved in this browser. Press Save to write a .zip file.' : '';
}

/* ---------------------------------------------------------------- autosave to IndexedDB */

let sessionTimer = 0;
function scheduleSession() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(saveSession, 800);
}

async function saveSession() {
  clearTimeout(sessionTimer);
  try {
    await idbSet('session', { name: state.name, md: currentMarkdown(), css: editor.css, images: imagesForSave(), handle: state.handle,
      dirty: state.dirty, everSaved: state.everSaved, savedAt: Date.now() });
  } catch (err) {
    console.warn('Autosave failed', err);
  }
}

/* ================================================================ export */

async function exportAs(kind) {
  const md = currentMarkdown();
  if (state.mode === 'source') setMode('visual');
  try {
    if (kind === 'html') {
      const html = await buildHtml({ title: editor.meta.title || state.name, bodyHtml: editor.body.innerHTML, css: editor.css, lang: settings.lang,
        images: new Map(imagesForSave()) });
      await saveBlob(new Blob([html], { type: 'text/html' }), `${state.name}.html`, null, [{ description: 'Web page', accept: { 'text/html': ['.html'] } }]);
    } else if (kind === 'pdf') {
      printDocument();
    } else if (kind === 'md') {
      await saveBlob(new Blob([md], { type: 'text/markdown' }), `${state.name}.md`, null, [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]);
      if (imagesForSave().length) toast('The .md file references images that are only included in the full .zip document.');
    } else if (kind === 'txt') {
      await saveBlob(new Blob([editor.body.innerText], { type: 'text/plain' }), `${state.name}.txt`, null, [{ description: 'Plain text', accept: { 'text/plain': ['.txt'] } }]);
    } else if (kind === 'css') {
      downloadBlob(new Blob([editor.css], { type: 'text/css' }), 'template.css');
    }
  } catch (err) {
    toast(`Export failed: ${err.message}`, { error: true });
  }
}

function printDocument() {
  if (state.mode === 'source') setMode('visual');
  proof.setActive(null);
  hidePopover();
  editor.doc.title = state.name;
  editor.win.focus();
  editor.win.print();
}

/* ================================================================ dialogs */

async function editProperties() {
  const m = editor.meta;
  const title = h('input', { value: m.title, placeholder: 'Document title' });
  const subtitle = h('input', { value: m.subtitle });
  const authors = h('textarea', { rows: 2, value: (m.author || []).join('\n'), placeholder: 'One author per line' });
  const date = h('input', { value: m.date });
  const abstract = h('textarea', { rows: 5, value: m.abstract });
  const result = await openDialog('Document properties', (close) => h('form', { onsubmit: (e) => { e.preventDefault(); close(true); } },
    h('div.dlg-body',
      h('p.help', { style: { marginTop: 0 } }, 'Shown as the title block by templates that support it (stored as YAML front matter in text.md). Leave everything empty for no title block.'),
      h('label.field', h('span', 'Title'), title),
      h('label.field', h('span', 'Subtitle'), subtitle),
      h('label.field', h('span', 'Author(s)'), authors),
      h('label.field', h('span', 'Date'), h('div.inline-input', date,
        h('button.btn.small', { type: 'button', onclick: () => { date.value = new Date().toLocaleDateString(settings.lang, { year: 'numeric', month: 'long', day: 'numeric' }); } }, 'Today'))),
      h('label.field', h('span', 'Abstract'), abstract)),
    h('div.dlg-foot', h('button.btn', { type: 'button', onclick: () => close(false) }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Apply'))));
  if (!result) return;
  editor.setMeta({ title: title.value.trim(), subtitle: subtitle.value.trim(), author: authors.value.split('\n').map((a) => a.trim()).filter(Boolean),
    date: date.value.trim(), abstract: abstract.value.trim() });
  if (editor.meta.title && state.name === 'Untitled') renameDocument(editor.meta.title);
}

function renameDocument(name) {
  state.name = name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Untitled';
  $('#doc-name').value = state.name;
  document.title = `${state.name} — Write Along`;
  scheduleSession();
}

async function editLink() {
  const existing = editor.state().link;
  const sel = editor.selection()?.getRangeAt(0).cloneRange();
  const url = await promptDialog(existing ? 'Edit link' : 'Insert link', { label: 'URL', value: existing?.getAttribute('href') || 'https://', okLabel: existing ? 'Update' : 'Insert' });
  if (url === null) return;
  if (sel) editor.selectRange(sel);
  if (existing) {
    const r = editor.doc.createRange();
    r.selectNodeContents(existing);
    editor.selectRange(r);
    if (!url.trim()) { editor.exec('unlink'); return; }
  }
  if (url.trim()) editor.insertLink(url.trim());
}

function linkPopover(a) {
  const range = editor.doc.createRange();
  range.selectNode(a);
  showPopover(editor.rectFor(range), h('div',
    h('div.pop-title', icon('link'), h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.getAttribute('href'))),
    h('div.btn-row',
      h('button.btn.small', { type: 'button', onclick: () => { hidePopover(); window.open(a.href, '_blank', 'noopener'); } }, 'Open'),
      h('button.btn.small', { type: 'button', onclick: () => { hidePopover(); editLink(); } }, 'Edit'),
      h('button.btn.small', { type: 'button', onclick: () => { hidePopover(); const r = editor.doc.createRange(); r.selectNodeContents(a); editor.selectRange(r); editor.exec('unlink'); } }, 'Remove link'))));
}

function imagePopover(img) {
  const r = editor.doc.createRange();
  r.selectNode(img);
  const caption = h('input', { value: img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt || '', placeholder: 'Describe the image' });
  const apply = () => { hidePopover(); editor.setImageCaption(img, caption.value.trim()); };
  caption.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  showPopover(editor.rectFor(r), h('div',
    h('label', 'Caption / alt text'),
    caption,
    h('div.btn-row',
      h('button.btn.small.primary', { type: 'button', onclick: apply }, 'Apply'),
      h('button.btn.small.danger', { type: 'button', onclick: () => { hidePopover(); editor.removeNode(img); } }, icon('trash-2'), 'Remove')),
    h('p.help', 'Images with a caption become numbered figures in templates that support them.')));
  caption.focus();
}

function pickImage() {
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true });
  const saved = editor.selection()?.getRangeAt(0).cloneRange();
  input.addEventListener('change', () => {
    if (saved) editor.selectRange(saved);
    for (const f of input.files) editor.insertImageBlob(f, f.name);
  });
  input.click();
}

async function insertTableDialog() {
  const rows = h('input', { type: 'number', min: 2, max: 50, value: 3 });
  const cols = h('input', { type: 'number', min: 1, max: 12, value: 3 });
  const saved = editor.selection()?.getRangeAt(0).cloneRange();
  const ok = await openDialog('Insert table', (close) => h('form', { onsubmit: (e) => { e.preventDefault(); close(true); } },
    h('div.dlg-body', h('div.field-row', h('label.field', h('span', 'Rows (including header)'), rows), h('label.field', h('span', 'Columns'), cols))),
    h('div.dlg-foot', h('button.btn', { type: 'button', onclick: () => close(false) }, 'Cancel'), h('button.btn.primary', { type: 'submit' }, 'Insert'))));
  if (!ok) return;
  if (saved) editor.selectRange(saved);
  editor.insertTable(Math.max(2, +rows.value || 3), Math.max(1, +cols.value || 3));
}

function shortcutsDialog() {
  const rows = [
    [`${MOD}S`, 'Save'], [`${MOD}⇧S`, 'Save as'], [`${MOD}O`, 'Open'], [`${MOD}P`, 'Print / PDF'],
    [`${MOD}B`, 'Bold'], [`${MOD}I`, 'Italic'], [`${MOD}U`, 'Underline (kept as HTML)'], [`${MOD}⇧X`, 'Strikethrough'], [`${MOD}E`, 'Inline code'],
    [`${MOD}K`, 'Link'], [`${MOD}Alt+1…6`, 'Heading 1–6'], [`${MOD}Alt+0`, 'Paragraph'], [`${MOD}⇧7 / ⇧8`, 'Numbered / bulleted list'],
    [`${MOD}F`, 'Find & replace'], ['F7', 'Check document'], ['Tab / ⇧Tab', 'Indent list, next table cell'],
    ['# + space', 'Heading (## for level 2, …)'], ['- or * + space', 'Bulleted list'], ['1. + space', 'Numbered list'], ['[ ] + space', 'Checklist'],
    ['> + space', 'Quote'], ['``` + Enter', 'Code block'], ['--- + Enter', 'Horizontal rule'],
  ];
  openDialog('Keyboard shortcuts', () => h('div.dlg-body', h('div.shortcuts', rows.flatMap(([k, v]) => [h('kbd', k), h('span', v)]))));
}

function aboutDialog() {
  openDialog('About Write Along', () => h('div.dlg-body',
    h('p', h('b', 'Write Along'), ' is an offline-first word processor that runs entirely in your browser.'),
    h('p', 'A document is a .zip containing ', h('code', 'text.md'), ' (your words, in Markdown), ', h('code', 'template.css'),
      ' (every bit of formatting) and an ', h('code', 'images/'), ' folder. Any Markdown tool can read it; any browser can style it.'),
    h('p', 'Proofreading combines your browser’s spell checker, built-in rules, Harper (offline WebAssembly grammar checker), LanguageTool, Chrome’s on-device Gemini Nano, local model servers like Ollama and LM Studio, and cloud models with your own API key.'),
    h('p.help', 'Open-source components: marked (MIT), Harper (Apache-2.0), Lucide icons (ISC), Computer Modern Unicode, EB Garamond, Inter, Source Serif 4 and JetBrains Mono fonts (SIL OFL).'),
    h('p.help', state.swVersion ? `Version ${state.swVersion}` : '')));
}

function openSettings(tab = 'proof') {
  openSettingsDialog({ tab, getSettings, saveSettings, onChange: applySettings,
    swInfo: () => ({ ready: !!navigator.serviceWorker?.controller, version: state.swVersion, checkUpdate: checkForUpdate }) });
}

function applySettings() {
  editor.setLang(settings.lang);
  editor.setSpellcheck(settings.browserSpellcheck);
  source.spellcheck = settings.browserSpellcheck;
  source.lang = settings.lang;
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  applyAppearance();
  proof.cache.rules.clear();
  proof.runAuto();
  panels.proof?.render();
  panels.assist?.refresh();
}

/* ================================================================ page view & paper */

const PAPER_LABEL = { auto: 'Automatic (dimmed in dark mode)', light: 'Bright paper', dim: 'Dimmed paper', dark: 'Dark paper' };

function paperMode() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return settings.paper === 'auto' ? (dark ? 'dim' : 'light') : settings.paper;
}

function applyAppearance() {
  const dark = document.documentElement.dataset.theme === 'dark';
  editor.setPaper(paperMode(), dark);
  if (editor.paged !== settings.pageView) editor.setPageView(settings.pageView);
  $('#pageview-btn').classList.toggle('active', settings.pageView);
  const mode = paperMode();
  $('#paper-btn').querySelector('use').setAttribute('href', `icons/sprite.svg#${mode === 'light' ? 'sun' : mode === 'dim' ? 'sun-dim' : 'moon'}`);
  $('#paper-btn').title = `Paper: ${PAPER_LABEL[settings.paper]} — click to change`;
  updatePageStatus();
}

function setPaper(mode) {
  settings.paper = mode;
  saveSettings();
  applyAppearance();
}

function togglePageView(on = !settings.pageView) {
  settings.pageView = on;
  saveSettings();
  applyAppearance();
  if (on && !editor.pagedSupported()) toast('This browser can’t lay out separate pages yet, so page ends are shown as guide lines. Chrome and Edge show exact pages.', { timeout: 8000 });
}

function updatePageStatus() {
  const { width, height } = editor.pageMetrics();
  const page = describePage(width, height);
  $('#page-size-btn').textContent = `${page.name}${page.landscape ? ' · Landscape' : ''}`;
  const info = editor.pageInfo();
  $('#page-info').textContent = info ? `Page ${info.current} of ${info.count}${info.approximate ? ' (approx.)' : ''}` : '';
}

function pageSizeMenu(anchor) {
  const q = parseQuick(editor.css);
  const landscape = q.pageOrientation === 'landscape';
  const set = (size, orientation) => setCss(withPageSize(editor.css, size, orientation));
  showMenu(anchor, [
    { heading: 'Page size' },
    { label: 'Template default', checked: !q.pageSize, action: () => set('', '') },
    ...PAGE_SIZES.map(([id, label]) => ({ label, checked: q.pageSize === id, action: () => set(id, landscape ? 'landscape' : '') })),
    '-',
    { heading: 'Orientation' },
    { label: 'Portrait', checked: !landscape, disabled: !q.pageSize, action: () => set(undefined, '') },
    { label: 'Landscape', checked: landscape, disabled: !q.pageSize, action: () => set(undefined, 'landscape') },
    '-',
    { label: 'Margins, fonts & more…', icon: 'palette', action: () => selectTab('style') },
  ]);
}

/* ================================================================ templates & style */

function applyTemplate(t) {
  const previous = editor.css;
  setCss(t.css);
  toast(`Applied the ${t.name} style.`, { action: () => setCss(previous), actionLabel: 'Undo' });
}

function setCss(css) {
  editor.setCss(css);
  markDirty();
  panels.style?.render();
  requestAnimationFrame(updatePageStatus);
}

function markDirty() {
  state.dirty = true;
  updateSaveState();
  scheduleSession();
}

/* ================================================================ modes, zoom, focus */

function setMode(mode, { skipSync = false } = {}) {
  if (mode === state.mode) return;
  if (mode === 'source') {
    source.value = editor.getMarkdown();
    source.hidden = false;
    $('#editor-frame').hidden = true;
    source.focus();
  } else {
    if (!skipSync) {
      const md = source.value;
      editor.load({ md, css: editor.css });
      proof.clear();
      proof.runAuto();
    }
    source.hidden = true;
    $('#editor-frame').hidden = false;
  }
  state.mode = mode;
  hidePopover();
  for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('active', b.dataset.mode === mode);
  for (const b of document.querySelectorAll('#toolbar [data-cmd], #block-select')) b.disabled = mode === 'source';
}

function setZoom(z) {
  state.zoom = Math.min(2.5, Math.max(0.5, Math.round(z * 10) / 10));
  const effective = editor.setZoom(state.zoom);
  $('#zoom-level').textContent = Math.round(effective * 100) + '%';
  $('#zoom-level').title = effective < state.zoom ? 'Shrunk to fit the page in the window. Click to reset zoom.' : 'Reset zoom';
  localStorage.setItem('write-along:zoom', state.zoom);
}

function toggleFocus(on = !$('#app').classList.contains('focus')) {
  $('#app').classList.toggle('focus', on);
  document.querySelector('.focus-exit')?.remove();
  if (on) document.body.append(h('button.btn.small.focus-exit', { type: 'button', onclick: () => toggleFocus(false) }, 'Exit focus mode (Esc)'));
}

function toggleSidebar(open = $('#app').classList.contains('no-sidebar'), persist = true) {
  $('#app').classList.toggle('no-sidebar', !open);
  if (!persist) return;
  settings.sidebarOpen = open;
  saveSettings();
}

function selectTab(tab) {
  settings.sidebar = tab;
  saveSettings();
  for (const b of document.querySelectorAll('.tabs [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  for (const p of document.querySelectorAll('.panel')) p.hidden = p.dataset.panel !== tab;
  if (tab === 'outline') renderOutline();
  if (tab === 'assist') { panels.assist?.refresh(); panels.rewrite?.refresh(); }
  toggleSidebar(true);
}

/* ================================================================ find & replace */

const find = { matches: [], index: -1 };

function openFind() {
  if (state.mode === 'source') setMode('visual');
  $('#findbar').hidden = false;
  const sel = editor.selectedText();
  if (sel && !sel.includes('\n')) $('#find-input').value = sel;
  $('#find-input').focus();
  $('#find-input').select();
  runFind();
}

function closeFind() {
  $('#findbar').hidden = true;
  editor.setHighlight('wa-find', []);
  find.matches = [];
  editor.focus();
}

function runFind() {
  const q = $('#find-input').value;
  const cs = $('#find-case').checked;
  find.matches = [];
  if (q) {
    const needle = cs ? q : q.toLowerCase();
    for (const b of editor.getBlocks()) {
      const hay = cs ? b.text : b.text.toLowerCase();
      for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) {
        const r = editor.rangeFor(b, i, i + q.length);
        if (r) find.matches.push(r);
      }
    }
  }
  editor.setHighlight('wa-find', find.matches);
  find.index = find.matches.length ? Math.min(Math.max(find.index, 0), find.matches.length - 1) : -1;
  $('#find-count').textContent = q ? `${find.matches.length ? find.index + 1 : 0} of ${find.matches.length}` : '';
}

function gotoMatch(dir) {
  if (!find.matches.length) return;
  find.index = (find.index + dir + find.matches.length) % find.matches.length;
  const r = find.matches[find.index];
  editor.selectRange(r);
  r.startContainer.parentElement?.scrollIntoView({ block: 'center' });
  $('#find-count').textContent = `${find.index + 1} of ${find.matches.length}`;
}

function replaceCurrent() {
  const r = find.matches[find.index];
  if (!r) return gotoMatch(1);
  editor.selectRange(r);
  editor.exec('insertText', $('#replace-input').value);
  runFind();
  gotoMatch(0);
}

function replaceAll() {
  const n = find.matches.length;
  for (const r of [...find.matches].reverse()) {
    editor.selectRange(r);
    editor.exec('insertText', $('#replace-input').value);
  }
  runFind();
  toast(`Replaced ${n} occurrence${n === 1 ? '' : 's'}.`);
}

/* ================================================================ menus */

function menuItems(name) {
  const st = editor.state();
  switch (name) {
    case 'file': return [
      { label: 'New document', icon: 'file-plus', action: () => newDocument() },
      { label: 'New from template…', icon: 'layout-template', action: () => showGallery() },
      { label: 'Open…', icon: 'folder-open', shortcut: `${MOD}O`, action: () => openDocument() },
      '-',
      { label: 'Save', icon: 'save', shortcut: `${MOD}S`, action: () => saveDocument() },
      { label: fsAccess ? 'Save as…' : 'Download copy', icon: 'download', shortcut: `${MOD}⇧S`, action: () => saveDocument(true) },
      '-',
      { heading: 'Export' },
      { label: 'PDF / Print…', icon: 'printer', shortcut: `${MOD}P`, action: () => exportAs('pdf') },
      { label: 'Web page (.html)', icon: 'file-code', action: () => exportAs('html') },
      { label: 'Markdown (.md)', icon: 'file-text', action: () => exportAs('md') },
      { label: 'Plain text (.txt)', icon: 'file-text', action: () => exportAs('txt') },
      { label: 'Stylesheet (template.css)', icon: 'palette', action: () => exportAs('css') },
      '-',
      { label: 'Document properties…', icon: 'info', action: editProperties },
    ];
    case 'edit': return [
      { label: 'Undo', icon: 'undo-2', shortcut: `${MOD}Z`, action: () => editor.exec('undo') },
      { label: 'Redo', icon: 'redo-2', shortcut: isMac ? '⌘⇧Z' : 'Ctrl+Y', action: () => editor.exec('redo') },
      '-',
      { label: 'Find & replace', icon: 'search', shortcut: `${MOD}F`, action: openFind },
      { label: 'Select all', shortcut: `${MOD}A`, action: () => { editor.selectNodeContents(editor.body); } },
    ];
    case 'insert': return [
      { label: 'Image…', icon: 'image', action: pickImage },
      { label: 'Table…', icon: 'table', action: insertTableDialog },
      { label: 'Link…', icon: 'link', shortcut: `${MOD}K`, action: editLink },
      { label: 'Checklist', icon: 'list-todo', action: () => editor.toggleTask() },
      { label: 'Code block', icon: 'square-code', action: () => editor.formatBlock('pre') },
      '-',
      { label: 'Horizontal rule', icon: 'minus', action: () => editor.exec('insertHorizontalRule') },
      { label: 'Page break', icon: 'separator-horizontal', action: () => editor.insertPageBreak() },
      { label: 'Table of contents', icon: 'list-tree', action: () => editor.insertToc() },
      { label: 'Title block (properties)…', icon: 'heading', action: editProperties },
    ];
    case 'format': return [
      { label: 'Bold', icon: 'bold', shortcut: `${MOD}B`, checked: st.bold, action: () => editor.exec('bold') },
      { label: 'Italic', icon: 'italic', shortcut: `${MOD}I`, checked: st.italic, action: () => editor.exec('italic') },
      { label: 'Strikethrough', icon: 'strikethrough', checked: st.strike, action: () => editor.exec('strikeThrough') },
      { label: 'Inline code', icon: 'code', shortcut: `${MOD}E`, checked: st.code, action: () => editor.toggleInlineCode() },
      '-',
      ...['p', 'h1', 'h2', 'h3', 'h4'].map((t) => ({ label: t === 'p' ? 'Paragraph' : `Heading ${t[1]}`, icon: t === 'p' ? 'pilcrow' : 'heading', checked: st.block === t, shortcut: `${MOD}Alt+${t === 'p' ? 0 : t[1]}`, action: () => editor.formatBlock(t) })),
      { label: 'Quote', icon: 'text-quote', checked: st.quote, action: () => editor.formatBlock('blockquote') },
      '-',
      { label: 'Clear formatting', icon: 'x', action: () => editor.exec('removeFormat') },
      { label: 'Template & style…', icon: 'palette', action: () => selectTab('style') },
    ];
    case 'view': return [
      { label: 'Markdown source', icon: 'file-code', checked: state.mode === 'source', action: () => setMode(state.mode === 'source' ? 'visual' : 'source') },
      { label: 'Page view', icon: 'files', checked: settings.pageView, action: () => togglePageView() },
      { label: 'Page size…', icon: 'rectangle-vertical', action: () => pageSizeMenu($('#page-size-btn')) },
      '-',
      { heading: 'Paper' },
      ...Object.entries(PAPER_LABEL).map(([k, label]) => ({ label, checked: settings.paper === k, action: () => setPaper(k) })),
      '-',
      { label: 'Side panel', icon: 'panel-right', checked: !$('#app').classList.contains('no-sidebar'), action: () => toggleSidebar() },
      { label: 'Focus mode', icon: 'focus', action: () => toggleFocus() },
      '-',
      { label: 'Zoom in', icon: 'zoom-in', shortcut: `${MOD}+`, action: () => setZoom(state.zoom + 0.1) },
      { label: 'Zoom out', icon: 'zoom-out', shortcut: `${MOD}−`, action: () => setZoom(state.zoom - 0.1) },
      { label: 'Actual size', action: () => setZoom(1) },
      '-',
      { label: 'Dark interface', icon: 'moon', checked: document.documentElement.dataset.theme === 'dark', action: () => { settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; saveSettings(); applySettings(); } },
    ];
    case 'tools': return [
      { label: 'Check document', icon: 'spell-check', shortcut: 'F7', action: () => { selectTab('proof'); proof.runFull(); } },
      { label: 'AI writing assistant', icon: 'sparkles', action: () => selectTab('assist') },
      { label: 'Rewrite document with AI…', icon: 'wand-sparkles', action: () => focusAiBox('assist') },
      { label: 'Restyle with AI…', icon: 'palette', action: () => focusAiBox('style') },
      { label: 'Word count & outline', icon: 'list-tree', action: () => selectTab('outline') },
      '-',
      { label: 'Proofreading settings…', icon: 'settings', action: () => openSettings('proof') },
      { label: 'AI model settings…', icon: 'cpu', action: () => openSettings('ai') },
    ];
    case 'help': return [
      { label: 'Keyboard shortcuts', icon: 'keyboard', shortcut: `${MOD}/`, action: shortcutsDialog },
      { label: 'Open the welcome guide', icon: 'book-open', action: openWelcome },
      { label: 'Privacy', icon: 'shield-check', action: () => openSettings('privacy') },
      { label: 'About Write Along', icon: 'info', action: aboutDialog },
    ];
  }
  return [];
}

function focusAiBox(tab) {
  selectTab(tab);
  const panel = $(`#panel-${tab}`);
  const box = [...panel.querySelectorAll('h3')].find((x) => /Rewrite whole document|Restyle with AI/.test(x.textContent));
  box?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  box?.parentElement.querySelector('textarea')?.focus({ preventScroll: true });
}

async function showGallery() {
  await openGallery({ currentCss: editor.css, onNew: (t) => newDocument(t.id, true), onApply: (t) => applyTemplate(t) });
}

async function openWelcome() {
  if (!(await confirmDiscard())) return;
  const md = await fetch('welcome.md').then((r) => r.text());
  const t = await loadTemplate(DEFAULT_TEMPLATE);
  await loadDocument({ name: 'Welcome to Write Along', md, css: t.css });
}

/* ================================================================ outline */

function renderOutline() {
  const root = $('#panel-outline');
  if (root.hidden) return;
  const st = editor.stats();
  const items = editor.outline();
  fill(root, 
    h('h3', 'Statistics'),
    h('div.stats-grid',
      h('div.stat', h('b', st.words.toLocaleString()), h('small', 'words')),
      h('div.stat', h('b', st.chars.toLocaleString()), h('small', 'characters (no spaces)')),
      h('div.stat', h('b', st.charsWithSpaces.toLocaleString()), h('small', 'characters')),
      h('div.stat', h('b', `${st.minutes} min`), h('small', 'reading time'))),
    h('h3', 'Outline'),
    items.length ? h('ul.outline-list', items.map((it) => h('li', h('button', { type: 'button', style: { paddingLeft: `${(it.level - 1) * 14 + 6}px`, fontWeight: it.level <= 2 ? 600 : 400 },
      onclick: () => it.el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, it.text || '(empty heading)'))))
      : h('p.help', 'Headings you add will appear here.'),
  );
}

/* ================================================================ toolbar state */

let toolbarQueued = false;
function updateToolbar() {
  if (toolbarQueued) return;
  toolbarQueued = true;
  requestAnimationFrame(() => {
    toolbarQueued = false;
    if (state.mode !== 'visual') return;
    const st = editor.state();
    for (const b of document.querySelectorAll('#toolbar [data-state]')) b.classList.toggle('active', !!st[b.dataset.state]);
    const sel = $('#block-select');
    if (document.activeElement !== sel) sel.value = /^(p|h[1-6]|pre)$/.test(st.block) ? st.block : 'p';
    $('#table-tools').hidden = !st.table;
  });
}

function updateStats() {
  const st = editor.stats();
  $('#stat-words').textContent = `${st.words.toLocaleString()} word${st.words === 1 ? '' : 's'}`;
  $('#stat-chars').textContent = `${st.charsWithSpaces.toLocaleString()} characters`;
  $('#stat-read').textContent = `${st.minutes} min read`;
}

/* ================================================================ service worker (offline + updates) */

function setOfflineState(ready, text) {
  const el = $('#offline-state');
  el.className = 'offline-state ' + (ready ? 'ready' : 'pending');
  el.textContent = text;
  el.title = ready ? 'Write Along is cached on this device and works without a connection.' : '';
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) { setOfflineState(false, 'No offline support'); return; }
  if (location.protocol === 'file:') return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    state.swReg = reg;
    const promptUpdate = (worker) => {
      toast('A new version of Write Along is ready.', { timeout: 0, actionLabel: 'Reload', action: async () => {
        await saveSession();
        worker.postMessage({ type: 'SKIP_WAITING' });
      } });
    };
    if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      setOfflineState(!!navigator.serviceWorker.controller, navigator.serviceWorker.controller ? 'Downloading update…' : 'Preparing offline mode…');
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed') {
          if (navigator.serviceWorker.controller) promptUpdate(w);
          else setOfflineState(true, 'Offline ready');
        }
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (state.everControlled && !reloading) { reloading = true; location.reload(); }
      state.everControlled = true;
    });
    state.everControlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'VERSION') state.swVersion = e.data.version; });
    await navigator.serviceWorker.ready;
    (navigator.serviceWorker.controller || reg.active)?.postMessage({ type: 'VERSION' });
    setOfflineState(true, navigator.onLine ? 'Offline ready' : 'Offline');
  } catch (err) {
    setOfflineState(false, 'Offline unavailable');
    console.warn('Service worker registration failed', err);
  }
}

async function checkForUpdate() {
  if (!state.swReg) return toast('Offline support is not active.');
  await state.swReg.update();
  if (!state.swReg.installing && !state.swReg.waiting) toast('You have the latest version.');
}

addEventListener('online', () => setOfflineState(true, 'Offline ready'));
addEventListener('offline', () => setOfflineState(true, 'Offline'));

/* ================================================================ wiring */

function bindUi() {
  // Menus
  for (const b of document.querySelectorAll('[data-menu]')) {
    b.addEventListener('click', () => showMenu(b, menuItems(b.dataset.menu)));
    b.addEventListener('mouseenter', () => { if (!$('#menu-layer').hidden && !b.classList.contains('open')) showMenu(b, menuItems(b.dataset.menu)); });
  }

  $('#menu-all').addEventListener('click', (e) => {
    const names = { file: 'File', edit: 'Edit', insert: 'Insert', format: 'Format', view: 'View', tools: 'Tools', help: 'Help' };
    showMenu(e.currentTarget, Object.entries(names).flatMap(([k, label], i) => [i ? '-' : null, { heading: label }, ...menuItems(k).filter((x) => x !== '-' && !x.heading)]));
  });

  // Toolbar
  $('#toolbar').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  $('#toolbar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.table) { editor.tableOp(b.dataset.table); return; }
    if (b.dataset.mode) { setMode(b.dataset.mode); return; }
    const cmd = b.dataset.cmd;
    if (!cmd) return;
    switch (cmd) {
      case 'code': editor.toggleInlineCode(); break;
      case 'link': editLink(); break;
      case 'task': editor.toggleTask(); break;
      case 'quote': editor.formatBlock('blockquote'); break;
      case 'image': pickImage(); break;
      case 'table': insertTableDialog(); break;
      case 'hr': editor.exec('insertHorizontalRule'); break;
      case 'pagebreak': editor.insertPageBreak(); break;
      default: editor.exec(cmd);
    }
    updateToolbar();
  });
  $('#block-select').addEventListener('change', (e) => { editor.formatBlock(e.target.value); editor.focus(); });

  // Buttons with data-action
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    switch (a.dataset.action) {
      case 'save': saveDocument(); break;
      case 'settings': openSettings(); break;
      case 'toggle-sidebar': toggleSidebar(); break;
      case 'check': selectTab('proof'); proof.runFull(); break;
      case 'zoom-in': setZoom(state.zoom + 0.1); break;
      case 'zoom-out': setZoom(state.zoom - 0.1); break;
      case 'zoom-reset': setZoom(1); break;
      case 'toggle-pages': togglePageView(); break;
      case 'paper': {
        const order = ['auto', 'light', 'dim', 'dark'];
        setPaper(order[(order.indexOf(settings.paper) + 1) % order.length]);
        toast(`Paper: ${PAPER_LABEL[settings.paper]}`, { timeout: 1800 });
        break;
      }
    }
  });

  for (const b of document.querySelectorAll('.tabs [data-tab]')) b.addEventListener('click', () => selectTab(b.dataset.tab));
  $('#page-size-btn').addEventListener('click', (e) => pageSizeMenu(e.currentTarget));

  // Document name
  const nameInput = $('#doc-name');
  nameInput.addEventListener('change', () => { renameDocument(nameInput.value); markDirty(); });
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { nameInput.blur(); editor.focus(); } });

  // Find bar
  $('#find-input').addEventListener('input', () => { find.index = 0; runFind(); });
  $('#find-case').addEventListener('change', runFind);
  $('#find-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); gotoMatch(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') closeFind();
  });
  $('#replace-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); replaceCurrent(); } if (e.key === 'Escape') closeFind(); });
  $('#findbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-find]');
    if (!b) return;
    ({ prev: () => gotoMatch(-1), next: () => gotoMatch(1), replace: replaceCurrent, all: replaceAll, close: closeFind })[b.dataset.find]();
  });

  // Source mode edits
  source.addEventListener('input', () => { markDirty(); });
  source.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); source.setRangeText('    ', source.selectionStart, source.selectionEnd, 'end'); markDirty(); }
  });

  // Keyboard shortcuts (the editor iframe forwards the ones it doesn't handle itself)
  addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 's') { e.preventDefault(); saveDocument(e.shiftKey); }
    else if (mod && k === 'o') { e.preventDefault(); openDocument(); }
    else if (mod && k === 'p') { e.preventDefault(); printDocument(); }
    else if (mod && k === 'k') { e.preventDefault(); editLink(); }
    else if (mod && k === 'f') { e.preventDefault(); openFind(); }
    else if (mod && k === '/') { e.preventDefault(); shortcutsDialog(); }
    else if (mod && (k === '=' || k === '+')) { e.preventDefault(); setZoom(state.zoom + 0.1); }
    else if (mod && k === '-') { e.preventDefault(); setZoom(state.zoom - 0.1); }
    else if (e.key === 'F7') { e.preventDefault(); selectTab('proof'); proof.runFull(); }
    else if (e.key === 'Escape') {
      if (popoverOpen()) hidePopover();
      else if (!$('#findbar').hidden) closeFind();
      else if ($('#app').classList.contains('focus')) toggleFocus(false);
    }
  });

  // Close popover when clicking elsewhere in the app
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#popover')) hidePopover(); });

  // Drag & drop documents anywhere
  let dragDepth = 0;
  addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { dragDepth++; $('#drop-hint').hidden = false; } });
  addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#drop-hint').hidden = true; } });
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    $('#drop-hint').hidden = true;
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) editor.insertImageBlob(file, file.name);
    else openDocument(file);
  });

  // PWA install prompt
  let installEvent = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('#install-btn').hidden = false; });
  $('#install-btn').addEventListener('click', async () => { installEvent?.prompt(); await installEvent?.userChoice; $('#install-btn').hidden = true; });

  // Persist on tab hide
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSession(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySettings);

  // Editor events
  editor.addEventListener('change', (e) => {
    if (!e.detail.initial) markDirty();
    updateStats();
    proof.onDocumentChange();
    hidePopover();
    if (!$('#panel-outline').hidden) renderOutline();
  });
  editor.addEventListener('selection', updateToolbar);
  editor.addEventListener('pages', updatePageStatus);
  editor.addEventListener('scroll', hidePopover);
  editor.addEventListener('edit-meta', editProperties);
  editor.addEventListener('image-click', (e) => imagePopover(e.detail));
  editor.addEventListener('link-click', (e) => linkPopover(e.detail));
  editor.addEventListener('file-drop', (e) => openDocument(e.detail));
  editor.addEventListener('doc-click', () => {
    const sel = editor.selection();
    if (!sel || !sel.isCollapsed) { hidePopover(); return; }
    const issues = proof.issuesAt(sel.focusNode, sel.focusOffset);
    if (issues.length) showIssuePopover(editor, proof, issues, getSettings, saveSettings);
    else { hidePopover(); proof.setActive(null); }
  });
  editor.doc.addEventListener('pointerdown', () => { hidePopover(); closeMenu(); });
  editor.doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (popoverOpen()) hidePopover();
    else if (!$('#findbar').hidden) closeFind();
    else if ($('#app').classList.contains('focus')) toggleFocus(false);
  });
}

function initPanels() {
  panels.proof = initProofPanel({ root: $('#panel-proof'), proof, editor, getSettings, saveSettings, openSettings,
    setBadge: (n) => { const b = $('#issue-badge'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; } });
  panels.assist = initAssist({ root: $('#panel-assist'), editor, getSettings, saveSettings, openSettings });
  panels.style = initStylePanel({ root: $('#panel-style'), getCss: () => editor.css, setCss, onBrowse: showGallery, onExportCss: () => exportAs('css') });
  review = createReviewBar($('#reviewbar'));
  const rewriteBox = h('div', { style: { marginTop: '18px' } });
  $('#panel-assist').append(rewriteBox);
  panels.rewrite = initAiRewrite({ root: rewriteBox, getSettings, openSettings, getMarkdown: currentMarkdown, replaceMarkdown, review });
  const styleBox = h('div');
  const stylePanel = $('#panel-style');
  stylePanel.insertBefore(styleBox, stylePanel.children[2] || null);
  initAiStyle({ root: styleBox, getSettings, openSettings, getCss: () => editor.css, setCss, review, getPageBackground: () => {
    // Resolve the template's --page-background (the body itself may be painted with a gradient in page view).
    const probe = editor.doc.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;background-color:var(--page-background, #fff)';
    editor.doc.documentElement.append(probe);
    const [r, g, b, a = 1] = (editor.win.getComputedStyle(probe).backgroundColor.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
    probe.remove();
    return a < 0.5 ? '#ffffff' : '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
  } });
  proof.addEventListener('status', () => { $('#proof-status').textContent = proof.status.split('\n')[0]; });
}

/* ================================================================ boot */

async function boot() {
  await editor.init();
  bindUi();
  initPanels();
  applySettings();
  setZoom(state.zoom);
  const narrow = matchMedia('(max-width: 900px)').matches;
  const wasOpen = settings.sidebarOpen;
  selectTab(settings.sidebar || 'proof');
  toggleSidebar(wasOpen && !narrow, false);
  settings.sidebarOpen = wasOpen;
  saveSettings();

  try {
    const key = await finishOpenRouterLogin();
    if (key) {
      (settings.providers.openrouter ||= {}).apiKey = key;
      settings.provider = 'openrouter';
      saveSettings();
      toast('Signed in with OpenRouter. The key is stored only in this browser.');
    }
  } catch (err) {
    toast(err.message, { error: true });
  }

  let launched = false;
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      if (!params.files?.length) return;
      launched = true;
      const handle = params.files[0];
      await openDocument(await handle.getFile(), handle);
    });
  }

  const session = await idbGet('session').catch(() => null);
  if (!launched) {
    if (session && (session.md || session.css)) {
      await loadDocument(session);
    } else {
      const md = await fetch('welcome.md').then((r) => (r.ok ? r.text() : '')).catch(() => '');
      const t = await loadTemplate(DEFAULT_TEMPLATE);
      await loadDocument({ name: md ? 'Welcome to Write Along' : 'Untitled', md, css: t.css });
    }
  }
  updateStats();
  registerServiceWorker();
  navigator.storage?.persist?.().catch(() => {});
}

boot().catch((err) => {
  console.error(err);
  toast(`Write Along failed to start: ${err.message}`, { error: true, timeout: 0 });
});

// Exposed for debugging from the console and for automated tests.
export { editor, proof, settings };
