/**
 * Write Along — Main Application Bootstrap (app/main.js)
 */
import { WA_VERSION } from '../runtime/render.js';
import {
  createAppState,
  DEFAULT_CONTENT,
  DEFAULT_CSS,
  saveAutosaveDraft,
  loadAutosaveDraft,
} from './state.js';
import { createThemeController } from './theme.js';
import { createCodeEditor } from './editor.js';
import { createPreviewController } from './preview.js';
import { setupMenusAndToolbar } from './toolbar.js';
import { createTemplatesGallery } from './templates.js';
import {
  supportsDirectoryPicker,
  openWaDirectory,
  saveWaToHandle,
  saveWaAsDirectory,
  importFromFileList,
  importFromZipFile,
  addImageBlobsToDoc,
} from './fs.js';
import { exportToPdf, exportStandaloneHtml, exportWaZip } from './export.js';
import {
  createPageSetupController,
  parsePageSetupFromCss,
  formatPageSetupSummary,
} from './page-setup.js';

function showToast(message, { actionLabel, onAction, durationMs = 3600 } = {}) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'wa-toast';
  const span = document.createElement('span');
  span.textContent = message;
  toast.appendChild(span);

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.className = 'wa-btn-sm';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      onAction();
      toast.remove();
    });
    toast.appendChild(btn);
  }

  container.appendChild(toast);
  if (durationMs > 0) {
    setTimeout(() => toast.remove(), durationMs);
  }
}

function countWords(md) {
  const stripped = String(md || '')
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>\-\[\]()]/g, ' ');
  const tokens = stripped.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

