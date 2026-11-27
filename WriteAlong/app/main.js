/**
 * Write Along — Main Application Bootstrap (app/main.js)
 */
import { WA_VERSION, WA_READER_FILENAME } from '../runtime/render.js';
import {
  createAppState,
  buildStarterContent,
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
import { createFileDialogsController } from './file-dialogs.js';
import { createImagesPanelController } from './images-panel.js';
import { createScrollSyncController } from './scroll-sync.js';
import {
  supportsOpenFilePicker,
  supportsSaveFilePicker,
  openWaZipFile,
  saveWaZipToHandle,
  saveWaZipAsFile,
  importFromZipFile,
  parseWaZipBytes,
  addImageBlobsToDoc,
} from './fs.js';
import {
  exportToPdf,
  exportStandaloneHtml,
  exportWaZip,
} from './export.js';
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

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const btnSyncScroll = document.getElementById('btn-sync-scroll');
  const menuSyncScroll = document.getElementById('menu-sync-scroll');
  const menuSyncCheck = document.getElementById('menu-sync-check');
  const previewFrame = document.getElementById('preview-frame');
  const editorHost = document.getElementById('editor-host');
  const imagesHost = document.getElementById('images-panel');

  statusVersion.textContent = `v${WA_VERSION}`;

  const store = createAppState();
  let scrollSync = null;
  let imagesPanel = null;
  let editor = null;

  const preview = createPreviewController(previewFrame, {
    onPageMetrics: ({ currentPage, pageCount }) => {
      if (statusPages) {
        statusPages.textContent = pageCount === 1 ? 'Page 1 of 1' : `Page ${currentPage} of ${pageCount}`;
      }
    },
    onRendered: () => {
      scrollSync?.bindPreviewListener();
      scrollSync?.rebuildAnchors();
    },
  });
  await preview.init();

  // Check IndexedDB autosave draft (auto-normalizes legacy v1.x *.wa names to *.wa.zip)
  const savedDraft = await loadAutosaveDraft();
  if (savedDraft && savedDraft.content) {
    const imgMap = new Map(savedDraft.images || []);
    store.loadDocument({
      name: savedDraft.name || 'untitled.wa.zip',
      content: savedDraft.content,
      css: savedDraft.css || DEFAULT_CSS,
      images: imgMap,
      handle: null,
      dirty: false,
    });
  }

  const theme = createThemeController((resolved) => {
    editor?.setTheme(resolved === 'dark');
  });

  // Unified tab switcher (content.md | style.css | images/)
  const tabs = Array.from(document.querySelectorAll('.wa-tab'));
  function switchEditorTab(tab) {
    if (!['content', 'css', 'images'].includes(tab)) return;
    store.state.activeTab = tab;
    for (const b of tabs) {
      const active = b.getAttribute('data-tab') === tab;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    }
    if (tab === 'images') {
      editorHost.hidden = true;
      imagesHost.hidden = false;
      imagesPanel?.render();
    } else {
      imagesHost.hidden = true;
      editorHost.hidden = false;
      editor?.switchTab(tab);
      if (tab === 'content') {
        scrollSync?.rebuildAnchors();
      }
    }
  }

  for (const tabBtn of tabs) {
    tabBtn.addEventListener('click', () => {
      switchEditorTab(tabBtn.getAttribute('data-tab'));
    });
  }

  editor = createCodeEditor(editorHost, {
    initialContent: store.state.doc.content,
    initialCss: store.state.doc.css,
    isDark: theme.getResolved() === 'dark',
    onChangeContent: (val) => store.setContent(val),
    onChangeCss: (val) => store.setCss(val),
    onDropImages: (files) => handleInsertImages(files),
    onRequestMarkdownTab: () => switchEditorTab('content'),
  });

  // Bidirectional Scroll Sync (content.md <-> preview)
  scrollSync = createScrollSyncController({ editor, previewFrame, store });
  scrollSync.bindPreviewListener();
  preview.setFeedbackWrapper((fn) => scrollSync.runWithoutFeedback(fn));

  function showInfoModal(title, htmlContent) {
    document.getElementById('info-modal-title').textContent = title;
    document.getElementById('info-modal-body').innerHTML = htmlContent;
    document.getElementById('modal-info').hidden = false;
  }

  // Images Tab Manager
  imagesPanel = createImagesPanelController({
    hostEl: imagesHost,
    store,
    onInsertMarkdown: (mdSnippet) => {
      switchEditorTab('content');
      editor.insertBlock(mdSnippet);
    },
    onUpdateDocumentRefs: ({ content, css }) => {
      if (content !== null) {
        editor.replaceContentOnly(content);
      }
      if (css !== null) {
        editor.replaceCssOnly(css);
      }
    },
    onOpenLightbox: ({ imgPath, shortName, url, sizeLabel, dims, refCount }) => {
      showInfoModal(
        shortName,
        `<div style="text-align:center;margin-bottom:12px;background:var(--ui-bg);border:1px solid var(--ui-border);border-radius:8px;padding:14px;">
          <img src="${url}" alt="${escapeHtml(shortName)}" style="max-width:100%;max-height:52vh;object-fit:contain;display:inline-block;">
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ui-muted);">
          <span><strong>Path:</strong> <code>${escapeHtml(imgPath)}</code></span>
          ${dims ? `<span><strong>Dimensions:</strong> ${escapeHtml(dims)} px</span>` : ''}
          <span><strong>Size:</strong> ${escapeHtml(sizeLabel)}</span>
          <span><strong>References:</strong> ${refCount}</span>
        </div>`
      );
    },
    showToast,
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

  // Save helpers (canonical flat-root .wa.zip with live wa-reader.<version>.html)
  async function performSaveFile(chosenName) {
    statusAutosave.textContent = 'Saving .wa.zip…';
    try {
      const saved = await saveWaZipAsFile(store.state.doc, { chosenName });
      store.state.doc.handle = saved.handle;
      store.state.doc.name = saved.name;
      store.state.dirty = false;
      store.emit('save');
      statusAutosave.textContent = 'Saved';
      showToast(`Saved ${saved.name}`);
    } catch (err) {
      statusAutosave.textContent = 'Ready';
      if (err.name !== 'AbortError') showToast(`Save error: ${err.message}`);
    }
  }

  async function performSaveDownload(chosenName) {
    statusAutosave.textContent = 'Packaging .wa.zip…';
    try {
      if (chosenName) {
        store.setName(chosenName, { markDirty: false, detachHandle: false });
      }
      await exportWaZip(store.state.doc);
      store.state.dirty = false;
      store.emit('save');
      statusAutosave.textContent = 'Saved';
      showToast(`Downloaded ${store.state.doc.name}`);
    } catch (err) {
      statusAutosave.textContent = 'Ready';
      showToast(`Save error: ${err.message}`);
    }
  }

  // Wire up Filename Dialogs (New Document, Inline Rename, Save / Save As)
  const fileDialogs = createFileDialogsController({
    store,
    onCreateNew: ({ name, title }) => {
      const starterMd = buildStarterContent(title);
      store.loadDocument({
        name,
        content: starterMd,
        css: DEFAULT_CSS,
        images: new Map(),
        handle: null,
        dirty: false,
      });
      editor.replaceDocuments(starterMd, DEFAULT_CSS);
      switchEditorTab('content');
      showToast(`Created ${name}`);
    },
    onSaveFile: performSaveFile,
    onSaveDownload: performSaveDownload,
    onOpenTemplates: () => gallery.open(),
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
    imagesBadge.textContent = String(imgCount);
    imagesBadge.title = `${imgCount} ${imgCount === 1 ? 'image' : 'images'} in images/`;
    statusWords.textContent = `${countWords(state.doc.content).toLocaleString()} words`;
    if (statusPageSetup) {
      statusPageSetup.textContent = formatPageSetupSummary(parsePageSetupFromCss(state.doc.css));
    }
    statusZoom.textContent = `${Math.round(state.zoom * 100)}%`;

    if (btnSyncScroll) {
      btnSyncScroll.classList.toggle('active', state.syncScroll);
      btnSyncScroll.setAttribute('aria-pressed', String(state.syncScroll));
    }
    if (menuSyncScroll) {
      menuSyncScroll.setAttribute('aria-checked', String(state.syncScroll));
    }
    if (menuSyncCheck) {
      menuSyncCheck.textContent = state.syncScroll ? '✓' : '';
    }

    if (state.doc.handle) {
      statusFsMode.textContent = `File: ${state.doc.name}`;
    } else if (supportsSaveFilePicker()) {
      statusFsMode.textContent = 'Local Draft';
    } else {
      statusFsMode.textContent = 'Draft (Download Save)';
    }

    if (btnRevertStyle) {
      btnRevertStyle.disabled = state.previousStyleCss === null;
    }

    if (state.activeTab === 'images' && ['images', 'document', 'content', 'css', 'style-applied', 'init'].includes(changeType)) {
      imagesPanel?.render();
    }

    if (changeType === 'name') {
      queueAutosave();
      return;
    }
    if (changeType === 'sync-scroll' || changeType === 'save') {
      return;
    }

    if (!state.viewingGuide) {
      if (changeType === 'content' || changeType === 'css') {
        preview.scheduleRender({
          content: state.doc.content,
          css: state.doc.css,
          images: state.doc.images,
          pageGrid: state.pageGrid,
          zoom: state.zoom,
          includeSourceMap: true,
        });
        queueAutosave();
      } else {
        preview.renderNow({
          content: state.doc.content,
          css: state.doc.css,
          images: state.doc.images,
          pageGrid: state.pageGrid,
          zoom: state.zoom,
          includeSourceMap: true,
        });
        if (changeType === 'document' || changeType === 'style-applied' || changeType === 'images') {
          queueAutosave();
        }
      }
    }
  }

  store.subscribe(syncUi);
  syncUi(store.state, 'init');

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
    scrollSync?.rebuildAnchors();
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
  const zipFileInput = document.getElementById('input-zip-file');
  const imageFileInput = document.getElementById('input-image-file');

  zipFileInput.addEventListener('change', async () => {
    const file = zipFileInput.files?.[0];
    if (!file) return;
    try {
      const loaded = await importFromZipFile(file);
      store.loadDocument(loaded);
      editor.replaceDocuments(loaded.content, loaded.css);
      showToast(`Opened ${loaded.name}`);
    } catch (err) {
      showToast(`Open failed: ${err.message}`);
    } finally {
      zipFileInput.value = '';
    }
  });

  // Allow dragging and dropping a .wa.zip archive directly onto the editor window
  window.addEventListener('dragover', (e) => {
    const files = Array.from(e.dataTransfer?.items || []);
    if (files.some((it) => it.kind === 'file')) {
      e.preventDefault();
    }
  });
  window.addEventListener('drop', async (e) => {
    if (e.target && imagesHost.contains(e.target)) return;
    const files = Array.from(e.dataTransfer?.files || []);
    const zipFile = files.find((f) => /\.zip$/i.test(f.name || ''));
    if (!zipFile) return;
    e.preventDefault();
    try {
      const loaded = await importFromZipFile(zipFile);
      store.loadDocument(loaded);
      editor.replaceDocuments(loaded.content, loaded.css);
      showToast(`Opened ${loaded.name}`);
    } catch (err) {
      showToast(`Open failed: ${err.message}`);
    }
  });

  imageFileInput.addEventListener('change', () => {
    const files = Array.from(imageFileInput.files || []);
    if (files.length > 0) {
      if (store.state.activeTab === 'images') {
        imagesPanel.addFilesToImagesTab(files);
      } else {
        handleInsertImages(files);
      }
    }
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
    store.emit('images');
    showToast(`Added ${paths.length} image${paths.length > 1 ? 's' : ''} to images/.`);
  }

  async function openSyntaxGuide() {
    try {
      const res = await fetch('./docs/syntax.wa.zip');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const guideDoc = parseWaZipBytes(bytes, 'syntax.wa.zip');
      store.state.viewingGuide = true;
      store.emit('mode');
      preview.renderNow({
        content: guideDoc.content,
        css: guideDoc.css,
        images: guideDoc.images,
        pageGrid: false,
        zoom: store.state.zoom,
        includeSourceMap: false,
      });
    } catch (err) {
      showToast(`Could not load Syntax Guide: ${err.message}`);
    }
  }

  // Action Dispatcher (Menus, Toolbar, Keyboard Shortcuts)
  async function dispatchAction(action) {
    switch (action) {
      case 'file:new':
        fileDialogs.openNewDocumentModal();
        break;

      case 'file:rename':
        fileDialogs.openInlineRename();
        break;

      case 'file:open':
        if (supportsOpenFilePicker()) {
          try {
            const loaded = await openWaZipFile();
            store.loadDocument(loaded);
            editor.replaceDocuments(loaded.content, loaded.css);
            showToast(`Opened ${loaded.name}`);
          } catch (err) {
            if (err.name !== 'AbortError') showToast(`Open error: ${err.message}`);
          }
        } else {
          zipFileInput.click();
        }
        break;

      case 'file:save':
        if (store.state.doc.handle) {
          statusAutosave.textContent = 'Saving .wa.zip…';
          try {
            await saveWaZipToHandle(store.state.doc.handle, store.state.doc);
            store.state.dirty = false;
            store.emit('save');
            statusAutosave.textContent = 'Saved';
            showToast(`Saved ${store.state.doc.name}`);
          } catch (err) {
            statusAutosave.textContent = 'Ready';
            if (err.name !== 'AbortError') showToast(`Save error: ${err.message}`);
          }
        } else {
          fileDialogs.openSaveAsModal({ isFirstSave: true });
        }
        break;

      case 'file:save-as':
        fileDialogs.openSaveAsModal({ isFirstSave: false });
        break;

      case 'file:close':
        store.loadDocument({
          name: 'untitled.wa.zip',
          content: DEFAULT_CONTENT,
          css: DEFAULT_CSS,
          images: new Map(),
          handle: null,
          dirty: false,
        });
        editor.replaceDocuments(DEFAULT_CONTENT, DEFAULT_CSS);
        switchEditorTab('content');
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
        await performSaveDownload(store.state.doc.name);
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
      case 'view:sync-scroll':
        store.setSyncScroll(!store.state.syncScroll);
        showToast(`Scroll Sync: ${store.state.syncScroll ? 'On (Editor ↔ Preview)' : 'Off'}`);
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
            <tr><td><kbd>Ctrl+S</kbd> / <kbd>Ctrl+Shift+S</kbd></td><td>Save / Save As…</td></tr>
            <tr><td><kbd>F2</kbd></td><td>Rename Document</td></tr>
            <tr><td><kbd>Ctrl+O</kbd></td><td>Open .wa.zip Document</td></tr>
            <tr><td><kbd>Ctrl+N</kbd></td><td>New Document…</td></tr>
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
          <p>Every document is a portable <code>.wa.zip</code> archive containing strict GitHub Flavored Markdown (<code>content.md</code>), plain CSS (<code>style.css</code>), embedded media (<code>images/</code>), a live versioned HTML reader (<code>${WA_READER_FILENAME}</code>), and an AI-ready reference (<code>syntax.md</code>).</p>
          <p>Works completely offline via Service Worker precaching with print-identical screen preview and two-way scroll sync.</p>`
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
    } else if (e.key === 'F2') {
      e.preventDefault();
      dispatchAction('file:rename');
    } else if (e.key === 'Escape') {
      document.getElementById('modal-templates').hidden = true;
      document.getElementById('modal-info').hidden = true;
      document.getElementById('modal-page-setup').hidden = true;
      fileDialogs.closeAll();
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
  window.__WA_APP__ = {
    store,
    editor,
    preview,
    gallery,
    theme,
    fileDialogs,
    imagesPanel,
    scrollSync,
    switchEditorTab,
    dispatchAction,
  };
}

boot();
