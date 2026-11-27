/**
 * Document Filename Workflows (Exclusively `.wa.zip`):
 *  1. Inline Topbar Rename (#btn-doc-rename / #doc-name-input)
 *  2. File -> New Document… Modal (#modal-new-doc)
 *  3. File -> Save (first-time unsaved) & File -> Save As… Modal (#modal-save-as)
 */
import {
  normalizeWaName,
  stripWaExt,
  suggestStemFromDoc,
  supportsSaveFilePicker,
} from './fs.js';
import { WA_READER_FILENAME } from '../runtime/render.js';

function stemToTitle(stem) {
  const clean = stripWaExt(stem)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'Untitled Document';
  return clean.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

export function createFileDialogsController({
  store,
  onCreateNew,
  onSaveFile,
  onSaveDownload,
  onOpenTemplates,
  showToast,
}) {
  // --- 1. Inline Topbar Rename ---
  const renameBtn = document.getElementById('btn-doc-rename');
  const renameEditor = document.getElementById('doc-name-editor');
  const renameInput = document.getElementById('doc-name-input');
  let inlineEditing = false;

  function openInlineRename() {
    if (inlineEditing) return;
    inlineEditing = true;
    const stem = stripWaExt(store.state.doc.name || 'untitled.wa.zip') || 'untitled';
    renameInput.value = stem;
    renameBtn.hidden = true;
    renameEditor.hidden = false;
    renameInput.focus();
    renameInput.select();
  }

  function closeInlineRename(commit = false) {
    if (!inlineEditing) return;
    inlineEditing = false;
    const raw = renameInput.value;
    renameEditor.hidden = true;
    renameBtn.hidden = false;

    if (commit && raw.trim()) {
      const { name, changed, detached } = store.setName(raw, { detachHandle: true });
      if (changed) {
        if (detached) {
          showToast(`Renamed to ${name} — save to write a new .wa.zip file.`, {
            actionLabel: 'Save As…',
            durationMs: 5500,
            onAction: () => openSaveAsModal({ isFirstSave: true }),
          });
        } else {
          showToast(`Renamed document to ${name}`);
        }
      }
    }
  }

  renameBtn?.addEventListener('click', () => openInlineRename());
  renameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      closeInlineRename(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeInlineRename(false);
    }
  });
  renameInput?.addEventListener('blur', () => closeInlineRename(true));

  // --- 2. New Document Modal (#modal-new-doc) ---
  const newModal = document.getElementById('modal-new-doc');
  const newForm = document.getElementById('form-new-doc');
  const newNameInput = document.getElementById('new-doc-name');
  const newTitleInput = document.getElementById('new-doc-title');
  const newPreview = document.getElementById('new-doc-preview');
  const newDirtyWarn = document.getElementById('new-doc-dirty-warn');
  const newFromTplBtn = document.getElementById('btn-new-from-tpl');
  let titleManuallyEdited = false;

  function updateNewPreview() {
    const normalized = normalizeWaName(newNameInput.value || 'untitled');
    newPreview.textContent = `File: ${normalized}`;
    if (!titleManuallyEdited) {
      newTitleInput.value = stemToTitle(normalized);
    }
  }

  newNameInput?.addEventListener('input', updateNewPreview);
  newTitleInput?.addEventListener('input', () => {
    titleManuallyEdited = newTitleInput.value.trim().length > 0;
  });

  newFromTplBtn?.addEventListener('click', () => {
    newModal.hidden = true;
    onOpenTemplates();
  });

  newForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = normalizeWaName(newNameInput.value || 'untitled');
    const title = (newTitleInput.value || '').trim() || stemToTitle(name);
    newModal.hidden = true;
    onCreateNew({ name, title });
  });

  function openNewDocumentModal() {
    titleManuallyEdited = false;
    newNameInput.value = 'untitled';
    newTitleInput.value = 'Untitled Document';
    if (newDirtyWarn) newDirtyWarn.hidden = !store.state.dirty;
    updateNewPreview();
    newModal.hidden = false;
    newNameInput.focus();
    newNameInput.select();
  }

  // --- 3. Save / Save As Modal (#modal-save-as) ---
  const saveModal = document.getElementById('modal-save-as');
  const saveForm = document.getElementById('form-save-as');
  const saveHeading = document.getElementById('save-as-title');
  const saveSub = document.getElementById('save-as-sub');
  const saveNameInput = document.getElementById('save-as-name');
  const savePreview = document.getElementById('save-as-preview');
  const saveImgCount = document.getElementById('save-as-img-count');
  const saveReaderName = document.getElementById('save-as-reader-name');
  const saveDestNote = document.getElementById('save-as-dest-note');
  const btnSaveFile = document.getElementById('btn-save-file');
  const btnSaveDownload = document.getElementById('btn-save-download');

  if (saveReaderName) {
    saveReaderName.textContent = WA_READER_FILENAME;
  }

  function updateSavePreview() {
    const normalized = normalizeWaName(saveNameInput.value || store.state.doc.name || 'untitled');
    savePreview.textContent = `File: ${normalized}`;
    const canPickFile = supportsSaveFilePicker();
    if (saveDestNote) {
      if (canPickFile) {
        saveDestNote.textContent = `Choose where to save "${normalized}". Subsequent Ctrl+S saves overwrite this file directly.`;
      } else if (!window.isSecureContext && location.protocol === 'http:') {
        const portPart = location.port ? `:${location.port}` : '';
        saveDestNote.textContent = `Direct file overwrite requires localhost (http://localhost${portPart}/) or HTTPS. On this URL, saving downloads "${normalized}".`;
      } else {
        saveDestNote.textContent = `Saving downloads "${normalized}" directly to your browser's Downloads folder.`;
      }
    }
    if (!canPickFile && btnSaveDownload) {
      btnSaveDownload.textContent = `Download ${normalized}`;
    }
  }

  saveNameInput?.addEventListener('input', updateSavePreview);

  function openSaveAsModal({ isFirstSave = false } = {}) {
    const canPickFile = supportsSaveFilePicker();
    const suggested = suggestStemFromDoc(store.state.doc);
    saveHeading.textContent = isFirstSave ? 'Save Document' : 'Save Document As';
    saveSub.textContent = isFirstSave
      ? 'Choose a filename for your new .wa.zip document.'
      : 'Choose a new filename to save a copy as a .wa.zip archive.';
    saveNameInput.value = suggested;
    const nImgs = store.state.doc.images.size;
    if (saveImgCount) {
      saveImgCount.textContent = `${nImgs} ${nImgs === 1 ? 'file' : 'files'}`;
    }
    if (saveReaderName) {
      saveReaderName.textContent = WA_READER_FILENAME;
    }

    if (btnSaveFile) btnSaveFile.hidden = !canPickFile;
    if (btnSaveDownload) {
      btnSaveDownload.classList.toggle('wa-btn-primary', !canPickFile);
      btnSaveDownload.classList.toggle('wa-btn-secondary', canPickFile);
      if (canPickFile) btnSaveDownload.textContent = 'Download Copy';
    }

    updateSavePreview();
    saveModal.hidden = false;
    saveNameInput.focus();
    saveNameInput.select();
  }

  saveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chosenName = normalizeWaName(saveNameInput.value || store.state.doc.name || 'untitled');
    saveModal.hidden = true;
    if (supportsSaveFilePicker()) {
      await onSaveFile(chosenName);
    } else {
      await onSaveDownload(chosenName);
    }
  });

  btnSaveDownload?.addEventListener('click', async (e) => {
    e.preventDefault();
    const chosenName = normalizeWaName(saveNameInput.value || store.state.doc.name || 'untitled');
    saveModal.hidden = true;
    await onSaveDownload(chosenName);
  });

  return {
    openInlineRename,
    openNewDocumentModal,
    openSaveAsModal,
    closeAll() {
      closeInlineRename(false);
      if (newModal) newModal.hidden = true;
      if (saveModal) saveModal.hidden = true;
    },
  };
}
