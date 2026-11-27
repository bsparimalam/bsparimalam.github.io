/**
 * Edit -> Page Setup… Modal Controller & Surgical style.css Sync
 * Keeps style.css as the single source of truth for paper size, orientation, and margins.
 */

export const PAPER_PRESETS = [
  { id: 'Letter', label: 'Letter (8.5 × 11 in)', w: 8.5, h: 11, unit: 'in', cssName: 'Letter' },
  { id: 'A4', label: 'A4 (210 × 297 mm)', w: 210, h: 297, unit: 'mm', cssName: 'A4' },
  { id: 'A5', label: 'A5 (148 × 210 mm)', w: 148, h: 210, unit: 'mm', cssName: 'A5' },
  { id: 'Legal', label: 'Legal (8.5 × 14 in)', w: 8.5, h: 14, unit: 'in', cssName: 'Legal' },
  { id: 'Executive', label: 'Executive (7.25 × 10.5 in)', w: 7.25, h: 10.5, unit: 'in', cssName: 'Executive' },
  { id: 'TradeBook', label: 'Trade Book (6 × 9 in)', w: 6, h: 9, unit: 'in', cssName: '6in 9in' },
  { id: 'Tabloid', label: 'Tabloid (11 × 17 in)', w: 11, h: 17, unit: 'in', cssName: 'Tabloid' },
];

export const MARGIN_PRESETS = [
  { id: 'normal', label: 'Normal (1 in)', top: 1, right: 1, bottom: 1, left: 1, unit: 'in' },
  { id: 'moderate', label: 'Moderate (0.75 in)', top: 0.75, right: 0.75, bottom: 0.75, left: 0.75, unit: 'in' },
  { id: 'narrow', label: 'Narrow (0.5 in)', top: 0.5, right: 0.5, bottom: 0.5, left: 0.5, unit: 'in' },
  { id: 'wide', label: 'Wide (1.25 in)', top: 1.25, right: 1.25, bottom: 1.25, left: 1.25, unit: 'in' },
  { id: 'academic', label: 'Academic (0.9 × 0.85 in)', top: 0.9, right: 0.85, bottom: 0.95, left: 0.85, unit: 'in' },
];

function parseLen(str) {
  const m = String(str || '').trim().match(/^([\d.]+)\s*(in|mm|cm|pt|px)?$/i);
  if (!m) return null;
  return { val: parseFloat(m[1]), unit: (m[2] || 'in').toLowerCase() };
}

function toInches(val, unit) {
  if (unit === 'mm') return val / 25.4;
  if (unit === 'cm') return val / 2.54;
  if (unit === 'pt') return val / 72;
  if (unit === 'px') return val / 96;
  return val;
}

function fromInches(inches, unit) {
  let out = inches;
  if (unit === 'mm') out = inches * 25.4;
  else if (unit === 'cm') out = inches * 2.54;
  return Math.round(out * 100) / 100;
}

function fmtLen(val, unit) {
  const rounded = Math.round(Number(val) * 100) / 100;
  return `${rounded}${unit}`;
}

