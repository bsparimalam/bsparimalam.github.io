/**
 * Images Tab Manager (app/images-panel.js)
 * Manages local assets inside `images/`: upload, drag-drop, clipboard paste,
 * preview cards with dimensions & usage badges, insert into content.md,
 * copy Markdown, inline rename (with automatic content.md / style.css reference
 * updates), in-place replace, lightbox preview, and delete with Undo.
 */
import { addImageBlobsToDoc, sanitizeImageFilename } from './fs.js';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtBadge(imgPath, blob) {
  const m = imgPath.match(/\.([a-z0-9]+)$/i);
  if (m) return m[1].toUpperCase();
  if (blob?.type?.includes('svg')) return 'SVG';
  if (blob?.type?.includes('png')) return 'PNG';
  if (blob?.type?.includes('jpeg')) return 'JPG';
  if (blob?.type?.includes('webp')) return 'WEBP';
  return 'IMG';
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countReferences(imgPath, content, css) {
  const bare = imgPath.replace(/^images\//, '');
  const re = new RegExp(`(?:\\./)?images/${escapeRegExp(bare)}(?=[\\s)"'\\]#?]|$)`, 'g');
  const m1 = (content || '').match(re);
  const m2 = (css || '').match(re);
  return (m1 ? m1.length : 0) + (m2 ? m2.length : 0);
}

function replaceReferencesInText(text, oldPath, newPath) {
  if (!text) return { text, count: 0 };
  const oldBare = oldPath.replace(/^images\//, '');
  const re = new RegExp(`((?:\\./)?)images/${escapeRegExp(oldBare)}(?=[\\s)"'\\]#?]|$)`, 'g');
  let count = 0;
  const next = text.replace(re, (_full, prefix) => {
    count++;
    return `${prefix}${newPath}`;
  });
  return { text: next, count };
}

function defaultAltText(imgPath) {
  return imgPath
    .replace(/^images\//, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim() || 'image';
}

export function createImagesPanelController({
  hostEl,
  store,
  onInsertMarkdown,
  onUpdateDocumentRefs,
  onOpenLightbox,
  showToast,
}) {
  const addInput = document.getElementById('input-image-file');
  const replaceInput = document.getElementById('input-image-replace');

  const thumbUrls = new Map(); // Map<imgPath, { blob, url }>
  const dimCache = new Map();  // Map<Blob, string>
  let filterText = '';
  let renamingPath = null;
  let confirmingDeletePath = null;
  let pendingReplacePath = null;
  let dragDepth = 0;

  function syncThumbUrls(imagesMap) {
    for (const [k, entry] of thumbUrls.entries()) {
      if (!imagesMap.has(k) || imagesMap.get(k) !== entry.blob) {
        URL.revokeObjectURL(entry.url);
        thumbUrls.delete(k);
      }
    }
    for (const [k, blob] of imagesMap.entries()) {
      if (!thumbUrls.has(k)) {
        thumbUrls.set(k, { blob, url: URL.createObjectURL(blob) });
      }
    }
  }

  function addFilesToImagesTab(files) {
    const imgFiles = Array.from(files || []).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name || '')
    );
    if (imgFiles.length === 0) {
      showToast('Please select or drop image files (PNG, JPG, SVG, WebP, GIF).');
      return [];
    }
    const addedPaths = addImageBlobsToDoc(store.state.doc, imgFiles);
    store.state.dirty = true;
    store.emit('images');
    showToast(`Added ${addedPaths.length} image${addedPaths.length > 1 ? 's' : ''} to images/.`);
    return addedPaths;
  }

  // Replace single image in-place
  replaceInput?.addEventListener('change', () => {
    const file = replaceInput.files?.[0];
    const targetPath = pendingReplacePath;
    pendingReplacePath = null;
    replaceInput.value = '';
    if (!file || !targetPath) return;
    if (store.replaceImage(targetPath, file)) {
      showToast(`Replaced ${targetPath}`);
    }
  });

  // Drag & drop directly onto the Images panel
  hostEl.addEventListener('dragenter', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      dragDepth++;
      hostEl.classList.add('wa-drop-active');
    }
  });
  hostEl.addEventListener('dragover', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
    }
  });
  hostEl.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hostEl.classList.remove('wa-drop-active');
  });
  hostEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    hostEl.classList.remove('wa-drop-active');
    if (e.dataTransfer?.files?.length) {
      addFilesToImagesTab(e.dataTransfer.files);
    }
  });

  // Paste image from clipboard when Images tab is active
  window.addEventListener('paste', (e) => {
    if (store.state.activeTab !== 'images' || store.state.mode !== 'edit') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles = items
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter(Boolean);
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFilesToImagesTab(imageFiles);
    }
  });

  function commitRename(oldPath, rawNewName) {
    renamingPath = null;
    const oldExtMatch = oldPath.match(/(\.[a-z0-9]+)$/i);
    const fallbackExt = oldExtMatch ? oldExtMatch[1] : '.png';
    const nextPath = sanitizeImageFilename(rawNewName, fallbackExt);

    if (!nextPath || nextPath === oldPath) {
      render();
      return;
    }
    if (store.state.doc.images.has(nextPath)) {
      showToast(`An image named "${nextPath.replace(/^images\//, '')}" already exists.`);
      render();
      return;
    }

    const mdRes = replaceReferencesInText(store.state.doc.content, oldPath, nextPath);
    const cssRes = replaceReferencesInText(store.state.doc.css, oldPath, nextPath);
    const totalRefs = mdRes.count + cssRes.count;
    const nextContent = mdRes.count > 0 ? mdRes.text : null;
    const nextCss = cssRes.count > 0 ? cssRes.text : null;

    if (totalRefs > 0) {
      onUpdateDocumentRefs({ content: nextContent, css: nextCss });
    }
    store.renameImage(oldPath, nextPath, { nextContent, nextCss });

    const shortNew = nextPath.replace(/^images\//, '');
    showToast(
      totalRefs > 0
        ? `Renamed to ${shortNew} (updated ${totalRefs} reference${totalRefs > 1 ? 's' : ''}).`
        : `Renamed image to ${shortNew}.`
    );
  }

  function performDelete(imgPath) {
    confirmingDeletePath = null;
    const removedBlob = store.deleteImage(imgPath);
    if (!removedBlob) return;
    const shortName = imgPath.replace(/^images\//, '');
    showToast(`Deleted ${shortName}`, {
      actionLabel: 'Undo',
      durationMs: 6000,
      onAction: () => {
        store.addImages([[imgPath, removedBlob]]);
        showToast(`Restored ${shortName}`);
      },
    });
  }

  function render() {
    const images = store.state.doc.images;
    syncThumbUrls(images);

    const allEntries = Array.from(images.entries());
    const totalBytes = allEntries.reduce((acc, [, b]) => acc + (b?.size || 0), 0);
    const q = filterText.trim().toLowerCase();
    const visible = q
      ? allEntries.filter(([p]) => p.toLowerCase().includes(q))
      : allEntries;

    hostEl.innerHTML = '';

    // Top action bar
    const bar = document.createElement('div');
    bar.className = 'wa-img-bar';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.id = 'btn-img-add';
    addBtn.className = 'wa-tb-pill wa-tb-primary';
    addBtn.innerHTML = `
      <svg class="wa-ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
      <span>Add Images…</span>
    `;
    addBtn.addEventListener('click', () => addInput?.click());
    bar.appendChild(addBtn);

    if (allEntries.length >= 4) {
      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'wa-img-search';
      search.placeholder = 'Filter images…';
      search.value = filterText;
      search.setAttribute('aria-label', 'Filter images');
      search.addEventListener('input', () => {
        filterText = search.value;
        renderBody(bodyEl, allEntries);
      });
      bar.appendChild(search);
    }

    const summary = document.createElement('span');
    summary.className = 'wa-img-summary';
    summary.textContent = allEntries.length === 0
      ? '0 images'
      : `${allEntries.length} ${allEntries.length === 1 ? 'image' : 'images'} · ${formatBytes(totalBytes)}`;
    bar.appendChild(summary);
    hostEl.appendChild(bar);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'wa-img-body';
    hostEl.appendChild(bodyEl);

    renderBody(bodyEl, visible, allEntries.length);
  }

  function renderBody(bodyEl, entries, totalCount = entries.length) {
    bodyEl.innerHTML = '';

    if (totalCount === 0) {
      const empty = document.createElement('div');
      empty.className = 'wa-img-empty';
      empty.innerHTML = `
        <svg class="wa-ico" style="width:32px;height:32px;opacity:0.6" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <circle cx="8.5" cy="9.5" r="1.5"/>
          <path d="m21 16-5-5L5 20"/>
        </svg>
        <h3>No images in <code>images/</code> yet</h3>
        <p>Drop image files here, paste from clipboard, or click <strong>Add Images…</strong> to bundle local assets inside your <code>.wa.zip</code> archive.</p>
      `;
      const cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'wa-tb-pill wa-tb-primary';
      cta.textContent = 'Add Images…';
      cta.addEventListener('click', () => addInput?.click());
      empty.appendChild(cta);
      bodyEl.appendChild(empty);
      return;
    }

    if (entries.length === 0) {
      const noMatch = document.createElement('p');
      noMatch.style.cssText = 'color:var(--ui-muted);text-align:center;padding:24px;';
      noMatch.textContent = `No images matching "${filterText}".`;
      bodyEl.appendChild(noMatch);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'wa-img-grid';

    const { content, css } = store.state.doc;

    for (const [imgPath, blob] of entries) {
      const shortName = imgPath.replace(/^images\//, '');
      const url = thumbUrls.get(imgPath)?.url || '';
      const refCount = countReferences(imgPath, content, css);
      const extBadge = getExtBadge(imgPath, blob);

      const card = document.createElement('article');
      card.className = 'wa-img-card';
      card.dataset.imagePath = imgPath;

      // Thumbnail preview button (opens lightbox)
      const thumbBtn = document.createElement('button');
      thumbBtn.type = 'button';
      thumbBtn.className = 'wa-img-thumb-btn';
      thumbBtn.title = `Preview ${imgPath}`;

      const imgEl = document.createElement('img');
      imgEl.src = url;
      imgEl.alt = shortName;
      thumbBtn.appendChild(imgEl);

      const badges = document.createElement('div');
      badges.className = 'wa-img-badges';
      badges.innerHTML = `
        <span class="wa-img-pill">${extBadge}</span>
        <span class="wa-img-pill ${refCount > 0 ? 'used' : 'unused'}">${refCount > 0 ? `Used (${refCount}×)` : 'Unused'}</span>
      `;
      thumbBtn.appendChild(badges);

      thumbBtn.addEventListener('click', () => {
        const dims = dimCache.get(blob) || '';
        onOpenLightbox({ imgPath, shortName, url, sizeLabel: formatBytes(blob?.size || 0), dims, refCount });
      });
      card.appendChild(thumbBtn);

      // Info block
      const info = document.createElement('div');
      info.className = 'wa-img-info';

      if (renamingPath === imgPath) {
        const row = document.createElement('div');
        row.className = 'wa-img-rename-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'wa-img-rename-input';
        inp.value = shortName;
        inp.setAttribute('aria-label', `Rename ${shortName}`);
        let handled = false;
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handled = true;
            commitRename(imgPath, inp.value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            handled = true;
            renamingPath = null;
            render();
          }
        });
        inp.addEventListener('blur', () => {
          if (!handled) commitRename(imgPath, inp.value);
        });
        row.appendChild(inp);
        info.appendChild(row);
        requestAnimationFrame(() => {
          inp.focus();
          const dot = shortName.lastIndexOf('.');
          inp.setSelectionRange(0, dot > 0 ? dot : shortName.length);
        });
      } else {
        const nameEl = document.createElement('div');
        nameEl.className = 'wa-img-name';
        nameEl.title = imgPath;
        nameEl.textContent = shortName;
        info.appendChild(nameEl);
      }

      const meta = document.createElement('div');
      meta.className = 'wa-img-meta';
      const sizeSpan = document.createElement('span');
      sizeSpan.textContent = formatBytes(blob?.size || 0);
      const dimSpan = document.createElement('span');
      dimSpan.textContent = dimCache.get(blob) || '…';
      meta.appendChild(sizeSpan);
      meta.appendChild(dimSpan);
      info.appendChild(meta);
      card.appendChild(info);

      imgEl.addEventListener('load', () => {
        if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
          const d = `${imgEl.naturalWidth} × ${imgEl.naturalHeight}`;
          dimCache.set(blob, d);
          dimSpan.textContent = d;
        }
      });

      // Actions bar
      const actions = document.createElement('div');
      actions.className = 'wa-img-actions';

      const insertBtn = document.createElement('button');
      insertBtn.type = 'button';
      insertBtn.className = 'wa-img-act-insert';
      insertBtn.dataset.imgAction = 'insert';
      insertBtn.textContent = 'Insert';
      insertBtn.title = `Insert ![${defaultAltText(imgPath)}](${imgPath}) into content.md`;
      insertBtn.addEventListener('click', () => {
        onInsertMarkdown(`![${defaultAltText(imgPath)}](${imgPath})`);
        showToast(`Inserted ${shortName} into content.md`);
      });
      actions.appendChild(insertBtn);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'wa-img-act-btn';
      copyBtn.dataset.imgAction = 'copy';
      copyBtn.title = 'Copy Markdown image syntax';
      copyBtn.setAttribute('aria-label', `Copy Markdown for ${shortName}`);
      copyBtn.innerHTML = `<svg class="wa-ico-xs" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      copyBtn.addEventListener('click', async () => {
        const md = `![${defaultAltText(imgPath)}](${imgPath})`;
        try {
          await navigator.clipboard.writeText(md);
          showToast(`Copied Markdown for ${shortName}`);
        } catch (_e) {
          showToast(`Markdown: ${md}`);
        }
      });
      actions.appendChild(copyBtn);

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'wa-img-act-btn';
      renameBtn.dataset.imgAction = 'rename';
      renameBtn.title = 'Rename image (auto-updates references)';
      renameBtn.setAttribute('aria-label', `Rename ${shortName}`);
      renameBtn.innerHTML = `<svg class="wa-ico-xs" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
      renameBtn.addEventListener('click', () => {
        renamingPath = imgPath;
        confirmingDeletePath = null;
        render();
      });
      actions.appendChild(renameBtn);

      const replaceBtn = document.createElement('button');
      replaceBtn.type = 'button';
      replaceBtn.className = 'wa-img-act-btn';
      replaceBtn.dataset.imgAction = 'replace';
      replaceBtn.title = 'Replace image file (keeps path & links)';
      replaceBtn.setAttribute('aria-label', `Replace ${shortName}`);
      replaceBtn.innerHTML = `<svg class="wa-ico-xs" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
      replaceBtn.addEventListener('click', () => {
        pendingReplacePath = imgPath;
        replaceInput?.click();
      });
      actions.appendChild(replaceBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'wa-img-act-btn danger';
      deleteBtn.dataset.imgAction = 'delete';
      deleteBtn.title = 'Delete image from images/';
      deleteBtn.setAttribute('aria-label', `Delete ${shortName}`);
      deleteBtn.innerHTML = `<svg class="wa-ico-xs" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      deleteBtn.addEventListener('click', () => {
        if (refCount > 0 && confirmingDeletePath !== imgPath) {
          confirmingDeletePath = imgPath;
          render();
        } else {
          performDelete(imgPath);
        }
      });
      actions.appendChild(deleteBtn);

      card.appendChild(actions);

      if (confirmingDeletePath === imgPath) {
        const confirmRow = document.createElement('div');
        confirmRow.className = 'wa-img-confirm';
        confirmRow.innerHTML = `<span>Used ${refCount}× — delete?</span>`;
        const btns = document.createElement('div');
        btns.className = 'wa-img-confirm-btns';
        const cancelB = document.createElement('button');
        cancelB.type = 'button';
        cancelB.textContent = 'Cancel';
        cancelB.addEventListener('click', () => {
          confirmingDeletePath = null;
          render();
        });
        const okB = document.createElement('button');
        okB.type = 'button';
        okB.className = 'confirm-del';
        okB.textContent = 'Delete';
        okB.addEventListener('click', () => performDelete(imgPath));
        btns.appendChild(cancelB);
        btns.appendChild(okB);
        confirmRow.appendChild(btns);
        card.appendChild(confirmRow);
      }

      grid.appendChild(card);
    }

    bodyEl.appendChild(grid);
  }

  return {
    render,
    addFilesToImagesTab,
    commitRename,
  };
}
