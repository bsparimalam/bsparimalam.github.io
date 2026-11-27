/**
 * Templates Gallery Modal (Preview Template vs Apply Style Only)
 * Loads gallery thumbnails from templates/thumbs/ and fetches canonical .wa.zip archives.
 */
import { parseWaZipBytes } from './fs.js';

export function createTemplatesGallery({ onPreviewTemplate, onApplyStyle, showToast }) {
  const modal = document.getElementById('modal-templates');
  const searchInput = document.getElementById('tpl-search');
  const countLabel = document.getElementById('tpl-count-label');
  const pillsEl = document.getElementById('tpl-categories');
  const gridEl = document.getElementById('tpl-grid');

  let catalog = [];
  let activeCategory = 'All';
  let loaded = false;

  async function ensureLoaded() {
    if (loaded) return;
    try {
      const res = await fetch('./templates/index.json');
      if (!res.ok) throw new Error('Failed to load templates/index.json');
      const data = await res.json();
      catalog = data.templates || [];
      loaded = true;
      renderCategoryPills();
      renderGrid();
    } catch (err) {
      gridEl.innerHTML = `<p style="padding:16px;color:var(--ui-muted)">Could not load template catalog: ${err.message}</p>`;
    }
  }

  function renderCategoryPills() {
    const counts = new Map();
    for (const t of catalog) {
      counts.set(t.category, (counts.get(t.category) || 0) + 1);
    }
    const cats = ['All', ...counts.keys()];
    pillsEl.innerHTML = '';
    for (const cat of cats) {
      const btn = document.createElement('button');
      btn.className = `wa-pill${cat === activeCategory ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(cat === activeCategory));
      const c = cat === 'All' ? catalog.length : counts.get(cat);
      btn.textContent = `${cat} (${c})`;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderCategoryPills();
        renderGrid();
      });
      pillsEl.appendChild(btn);
    }
  }

  function getFiltered() {
    const q = (searchInput.value || '').trim().toLowerCase();
    return catalog.filter((t) => {
      if (activeCategory !== 'All' && t.category !== activeCategory) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.id} ${t.category} ${t.archetype} ${(t.tags || []).join(' ')} ${(t.fonts || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderGrid() {
    const items = getFiltered();
    countLabel.textContent = `${items.length} of ${catalog.length} templates`;
    gridEl.innerHTML = '';

    const frag = document.createDocumentFragment();
    for (const tpl of items) {
      const card = document.createElement('article');
      card.className = 'wa-tpl-card';
      card.dataset.templateId = tpl.id;

      const swatches = (tpl.palette || [])
        .slice(0, 3)
        .map((c) => `<span class="wa-swatch" style="background:${c}"></span>`)
        .join('');

      const thumbSrc = tpl.thumbnail ? `./templates/${tpl.thumbnail}` : '';
      card.innerHTML = `
        <div class="wa-tpl-thumb">
          ${thumbSrc ? `<img src="${thumbSrc}" alt="${tpl.name} page 1 preview" loading="lazy">` : ''}
          <div class="wa-tpl-swatches">${swatches}</div>
        </div>
        <div class="wa-tpl-meta">
          <div class="wa-tpl-cat">${tpl.category}</div>
          <div class="wa-tpl-name">${tpl.name}</div>
          <div class="wa-tpl-fonts">${(tpl.fonts || []).slice(0, 2).join(' · ')}</div>
        </div>
        <div class="wa-tpl-actions">
          <button class="wa-tpl-btn" data-tpl-action="preview">Preview</button>
          <button class="wa-tpl-btn primary" data-tpl-action="apply">Apply Style</button>
        </div>
      `;

      card.querySelector('[data-tpl-action="preview"]').addEventListener('click', async () => {
        await handleLoadTemplate(tpl, 'preview');
      });
      card.querySelector('[data-tpl-action="apply"]').addEventListener('click', async () => {
        await handleLoadTemplate(tpl, 'apply');
      });

      frag.appendChild(card);
    }
    gridEl.appendChild(frag);
  }

  async function fetchTemplateFiles(tpl, includeContent) {
    const archiveName = tpl.archive || `${tpl.id}.wa.zip`;
    const res = await fetch(`./templates/${archiveName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${archiveName}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const parsed = parseWaZipBytes(bytes, archiveName);
    return {
      content: includeContent ? parsed.content : null,
      css: parsed.css,
      images: parsed.images,
    };
  }

  async function handleLoadTemplate(tpl, mode) {
    try {
      const data = await fetchTemplateFiles(tpl, mode === 'preview');
      close();
      if (mode === 'preview') {
        onPreviewTemplate({
          id: tpl.id,
          name: `${tpl.id}.wa.zip`,
          content: data.content,
          css: data.css,
          images: data.images,
        });
        showToast(`Loaded template "${tpl.name}" with sample content.`);
      } else {
        onApplyStyle({
          id: tpl.id,
          name: tpl.name,
          css: data.css,
          images: data.images,
        });
        showToast(`Applied "${tpl.name}" style to your document. Your content was preserved.`);
      }
    } catch (err) {
      showToast(`Template load error: ${err.message}`);
    }
  }

  searchInput.addEventListener('input', () => renderGrid());

  async function open() {
    modal.hidden = false;
    await ensureLoaded();
    searchInput.focus();
  }

  function close() {
    modal.hidden = true;
  }

  return { open, close, ensureLoaded, getCatalog: () => catalog };
}