function expandMarginShorthand(raw) {
  const parts = String(raw || '1in').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

/**
 * Parse current size, orientation, and margins from style.css.
 */
export function parsePageSetupFromCss(cssText = '') {
  const getVar = (name) => {
    const m = cssText.match(new RegExp(`--${name}\\s*:\\s*([^;{}]+);`, 'i'));
    return m ? m[1].trim() : '';
  };

  let rawSize = getVar('page-size');
  let rawW = getVar('page-width');
  let rawH = getVar('page-height');
  let rawMargin = getVar('page-margin');

  // Fallback to top-level @page { size: ...; margin: ...; }
  const atPageMatch = cssText.match(/@page\s*\{([\s\S]*?)\}/i);
  if (atPageMatch) {
    const block = atPageMatch[1].replace(/@[a-z-]+\s*\{[\s\S]*?\}/gi, '');
    if (!rawSize) {
      const sm = block.match(/\bsize\s*:\s*([^;]+);/i);
      if (sm) rawSize = sm[1].trim();
    }
    if (!rawMargin) {
      const mm = block.match(/\bmargin\s*:\s*([^;]+);/i);
      if (mm) rawMargin = mm[1].trim();
    }
  }

  rawSize = rawSize || 'Letter';
  rawMargin = rawMargin || '1in 1in 1in 1in';

  let presetId = 'Custom';
  let orientation = /\blandscape\b/i.test(rawSize) ? 'landscape' : 'portrait';
  let width = 8.5;
  let height = 11;
  let sizeUnit = 'in';

  const cleanSizeName = rawSize.replace(/\b(portrait|landscape)\b/gi, '').trim();
  const matchedPreset = PAPER_PRESETS.find(
    (p) => p.cssName.toLowerCase() === cleanSizeName.toLowerCase() || p.id.toLowerCase() === cleanSizeName.toLowerCase()
  );

  if (matchedPreset) {
    presetId = matchedPreset.id;
    width = matchedPreset.w;
    height = matchedPreset.h;
    sizeUnit = matchedPreset.unit;
  } else {
    const tokens = cleanSizeName.split(/\s+/);
    const l1 = tokens.length === 2 ? parseLen(tokens[0]) : parseLen(rawW);
    const l2 = tokens.length === 2 ? parseLen(tokens[1]) : parseLen(rawH);
    if (l1 && l2) {
      sizeUnit = l1.unit === 'mm' || l1.unit === 'cm' ? l1.unit : 'in';
      const wIn = toInches(l1.val, l1.unit);
      const hIn = toInches(l2.val, l2.unit);
      if (wIn > hIn) {
        orientation = 'landscape';
        width = fromInches(hIn, sizeUnit);
        height = fromInches(wIn, sizeUnit);
      } else {
        orientation = 'portrait';
        width = fromInches(wIn, sizeUnit);
        height = fromInches(hIn, sizeUnit);
      }
      // Match TradeBook 6x9 if swapped landscape (9in 6in)
      const byDims = PAPER_PRESETS.find(
        (p) => Math.abs(toInches(p.w, p.unit) - Math.min(wIn, hIn)) < 0.05 && Math.abs(toInches(p.h, p.unit) - Math.max(wIn, hIn)) < 0.05
      );
      if (byDims) {
        presetId = byDims.id;
        width = byDims.w;
        height = byDims.h;
        sizeUnit = byDims.unit;
      }
    }
  }

  // Parse margins
  const mParts = expandMarginShorthand(rawMargin);
  const parsedMargins = mParts.map((s) => parseLen(s) || { val: 1, unit: 'in' });
  const marginUnit = ['in', 'mm', 'cm'].includes(parsedMargins[0].unit) ? parsedMargins[0].unit : 'in';
  const [mTop, mRight, mBottom, mLeft] = parsedMargins.map((p) =>
    p.unit === marginUnit ? p.val : fromInches(toInches(p.val, p.unit), marginUnit)
  );

  return {
    presetId,
    orientation,
    width,
    height,
    sizeUnit,
    marginUnit,
    margins: { top: mTop, right: mRight, bottom: mBottom, left: mLeft },
  };
}

/**
 * Format a short readable summary for the status bar, e.g. "Letter · Portrait".
 */
export function formatPageSetupSummary(setup) {
  const preset = PAPER_PRESETS.find((p) => p.id === setup.presetId);
  const name = preset ? preset.id.replace('TradeBook', '6×9 Book') : `${setup.width}×${setup.height}${setup.sizeUnit}`;
  const orient = setup.orientation === 'landscape' ? 'Landscape' : 'Portrait';
  return `${name} · ${orient}`;
}

/**
 * Find the matching closing brace index for an opening '{' at openIdx.
 */
function findMatchingBrace(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function upsertPropertyInBlock(blockBody, propName, propValue) {
  // Replace only top-level declarations (not inside nested @top-left { ... } blocks)
  let depth = 0;
  let out = '';
  let i = 0;
  let replaced = false;
  const re = new RegExp(`^(\\s*)${propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*:\\s*)([^;{}]+)(;)`, 'i');

  while (i < blockBody.length) {
    const ch = blockBody[i];
    if (ch === '{') {
      depth++;
      out += ch;
      i++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      out += ch;
      i++;
      continue;
    }
    if (depth === 0 && !replaced) {
      const slice = blockBody.slice(i);
      const m = slice.match(re);
      if (m) {
        out += `${m[1]}${propName}${m[2]}${propValue}${m[4]}`;
        i += m[0].length;
        replaced = true;
        continue;
      }
    }
    out += ch;
    i++;
  }

  if (!replaced) {
    return `\n  ${propName}: ${propValue};${out}`;
  }
  return out;
}

/**
 * Surgically update :root { --page-size, --page-width, --page-height, --page-margin }
 * and top-level @page { size, margin } without disturbing custom user rules or margin boxes.
 */
export function applyPageSetupToCss(cssText = '', setup) {
  const preset = PAPER_PRESETS.find((p) => p.id === setup.presetId);
  const effW = setup.orientation === 'landscape' ? setup.height : setup.width;
  const effH = setup.orientation === 'landscape' ? setup.width : setup.height;
  const widthCss = fmtLen(effW, setup.sizeUnit);
  const heightCss = fmtLen(effH, setup.sizeUnit);

  let sizeCss;
  if (preset && preset.id !== 'TradeBook') {
    sizeCss = setup.orientation === 'landscape' ? `${preset.cssName} landscape` : preset.cssName;
  } else {
    sizeCss = `${widthCss} ${heightCss}`;
  }

  const m = setup.margins;
  const marginCss = `${fmtLen(m.top, setup.marginUnit)} ${fmtLen(m.right, setup.marginUnit)} ${fmtLen(m.bottom, setup.marginUnit)} ${fmtLen(m.left, setup.marginUnit)}`;

  let next = cssText || '';

  // 1. Update or insert inside :root { ... }
  const rootMatch = next.match(/:root\s*\{/);
  if (rootMatch) {
    const openIdx = rootMatch.index + rootMatch[0].length - 1;
    const closeIdx = findMatchingBrace(next, openIdx);
    if (closeIdx > openIdx) {
      let body = next.slice(openIdx + 1, closeIdx);
      body = upsertPropertyInBlock(body, '--page-size', sizeCss);
      body = upsertPropertyInBlock(body, '--page-width', widthCss);
      body = upsertPropertyInBlock(body, '--page-height', heightCss);
      body = upsertPropertyInBlock(body, '--page-margin', marginCss);
      next = next.slice(0, openIdx + 1) + body + next.slice(closeIdx);
    }
  } else {
    next = `:root {\n  --page-size: ${sizeCss};\n  --page-width: ${widthCss};\n  --page-height: ${heightCss};\n  --page-margin: ${marginCss};\n}\n\n${next}`;
  }

  // 2. Update main @page { ... } (skip @page :first)
  const pageRe = /@page(?!\s*:)\s*\{/g;
  const pageMatch = pageRe.exec(next);
  if (pageMatch) {
    const openIdx = pageMatch.index + pageMatch[0].length - 1;
    const closeIdx = findMatchingBrace(next, openIdx);
    if (closeIdx > openIdx) {
      let body = next.slice(openIdx + 1, closeIdx);
      body = upsertPropertyInBlock(body, 'size', sizeCss);
      body = upsertPropertyInBlock(body, 'margin', marginCss);
      next = next.slice(0, openIdx + 1) + body + next.slice(closeIdx);
    }
  } else {
    next = `${next.trimEnd()}\n\n@page {\n  size: ${sizeCss};\n  margin: ${marginCss};\n}\n`;
  }

  return next;
}

/**
 * Interactive Edit -> Page Setup… modal controller.
 */
export function createPageSetupController({ getCss, onApply }) {
  const modal = document.getElementById('modal-page-setup');
  const form = document.getElementById('form-page-setup');
  const sizeSelect = document.getElementById('ps-size-preset');
  const customRow = document.getElementById('ps-custom-size-row');
  const widthInput = document.getElementById('ps-custom-width');
  const heightInput = document.getElementById('ps-custom-height');
  const sizeUnitSelect = document.getElementById('ps-size-unit');
  const orientBtns = Array.from(document.querySelectorAll('[data-ps-orient]'));
  const marginPresetSelect = document.getElementById('ps-margin-preset');
  const marginUnitSelect = document.getElementById('ps-margin-unit');
  const linkMarginsCheck = document.getElementById('ps-margins-linked');
  const mTopInput = document.getElementById('ps-m-top');
  const mRightInput = document.getElementById('ps-m-right');
  const mBottomInput = document.getElementById('ps-m-bottom');
  const mLeftInput = document.getElementById('ps-m-left');
  const previewSheet = document.getElementById('ps-preview-sheet');
  const previewContent = document.getElementById('ps-preview-content');
  const previewMeta = document.getElementById('ps-preview-meta');

  let current = parsePageSetupFromCss('');

  function readFormState() {
    const presetId = sizeSelect.value;
    const preset = PAPER_PRESETS.find((p) => p.id === presetId);
    const sizeUnit = preset ? preset.unit : sizeUnitSelect.value;
    const width = preset ? preset.w : Math.max(2, parseFloat(widthInput.value) || 8.5);
    const height = preset ? preset.h : Math.max(2, parseFloat(heightInput.value) || 11);
    const orientation = current.orientation;
    const marginUnit = marginUnitSelect.value;
    const margins = {
      top: Math.max(0, parseFloat(mTopInput.value) || 0),
      right: Math.max(0, parseFloat(mRightInput.value) || 0),
      bottom: Math.max(0, parseFloat(mBottomInput.value) || 0),
      left: Math.max(0, parseFloat(mLeftInput.value) || 0),
    };
    return { presetId, orientation, width, height, sizeUnit, marginUnit, margins };
  }

  function updateMiniPreview() {
    const st = readFormState();
    const effW = st.orientation === 'landscape' ? st.height : st.width;
    const effH = st.orientation === 'landscape' ? st.width : st.height;
    const wIn = toInches(effW, st.sizeUnit);
    const hIn = toInches(effH, st.sizeUnit);

    const maxBox = 164;
    const scale = Math.min(maxBox / wIn, maxBox / hIn);
    const pxW = Math.round(wIn * scale);
    const pxH = Math.round(hIn * scale);

    const mt = Math.min(pxH * 0.4, toInches(st.margins.top, st.marginUnit) * scale);
    const mr = Math.min(pxW * 0.4, toInches(st.margins.right, st.marginUnit) * scale);
    const mb = Math.min(pxH * 0.4, toInches(st.margins.bottom, st.marginUnit) * scale);
    const ml = Math.min(pxW * 0.4, toInches(st.margins.left, st.marginUnit) * scale);

    previewSheet.style.width = `${pxW}px`;
    previewSheet.style.height = `${pxH}px`;
    previewContent.style.top = `${mt}px`;
    previewContent.style.right = `${mr}px`;
    previewContent.style.bottom = `${mb}px`;
    previewContent.style.left = `${ml}px`;

    const printW = Math.max(0.5, fromInches(wIn - toInches(st.margins.left + st.margins.right, st.marginUnit), st.sizeUnit));
    const printH = Math.max(0.5, fromInches(hIn - toInches(st.margins.top + st.margins.bottom, st.marginUnit), st.sizeUnit));
    previewMeta.textContent = `${effW} × ${effH} ${st.sizeUnit} · Printable ${printW} × ${printH} ${st.sizeUnit}`;
  }

  function populateForm(setup) {
    current = structuredClone(setup);
    sizeSelect.value = PAPER_PRESETS.some((p) => p.id === setup.presetId) ? setup.presetId : 'Custom';
    customRow.hidden = sizeSelect.value !== 'Custom';
    widthInput.value = String(setup.width);
    heightInput.value = String(setup.height);
    sizeUnitSelect.value = setup.sizeUnit;

    for (const btn of orientBtns) {
      const active = btn.getAttribute('data-ps-orient') === setup.orientation;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    }

    marginUnitSelect.value = setup.marginUnit;
    mTopInput.value = String(setup.margins.top);
    mRightInput.value = String(setup.margins.right);
    mBottomInput.value = String(setup.margins.bottom);
    mLeftInput.value = String(setup.margins.left);

    const allEqual =
      setup.margins.top === setup.margins.right &&
      setup.margins.right === setup.margins.bottom &&
      setup.margins.bottom === setup.margins.left;
    linkMarginsCheck.checked = allEqual;

    const matchedMarginPreset = MARGIN_PRESETS.find(
      (mp) =>
        mp.unit === setup.marginUnit &&
        Math.abs(mp.top - setup.margins.top) < 0.02 &&
        Math.abs(mp.right - setup.margins.right) < 0.02 &&
        Math.abs(mp.bottom - setup.margins.bottom) < 0.02 &&
        Math.abs(mp.left - setup.margins.left) < 0.02
    );
    marginPresetSelect.value = matchedMarginPreset ? matchedMarginPreset.id : 'custom';

    updateMiniPreview();
  }

  sizeSelect.addEventListener('change', () => {
    const preset = PAPER_PRESETS.find((p) => p.id === sizeSelect.value);
    customRow.hidden = Boolean(preset);
    if (preset) {
      widthInput.value = String(preset.w);
      heightInput.value = String(preset.h);
      sizeUnitSelect.value = preset.unit;
    }
    updateMiniPreview();
  });

  for (const btn of orientBtns) {
    btn.addEventListener('click', () => {
      current.orientation = btn.getAttribute('data-ps-orient');
      for (const b of orientBtns) {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      }
      updateMiniPreview();
    });
  }

  marginPresetSelect.addEventListener('change', () => {
    const mp = MARGIN_PRESETS.find((x) => x.id === marginPresetSelect.value);
    if (!mp) return;
    const u = marginUnitSelect.value;
    mTopInput.value = String(u === mp.unit ? mp.top : fromInches(toInches(mp.top, mp.unit), u));
    mRightInput.value = String(u === mp.unit ? mp.right : fromInches(toInches(mp.right, mp.unit), u));
    mBottomInput.value = String(u === mp.unit ? mp.bottom : fromInches(toInches(mp.bottom, mp.unit), u));
    mLeftInput.value = String(u === mp.unit ? mp.left : fromInches(toInches(mp.left, mp.unit), u));
    updateMiniPreview();
  });

  let lastMarginUnit = 'in';
  marginUnitSelect.addEventListener('change', () => {
    const nextUnit = marginUnitSelect.value;
    for (const inp of [mTopInput, mRightInput, mBottomInput, mLeftInput]) {
      const v = parseFloat(inp.value) || 0;
      inp.value = String(fromInches(toInches(v, lastMarginUnit), nextUnit));
    }
    lastMarginUnit = nextUnit;
    updateMiniPreview();
  });

  for (const inp of [mTopInput, mRightInput, mBottomInput, mLeftInput]) {
    inp.addEventListener('input', () => {
      marginPresetSelect.value = 'custom';
      if (linkMarginsCheck.checked) {
        const val = inp.value;
        for (const other of [mTopInput, mRightInput, mBottomInput, mLeftInput]) {
          if (other !== inp) other.value = val;
        }
      }
      updateMiniPreview();
    });
  }

  for (const inp of [widthInput, heightInput, sizeUnitSelect]) {
    inp.addEventListener('input', () => updateMiniPreview());
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nextSetup = readFormState();
    const updatedCss = applyPageSetupToCss(getCss(), nextSetup);
    close();
    onApply(updatedCss, nextSetup);
  });

  function open() {
    const parsed = parsePageSetupFromCss(getCss());
    lastMarginUnit = parsed.marginUnit;
    populateForm(parsed);
    modal.hidden = false;
    sizeSelect.focus();
  }

  function close() {
    modal.hidden = true;
  }

  return { open, close };
}