async function boot() {
  const appEl = document.getElementById('app');
  const docNameLabel = document.getElementById('doc-name-label');
  const docDirtyDot = document.getElementById('doc-dirty-dot');
  const statusFsMode = document.getElementById('status-fs-mode');
  const statusWords = document.getElementById('status-words');
  const statusPages = document.getElementById('status-pages');
  const statusPageSetup = document.getElementById('status-page-setup');
  const statusAutosave = document.getElementById('status-autosave');
  const statusZoom = document.getElementById('status-zoom');
  const statusVersion = document.getElementById('status-version');
  const imagesBadge = document.getElementById('images-count-badge');
  const guideBanner = document.getElementById('guide-banner');
  const btnModeEdit = document.getElementById('btn-mode-edit');
  const btnModeRead = document.getElementById('btn-mode-read');
  const btnRevertStyle = document.getElementById('btn-revert-style');
  const previewFrame = document.getElementById('preview-frame');
  const editorHost = document.getElementById('editor-host');

  statusVersion.textContent = `v${WA_VERSION}`;

  const store = createAppState();
  const preview = createPreviewController(previewFrame, {
    onPageMetrics: ({ currentPage, pageCount }) => {
      if (statusPages) {
        statusPages.textContent = pageCount === 1 ? 'Page 1 of 1' : `Page ${currentPage} of ${pageCount}`;
      }
    },
  });
  await preview.init();

  // Check IndexedDB autosave draft
  const savedDraft = await loadAutosaveDraft();
  if (savedDraft && savedDraft.content) {
    const imgMap = new Map(savedDraft.images || []);
    store.loadDocument({
      name: savedDraft.name || 'untitled.wa',
      content: savedDraft.content,
      css: savedDraft.css || DEFAULT_CSS,
      images: imgMap,
      handle: null,
      dirty: false,
    });
  }

  let editor = null;
  const theme = createThemeController((resolved) => {
    editor?.setTheme(resolved === 'dark');
  });

  editor = createCodeEditor(editorHost, {
    initialContent: store.state.doc.content,
    initialCss: store.state.doc.css,
    isDark: theme.getResolved() === 'dark',
    onChangeContent: (val) => store.setContent(val),
    onChangeCss: (val) => store.setCss(val),
    onDropImages: (files) => handleInsertImages(files),
  });

  // Wire up Edit -> Page Setup… modal
  const pageSetup = createPageSetupController({
    getCss: () => store.state.doc.css,
    onApply: (updatedCss, setup) => {
      editor.replaceCssOnly(updatedCss);
      store.setCss(updatedCss);
      showToast(`Page Setup updated: ${formatPageSetupSummary(setup)}`);
    },
  });

  // Wire up Templates Gallery
  const gallery = createTemplatesGallery({
    onPreviewTemplate: ({ name, content, css, images }) => {
      store.loadDocument({ name, content, css, images, handle: null, dirty: false });
      editor.replaceDocuments(content, css);
    },
    onApplyStyle: ({ css, images }) => {
      store.applyTemplateStyle(css, images);
      editor.replaceCssOnly(css);
    },
    showToast,
  });

  // Autosave debounce
  let autosaveTimer = null;
  function queueAutosave() {
    clearTimeout(autosaveTimer);
    statusAutosave.textContent = 'Saving draft…';
    autosaveTimer = setTimeout(async () => {
      await saveAutosaveDraft(store.state.doc);
      statusAutosave.textContent = 'Draft saved';
    }, 1500);
  }

  // Subscribe UI + Live Preview to state changes
  function syncUi(state, changeType) {
    appEl.setAttribute('data-mode', state.viewingGuide ? 'read' : state.mode);
    btnModeEdit.classList.toggle('active', !state.viewingGuide && state.mode === 'edit');
    btnModeRead.classList.toggle('active', state.viewingGuide || state.mode === 'read');
    btnModeEdit.setAttribute('aria-pressed', String(!state.viewingGuide && state.mode === 'edit'));
    btnModeRead.setAttribute('aria-pressed', String(state.viewingGuide || state.mode === 'read'));
    guideBanner.hidden = !state.viewingGuide;

    docNameLabel.textContent = state.doc.name;
    docDirtyDot.hidden = !state.dirty;
    document.title = `${state.dirty ? '● ' : ''}${state.doc.name} — Write Along`;

    const imgCount = state.doc.images.size;
    imagesBadge.textContent = `${imgCount} ${imgCount === 1 ? 'image' : 'images'}`;
    statusWords.textContent = `${countWords(state.doc.content).toLocaleString()} words`;
    if (statusPageSetup) {
      statusPageSetup.textContent = formatPageSetupSummary(parsePageSetupFromCss(state.doc.css));
    }
    statusZoom.textContent = `${Math.round(state.zoom * 100)}%`;

    if (state.doc.handle) {
      statusFsMode.textContent = `Folder: ${state.doc.name}`;
    } else if (supportsDirectoryPicker()) {
      statusFsMode.textContent = 'Local Draft';
    } else {
      statusFsMode.textContent = 'Zip Fallback Mode';
    }

    if (btnRevertStyle) {
      btnRevertStyle.disabled = state.previousStyleCss === null;
    }

    if (!state.viewingGuide) {
      if (changeType === 'content' || changeType === 'css') {
        preview.scheduleRender({
          content: state.doc.content,
          css: state.doc.css,
          images: state.doc.images,
          pageGrid: state.pageGrid,
          zoom: state.zoom,
        });
        queueAutosave();
      } else {
        preview.renderNow({
          content: state.doc.content,
          css: state.doc.css,
          images: state.doc.images,
          pageGrid: state.pageGrid,
          zoom: state.zoom,
        });
        if (changeType === 'document' || changeType === 'style-applied') {
          queueAutosave();
        }
      }
    }
  }

  store.subscribe(syncUi);
  syncUi(store.state, 'init');

  // Tabs (content.md / style.css)
  const tabs = Array.from(document.querySelectorAll('.wa-tab'));
  for (const tabBtn of tabs) {
    tabBtn.addEventListener('click', () => {
      const tab = tabBtn.getAttribute('data-tab');
      store.state.activeTab = tab;
      for (const b of tabs) {
        const active = b.getAttribute('data-tab') === tab;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      }
      editor.switchTab(tab);
    });
  }

  // Draggable split divider
  const divider = document.getElementById('split-divider');
  const editorPane = document.getElementById('editor-pane');
  const workspace = document.getElementById('workspace');
  let dragging = false;

  divider.addEventListener('mousedown', () => {
    dragging = true;
    divider.classList.add('dragging');
    previewFrame.style.pointerEvents = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const pct = Math.min(75, Math.max(22, ((e.clientX - rect.left) / rect.width) * 100));
    editorPane.style.width = `${pct}%`;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    previewFrame.style.pointerEvents = '';
  });

  // Theme toggle button
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const mode = theme.cycle();
    showToast(`Theme: ${mode === 'auto' ? 'System Default' : mode === 'dark' ? 'Dark (dimmed preview)' : 'Light'}`);
  });

  // Guide close button
  document.getElementById('btn-close-guide').addEventListener('click', () => {
    store.state.viewingGuide = false;
    store.emit('mode');
  });

  // Modal close handlers
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close-modal');
      document.getElementById(id).hidden = true;
    });
  });
  document.querySelectorAll('.wa-modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => {
      if (e.target === bd) bd.hidden = true;
    });
  });

  // Hidden file inputs
  const dirFallbackInput = document.getElementById('input-dir-fallback');
  const zipFileInput = document.getElementById('input-zip-file');
  const imageFileInput = document.getElementById('input-image-file');

  dirFallbackInput.addEventListener('change', async () => {
    try {
      const loaded = await importFromFileList(dirFallbackInput.files);
      if (loaded) {
        store.loadDocument(loaded);
        editor.replaceDocuments(loaded.content, loaded.css);
        showToast(`Opened ${loaded.name} (use Save or Export .wa.zip to download changes).`);
      }
    } catch (err) {
      showToast(`Open failed: ${err.message}`);
    } finally {
      dirFallbackInput.value = '';
    }
  });

  zipFileInput.addEventListener('change', async () => {
    const file = zipFileInput.files?.[0];
    if (!file) return;
    try {
      const loaded = await importFromZipFile(file);
      store.loadDocument(loaded);
      editor.replaceDocuments(loaded.content, loaded.css);
      showToast(`Imported ${loaded.name} from zip.`);
    } catch (err) {
      showToast(`Zip import failed: ${err.message}`);
    } finally {
      zipFileInput.value = '';
    }
  });

  imageFileInput.addEventListener('change', () => {
    const files = Array.from(imageFileInput.files || []);
    if (files.length > 0) handleInsertImages(files);
    imageFileInput.value = '';
  });

  function handleInsertImages(files) {
    const paths = addImageBlobsToDoc(store.state.doc, files);
    const mdLines = paths.map((p) => {
      const alt = p.replace(/^images\//, '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      return `![${alt}](${p})`;
    });
    editor.insertBlock(mdLines.join('\n\n'));
    store.state.dirty = true;
    store.emit('content');
    showToast(`Added ${paths.length} image${paths.length > 1 ? 's' : ''} to images/.`);
  }

  async function openSyntaxGuide() {
    try {
      const [mdRes, cssRes] = await Promise.all([
        fetch('./docs/syntax.wa/content.md'),
        fetch('./docs/syntax.wa/style.css'),
      ]);
      const md = await mdRes.text();
      const css = await cssRes.text();
      store.state.viewingGuide = true;
      store.emit('mode');
      preview.renderNow({
        content: md,
        css,
        images: new Map(),
        pageGrid: false,
        zoom: store.state.zoom,
        baseAssetUrl: new URL('./docs/syntax.wa/', window.location.href).href,
      });
    } catch (err) {
      showToast(`Could not load Syntax Guide: ${err.message}`);
    }
  }

  function showInfoModal(title, htmlContent) {
    document.getElementById('info-modal-title').textContent = title;
    document.getElementById('info-modal-body').innerHTML = htmlContent;
    document.getElementById('modal-info').hidden = false;
  }

  // Action Dispatcher (Menus, Toolbar, Keyboard Shortcuts)
  async function dispatchAction(action) {
    switch (action) {
      case 'file:new':
        store.loadDocument({
          name: 'untitled.wa',
          content: DEFAULT_CONTENT,
          css: DEFAULT_CSS,
          images: new Map(),
          handle: null,
          dirty: false,
        });
        editor.replaceDocuments(DEFAULT_CONTENT, DEFAULT_CSS);
        showToast('Created new document.');
        break;

      case 'file:open':
        if (supportsDirectoryPicker()) {
          try {
            const loaded = await openWaDirectory();
            store.loadDocument(loaded);
            editor.replaceDocuments(loaded.content, loaded.css);
            showToast(`Opened ${loaded.name}`);
          } catch (err) {
            if (err.name !== 'AbortError') showToast(`Open error: ${err.message}`);
          }
        } else {
          showToast('File System Access API is unavailable in this browser; opening folder import fallback.');
          dirFallbackInput.click();
        }
        break;

      case 'file:import-zip':
        zipFileInput.click();
        break;

      case 'file:save':
        try {
          if (store.state.doc.handle) {
            await saveWaToHandle(store.state.doc.handle, store.state.doc);
            store.state.dirty = false;
            store.emit('save');
            showToast(`Saved ${store.state.doc.name}`);
          } else if (supportsDirectoryPicker()) {
            const saved = await saveWaAsDirectory(store.state.doc);
            store.state.doc.handle = saved.handle;
            store.state.doc.name = saved.name;
            store.state.dirty = false;
            store.emit('save');
            showToast(`Saved ${saved.name}`);
          } else {
            await exportWaZip(store.state.doc);
            store.state.dirty = false;
            store.emit('save');
            showToast('Exported .wa.zip (browser fallback for direct folder write).');
          }
        } catch (err) {
          if (err.name !== 'AbortError') showToast(`Save error: ${err.message}`);
        }
        break;

      case 'file:save-as':
        if (supportsDirectoryPicker()) {
          try {
            const saved = await saveWaAsDirectory(store.state.doc);
            store.state.doc.handle = saved.handle;
            store.state.doc.name = saved.name;
            store.state.dirty = false;
            store.emit('save');
            showToast(`Saved as ${saved.name}`);
          } catch (err) {
            if (err.name !== 'AbortError') showToast(`Save As error: ${err.message}`);
          }
        } else {
          await exportWaZip(store.state.doc);
          showToast('Exported .wa.zip archive.');
        }
        break;

      case 'file:close':
        store.loadDocument({
          name: 'untitled.wa',
          content: DEFAULT_CONTENT,
          css: DEFAULT_CSS,
          images: new Map(),
          handle: null,
          dirty: false,
        });
        editor.replaceDocuments(DEFAULT_CONTENT, DEFAULT_CSS);
        break;

      case 'export:pdf':
        await exportToPdf(store.state.doc, preview.getBaseCss());
        break;

      case 'export:html':
        showToast('Building self-contained offline HTML…');
        await exportStandaloneHtml(store.state.doc, preview.getBaseCss());
        showToast('Exported standalone HTML (with embedded CSS, fonts & images).');
        break;

      case 'export:zip':
        await exportWaZip(store.state.doc);
        showToast('Exported .wa.zip archive.');
        break;

      // Edit
      case 'edit:undo': editor.undo(); break;
      case 'edit:redo': editor.redo(); break;
      case 'edit:find': editor.openSearch(); break;
      case 'edit:select-all': editor.selectAll(); break;
      case 'edit:page-setup': pageSetup.open(); break;

      // Insert
      case 'insert:image': imageFileInput.click(); break;
      case 'insert:table':
        editor.insertBlock('| Column A | Column B | Column C |\n|---|---|---|\n| Value 1 | Value 2 | Value 3 |\n| Value 4 | Value 5 | Value 6 |');
        break;
      case 'insert:link':
        editor.wrapSelection('[', '](https://example.com)', 'link text');
        break;
      case 'insert:codeblock':
        editor.insertBlock('```javascript\nconsole.log("Hello, Write Along!");\n```');
        break;
      case 'insert:callout-note':
        editor.insertBlock('> [!NOTE]\n> Add important context or an explanatory remark here.');
        break;
      case 'insert:callout-tip':
        editor.insertBlock('> [!TIP]\n> Share a practical shortcut or best practice here.');
        break;
      case 'insert:callout-warning':
        editor.insertBlock('> [!WARNING]\n> Highlight a caveat or important constraint here.');
        break;
      case 'insert:pagebreak':
        editor.insertBlock('---\n<!-- pagebreak -->');
        break;
      case 'insert:toc':
        editor.insertBlock('[TOC]');
        break;
      case 'insert:footnote':
        editor.wrapSelection('', '[^1]\n\n[^1]: Footnote explanation.', 'statement');
        break;

      // Format
      case 'format:bold': editor.wrapSelection('**', '**', 'bold text'); break;
      case 'format:italic': editor.wrapSelection('*', '*', 'italic text'); break;
      case 'format:strike': editor.wrapSelection('~~', '~~', 'strikethrough'); break;
      case 'format:code': editor.wrapSelection('`', '`', 'code'); break;
      case 'format:p': editor.setLinePrefix('', /^#{1,6}\s+/); break;
      case 'format:h1': editor.setLinePrefix('# '); break;
      case 'format:h2': editor.setLinePrefix('## '); break;
      case 'format:h3': editor.setLinePrefix('### '); break;
      case 'format:h4': editor.setLinePrefix('#### '); break;
      case 'format:h5': editor.setLinePrefix('##### '); break;
      case 'format:h6': editor.setLinePrefix('###### '); break;
      case 'format:ul': editor.setLinePrefix('- ', /^([-*+]|\d+\.)\s+/); break;
      case 'format:ol': editor.setLinePrefix('1. ', /^([-*+]|\d+\.)\s+/); break;
      case 'format:task': editor.setLinePrefix('- [ ] ', /^([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/); break;
      case 'format:quote': editor.setLinePrefix('> ', /^>\s?/); break;

      // View
      case 'view:edit':
        store.state.viewingGuide = false;
        store.state.mode = 'edit';
        store.emit('mode');
        break;
      case 'view:read':
        store.state.viewingGuide = false;
        store.state.mode = 'read';
        store.emit('mode');
        break;
      case 'view:zoom-in':
        store.state.zoom = Math.min(1.6, Math.round((store.state.zoom + 0.1) * 10) / 10);
        preview.applyZoom(store.state.zoom);
        store.emit('zoom');
        break;
      case 'view:zoom-out':
        store.state.zoom = Math.max(0.6, Math.round((store.state.zoom - 0.1) * 10) / 10);
        preview.applyZoom(store.state.zoom);
        store.emit('zoom');
        break;
      case 'view:zoom-reset':
        store.state.zoom = 1.0;
        preview.applyZoom(1.0);
        store.emit('zoom');
        break;
      case 'view:page-grid':
        store.state.pageGrid = !store.state.pageGrid;
        store.emit('mode');
        break;

      // Theme
      case 'theme:auto': theme.setOverride('auto'); showToast('Theme: System Default'); break;
      case 'theme:light': theme.setOverride('light'); showToast('Theme: Light'); break;
      case 'theme:dark': theme.setOverride('dark'); showToast('Theme: Dark (dimmed preview)'); break;

      // Templates
      case 'templates:open':
        await gallery.open();
        break;
      case 'templates:revert-style':
        if (store.revertTemplateStyle()) {
          editor.replaceCssOnly(store.state.doc.css);
          showToast('Reverted to previous style.css.');
        }
        break;

      // Help
      case 'help:syntax':
        await openSyntaxGuide();
        break;
      case 'help:shortcuts':
        showInfoModal(
          'Keyboard Shortcuts',
          `<table class="wa-shortcuts-table">
            <tr><td><kbd>Ctrl+E</kbd></td><td>Toggle Edit / Read Mode</td></tr>
            <tr><td><kbd>Ctrl+S</kbd></td><td>Save .wa Folder</td></tr>
            <tr><td><kbd>Ctrl+O</kbd></td><td>Open .wa Folder</td></tr>
            <tr><td><kbd>Ctrl+N</kbd></td><td>New Document</td></tr>
            <tr><td><kbd>Ctrl+Shift+T</kbd></td><td>Open Template Gallery</td></tr>
            <tr><td><kbd>Ctrl+Shift+P</kbd></td><td>Page Setup (Size, Margins, Orientation)</td></tr>
            <tr><td><kbd>Ctrl+P</kbd></td><td>Export PDF (Print)</td></tr>
            <tr><td><kbd>Ctrl+B</kbd> / <kbd>Ctrl+I</kbd></td><td>Bold / Italic</td></tr>
            <tr><td><kbd>Ctrl+K</kbd></td><td>Insert Link</td></tr>
            <tr><td><kbd>Ctrl+F</kbd></td><td>Find &amp; Replace</td></tr>
            <tr><td><kbd>F1</kbd></td><td>Open Syntax &amp; Template Guide</td></tr>
          </table>`
        );
        break;
      case 'help:about':
        showInfoModal(
          'About Write Along',
          `<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
            <img src="./app/icon.svg" alt="Write Along Logo" width="52" height="52" style="border-radius:10px;">
            <div>
              <strong style="font-size:15px;">Write Along v${WA_VERSION}</strong><br>
              <span style="color:var(--ui-muted)">Markdown word processor with publication-grade CSS templates</span>
            </div>
          </div>
          <p>Every document is a transparent <code>.wa</code> folder containing strict GitHub Flavored Markdown (<code>content.md</code>), plain CSS (<code>style.css</code>), embedded media (<code>images/</code>), a portable static viewer (<code>read.html</code>), and an AI-ready reference (<code>syntax.md</code>).</p>
          <p>Works completely offline via Service Worker precaching with print-identical screen preview.</p>`
        );
        break;
    }
  }

  setupMenusAndToolbar(dispatchAction);

  // Global keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F1') {
      e.preventDefault();
      dispatchAction('help:syntax');
    } else if (e.key === 'Escape') {
      document.getElementById('modal-templates').hidden = true;
      document.getElementById('modal-info').hidden = true;
      document.getElementById('modal-page-setup').hidden = true;
    } else if (mod && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      dispatchAction(store.state.mode === 'edit' ? 'view:read' : 'view:edit');
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      dispatchAction(e.shiftKey ? 'file:save-as' : 'file:save');
    } else if (mod && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      dispatchAction('file:open');
    } else if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      dispatchAction('edit:page-setup');
    } else if (mod && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      dispatchAction('export:pdf');
    } else if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      dispatchAction('templates:open');
    } else if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      dispatchAction('format:bold');
    } else if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      dispatchAction('format:italic');
    } else if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dispatchAction('insert:link');
    }
  });

  // Register Service Worker for offline operation + update toast
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const notifyUpdate = (worker) => {
        showToast('A new version of Write Along is available.', {
          actionLabel: 'Reload',
          durationMs: 0,
          onAction: () => {
            worker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          },
        });
      };

      if (reg.waiting) notifyUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate(nw);
          }
        });
      });
    } catch (_err) {
      // ignore SW failure in restricted contexts
    }
  }

  // Expose debug handle for automated browser verification
  window.__WA_APP__ = { store, editor, preview, gallery, theme, dispatchAction };
}

boot();
