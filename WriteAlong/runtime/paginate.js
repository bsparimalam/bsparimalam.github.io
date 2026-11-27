/**
 * Write Along — Deterministic Paged Media Engine (runtime/paginate.js)
 *
 * Splits rendered document HTML into discrete physical <section class="wa-page">
 * sheets with real @page margin boxes (running headers, footers, page counters).
 * Both screen preview and print-to-PDF render the exact same .wa-page sheets
 * 1-to-1 (@page { margin: 0 }), guaranteeing identical page breaks and layout.
 */

const PAGE_SIZE_MAP = {
  'letter': ['8.5in', '11in'],
  'a4': ['210mm', '297mm'],
  'a5': ['148mm', '210mm'],
  'legal': ['8.5in', '14in'],
  'tabloid': ['11in', '17in'],
  'executive': ['7.25in', '10.5in'],
};

const MARGIN_BOX_NAMES = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const ALLOWED_MARGIN_PROPS = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'letter-spacing',
  'text-transform',
  'border-top',
  'border-bottom',
  'padding-top',
  'padding-bottom',
  'opacity',
]);

function findClosingBrace(text, openIdx) {
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

function expandMargin(raw) {
  const parts = String(raw || '1in').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0], parts[1], parts[2], parts[3]];
}

function parseDeclarations(blockText) {
  const decls = {};
  const stripped = blockText.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const part of stripped.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim().toLowerCase();
    const val = part.slice(colon + 1).trim();
    if (key && val) decls[key] = val;
  }
  return decls;
}

function parseAtPageBlock(blockBody) {
  const boxes = {};
  let topLevel = '';
  let i = 0;

  while (i < blockBody.length) {
    const rest = blockBody.slice(i);
    const boxMatch = rest.match(/^@(top-left|top-center|top-right|bottom-left|bottom-center|bottom-right)\s*\{/i);
    if (boxMatch) {
      const boxName = boxMatch[1].toLowerCase();
      const openIdx = i + boxMatch[0].length - 1;
      const closeIdx = findClosingBrace(blockBody, openIdx);
      if (closeIdx > openIdx) {
        boxes[boxName] = parseDeclarations(blockBody.slice(openIdx + 1, closeIdx));
        i = closeIdx + 1;
        continue;
      }
    }
    topLevel += blockBody[i];
    i++;
  }

  return { props: parseDeclarations(topLevel), boxes };
}

/**
 * Parse page geometry, columns, background, and @page / @page :first margin boxes.
 */
export function parsePageConfig(styleCss = '', meta = {}) {
  const cleaned = String(styleCss || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  const varRe = /--(page-size|page-width|page-height|page-margin|page-background|columns|column-gap)\s*:\s*([^;{}]+);/gi;
  let m;
  while ((m = varRe.exec(cleaned)) !== null) {
    vars[m[1].toLowerCase()] = m[2].trim();
  }

  const boxes = {};
  const firstBoxes = {};
  let atPageSize = '';
  let atPageMargin = '';
  let atPageBg = '';

  const pageRe = /@page(\s*:\s*first)?\s*\{/gi;
  while ((m = pageRe.exec(cleaned)) !== null) {
    const isFirst = Boolean(m[1]);
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = findClosingBrace(cleaned, openIdx);
    if (closeIdx <= openIdx) continue;
    const parsed = parseAtPageBlock(cleaned.slice(openIdx + 1, closeIdx));
    if (!isFirst) {
      if (parsed.props.size) atPageSize = parsed.props.size;
      if (parsed.props.margin) atPageMargin = parsed.props.margin;
      if (parsed.props.background) atPageBg = parsed.props.background;
      for (const [k, v] of Object.entries(parsed.boxes)) {
        boxes[k] = { ...(boxes[k] || {}), ...v };
      }
    } else {
      for (const [k, v] of Object.entries(parsed.boxes)) {
        firstBoxes[k] = { ...(firstBoxes[k] || {}), ...v };
      }
    }
    pageRe.lastIndex = closeIdx + 1;
  }

  const rawSize = vars['page-size'] || atPageSize || 'Letter';
  const rawMargin = vars['page-margin'] || atPageMargin || '1in 1in 1in 1in';
  const background = vars['page-background'] || atPageBg || '#ffffff';
  const columns = Math.max(1, parseInt(vars['columns'] || '1', 10) || 1);
  const columnGap = vars['column-gap'] || '0.28in';

  // Resolve exact physical width & height (honoring landscape/portrait modifiers)
  let widthCss = vars['page-width'] || '';
  let heightCss = vars['page-height'] || '';
  const isLandscape = /\blandscape\b/i.test(rawSize);
  const sizeCore = rawSize.replace(/\b(portrait|landscape)\b/gi, '').trim();

  if (!widthCss || !heightCss) {
    const mapped = PAGE_SIZE_MAP[sizeCore.toLowerCase()];
    if (mapped) {
      widthCss = isLandscape ? mapped[1] : mapped[0];
      heightCss = isLandscape ? mapped[0] : mapped[1];
    } else {
      const dims = sizeCore.split(/\s+/);
      if (dims.length === 2) {
        widthCss = isLandscape ? dims[1] : dims[0];
        heightCss = isLandscape ? dims[0] : dims[1];
      } else {
        widthCss = isLandscape ? '11in' : '8.5in';
        heightCss = isLandscape ? '8.5in' : '11in';
      }
    }
  }

  const [marginTop, marginRight, marginBottom, marginLeft] = expandMargin(rawMargin);

  // Meta fallbacks for running header/footer when style.css doesn't specify them
  if (meta?.running_header && !boxes['top-left'] && !boxes['top-center'] && !boxes['top-right']) {
    boxes['top-center'] = { content: `"${String(meta.running_header).replace(/"/g, '\\"')}"`, 'font-size': '8.5pt', color: '#666' };
  }
  if (meta?.running_footer && !boxes['bottom-left'] && !boxes['bottom-center'] && !boxes['bottom-right']) {
    boxes['bottom-center'] = { content: `"${String(meta.running_footer).replace(/"/g, '\\"')}"`, 'font-size': '8.5pt', color: '#666' };
  }

  return {
    rawSize,
    widthCss,
    heightCss,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    background,
    columns,
    columnGap,
    boxes,
    firstBoxes,
  };
}

/**
 * Strip @page blocks from user style.css before injecting into a paginated document
 * so Chrome print uses our exact 1-to-1 @page { size: W H; margin: 0; } without
 * double margins or duplicate native margin boxes.
 */
export function stripAtPageRules(styleCss = '') {
  let out = '';
  let i = 0;
  while (i < styleCss.length) {
    const rest = styleCss.slice(i);
    const m = rest.match(/^@page\b[^{]*\{/i);
    if (m) {
      const openIdx = i + m[0].length - 1;
      const closeIdx = findClosingBrace(styleCss, openIdx);
      if (closeIdx > openIdx) {
        i = closeIdx + 1;
        continue;
      }
    }
    out += styleCss[i];
    i++;
  }
  return out;
}

/**
 * Emit concrete @page & CSS geometry variables for 1-to-1 screen/print sheets.
 */
export function buildPaginatedPageCss(config) {
  return `:root {
  --page-width: ${config.widthCss};
  --page-height: ${config.heightCss};
  --wa-margin-top: ${config.marginTop};
  --wa-margin-right: ${config.marginRight};
  --wa-margin-bottom: ${config.marginBottom};
  --wa-margin-left: ${config.marginLeft};
}
@page {
  size: ${config.widthCss} ${config.heightCss};
  margin: 0 !important;
  background: ${config.background};
}`;
}

/**
 * Evaluate a CSS margin-box `content:` expression for page `pageNum` of `totalPages`.
 */
function evaluateMarginContent(expr, pageNum, totalPages) {
  if (!expr) return '';
  const trimmed = expr.trim();
  if (trimmed === 'none' || trimmed === 'normal' || trimmed === '""' || trimmed === "''") return '';

  const tokenRe = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|counter\(\s*(page|pages)\s*\)/gi;
  let result = '';
  let m;
  while ((m = tokenRe.exec(trimmed)) !== null) {
    if (m[1] !== undefined) {
      result += m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else if (m[2] !== undefined) {
      result += m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    } else if (m[3]) {
      result += m[3].toLowerCase() === 'pages' ? String(totalPages) : String(pageNum);
    }
  }
  return result;
}

function applyMarginBoxStyles(el, decls) {
  for (const [prop, val] of Object.entries(decls || {})) {
    if (ALLOWED_MARGIN_PROPS.has(prop)) {
      el.style.setProperty(prop, val);
    }
  }
}

function createSheetElement(doc, pageNum) {
  const section = doc.createElement('section');
  section.className = 'wa-page';
  section.setAttribute('data-page', String(pageNum));

  const topBand = doc.createElement('div');
  topBand.className = 'wa-margin-top';
  for (const pos of ['top-left', 'top-center', 'top-right']) {
    const box = doc.createElement('div');
    box.className = `wa-margin-box wa-${pos}`;
    topBand.appendChild(box);
  }

  const content = doc.createElement('div');
  content.className = 'wa-page-content';

  const bottomBand = doc.createElement('div');
  bottomBand.className = 'wa-margin-bottom';
  for (const pos of ['bottom-left', 'bottom-center', 'bottom-right']) {
    const box = doc.createElement('div');
    box.className = `wa-margin-box wa-${pos}`;
    bottomBand.appendChild(box);
  }

  section.appendChild(topBand);
  section.appendChild(content);
  section.appendChild(bottomBand);
  return section;
}

function populateMarginBoxes(pagesEl, config) {
  const sheets = Array.from(pagesEl.querySelectorAll(':scope > .wa-page'));
  const total = sheets.length;
  pagesEl.setAttribute('data-page-count', String(total));

  sheets.forEach((sheet, idx) => {
    const pageNum = idx + 1;
    const isFirst = pageNum === 1;
    for (const boxName of MARGIN_BOX_NAMES) {
      const boxEl = sheet.querySelector(`.wa-${boxName}`);
      if (!boxEl) continue;
      const baseDecl = config.boxes[boxName] || null;
      const firstDecl = isFirst ? config.firstBoxes[boxName] || null : null;
      const effective = firstDecl ? { ...(baseDecl || {}), ...firstDecl } : baseDecl;
      if (!effective || !effective.content) continue;
      const text = evaluateMarginContent(effective.content, pageNum, total);
      if (text) {
        boxEl.textContent = text;
        applyMarginBoxStyles(boxEl, effective);
      }
    }
  });
}

function isHeading(el) {
  return el && /^H[1-6]$/.test(el.tagName);
}

function isAtomic(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = el.tagName;
  if (tag === 'FIGURE' || tag === 'PRE' || tag === 'BLOCKQUOTE' || tag === 'ASIDE' || tag === 'NAV' || tag === 'HR' || tag === 'HEADER') {
    return true;
  }
  const cl = el.classList;
  return (
    cl.contains('figure') ||
    cl.contains('callout') ||
    cl.contains('pull-quote') ||
    cl.contains('sidebar') ||
    cl.contains('toc') ||
    cl.contains('no-break') ||
    cl.contains('signature-block') ||
    cl.contains('title-block')
  );
}

function isSpanAll(el, columns) {
  if (columns <= 1) return true;
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = el.tagName;
  if (tag === 'HEADER' || tag === 'TABLE' || tag === 'FIGURE' || tag === 'NAV') return true;
  const cl = el.classList;
  return (
    cl.contains('title-block') ||
    cl.contains('cover') ||
    cl.contains('toc') ||
    cl.contains('abstract') ||
    cl.contains('footnotes') ||
    cl.contains('figure') ||
    cl.contains('span-all') ||
    cl.contains('page-break')
  );
}

/**
 * Collect breakable word boundary positions across all descendant text nodes of `el`.
 */
function collectWordBreaks(el) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  const breaks = [];
  textNodes.forEach((tn, nodeIdx) => {
    const txt = tn.nodeValue || '';
    const re = /\S+/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      breaks.push({ nodeIdx, charEnd: m.index + m[0].length });
    }
  });
  return { textNodes, breaks };
}

/**
 * Clone `sourceEl` keeping only text up to break point (prefix=true) or after it (prefix=false).
 * Preserves nested inline markup (<strong>, <em>, <a>, <code>, <sup>) safely.
 */
function sliceElementAtBreak(sourceEl, targetNodeIdx, charEnd, keepPrefix) {
  const clone = sourceEl.cloneNode(true);
  const walker = clone.ownerDocument.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach((tn, idx) => {
    if (keepPrefix) {
      if (idx > targetNodeIdx) {
        tn.nodeValue = '';
      } else if (idx === targetNodeIdx) {
        tn.nodeValue = (tn.nodeValue || '').slice(0, charEnd);
      }
    } else {
      if (idx < targetNodeIdx) {
        tn.nodeValue = '';
      } else if (idx === targetNodeIdx) {
        tn.nodeValue = (tn.nodeValue || '').slice(charEnd).replace(/^\s+/, '');
      }
    }
  });

  // Prune empty inline wrapper elements created on the empty side
  const pruneEmpty = (parent) => {
    for (const child of Array.from(parent.children)) {
      pruneEmpty(child);
      if (child.tagName !== 'BR' && child.tagName !== 'IMG' && child.tagName !== 'INPUT' && child.textContent === '' && child.children.length === 0) {
        child.remove();
      }
    }
  };
  pruneEmpty(clone);
  return clone;
}

/**
 * Measure bottom edge of container's content relative to pageContentBottom.
 * Returns true if the container fits within `limitBottom`.
 */
function fitsWithin(container, limitBottom) {
  const last = container.lastElementChild;
  if (!last) return true;
  const r = last.getBoundingClientRect();
  return r.bottom <= limitBottom + 0.75;
}

/**
 * Attempt to split a <p> cleanly at word boundaries inside `container`, respecting orphans/widows.
 * Returns { head, tail } or null if it should not be split (move whole paragraph instead).
 */
function trySplitParagraph(pEl, container, limitBottom, lineHeightPx) {
  const { breaks } = collectWordBreaks(pEl);
  if (breaks.length < 8) return null;

  // Binary search largest break index whose prefix fits within limitBottom
  let lo = 0;
  let hi = breaks.length - 1;
  let best = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const br = breaks[mid];
    const cand = sliceElementAtBreak(pEl, br.nodeIdx, br.charEnd, true);
    container.appendChild(cand);
    const ok = fitsWithin(container, limitBottom);
    cand.remove();
    if (ok) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best < 3 || best >= breaks.length - 3) return null;

  const br = breaks[best];
  const head = sliceElementAtBreak(pEl, br.nodeIdx, br.charEnd, true);
  const tail = sliceElementAtBreak(pEl, br.nodeIdx, br.charEnd, false);

  // Enforce orphan / widow minimums (>= ~2 lines on both sides)
  const minH = Math.max(24, lineHeightPx * 1.85);
  container.appendChild(head);
  const headH = head.getBoundingClientRect().height;
  head.remove();

  container.appendChild(tail);
  const tailH = tail.getBoundingClientRect().height;
  tail.remove();

  if (headH < minH || tailH < minH) return null;

  tail.classList.add('wa-fragment-cont');
  tail.classList.remove('wa-first-body-p', 'drop-cap');
  if (pEl.hasAttribute('data-wa-line')) {
    const sLine = parseInt(pEl.getAttribute('data-wa-line'), 10) || 1;
    const eLine = parseInt(pEl.getAttribute('data-wa-line-end') || String(sLine), 10) || sLine;
    const ratio = (head.textContent || '').length / Math.max(1, (pEl.textContent || '').length);
    const interp = Math.min(eLine, Math.max(sLine, Math.round(sLine + (eLine - sLine) * ratio)));
    tail.setAttribute('data-wa-line', String(interp));
    if (eLine > interp) tail.setAttribute('data-wa-line-end', String(eLine));
    else tail.removeAttribute('data-wa-line-end');
  }
  return { head, tail };
}

/**
 * Split <ul> or <ol> between <li> items.
 */
function trySplitList(listEl, container, limitBottom) {
  const items = Array.from(listEl.children).filter((c) => c.tagName === 'LI');
  if (items.length < 2) return null;

  const head = listEl.cloneNode(false);
  container.appendChild(head);
  let fitted = 0;

  for (let i = 0; i < items.length; i++) {
    const itemClone = items[i].cloneNode(true);
    head.appendChild(itemClone);
    if (!fitsWithin(container, limitBottom)) {
      itemClone.remove();
      break;
    }
    fitted++;
  }
  head.remove();

  if (fitted === 0 || fitted >= items.length) return null;

  const tail = listEl.cloneNode(false);
  if (listEl.tagName === 'OL') {
    const startVal = parseInt(listEl.getAttribute('start') || '1', 10);
    tail.setAttribute('start', String(startVal + fitted));
  }
  for (let i = fitted; i < items.length; i++) {
    tail.appendChild(items[i].cloneNode(true));
  }
  const firstTailLi = tail.querySelector('li[data-wa-line]');
  if (firstTailLi) tail.setAttribute('data-wa-line', firstTailLi.getAttribute('data-wa-line'));
  return { head, tail };
}

/**
 * Split <table> between <tbody> <tr> rows, repeating <thead> on the continuation table.
 */
function trySplitTable(tableEl, container, limitBottom) {
  const tbody = tableEl.querySelector('tbody');
  if (!tbody) return null;
  const rows = Array.from(tbody.children).filter((c) => c.tagName === 'TR');
  if (rows.length < 2) return null;

  const thead = tableEl.querySelector('thead');
  const headTable = tableEl.cloneNode(false);
  if (thead) headTable.appendChild(thead.cloneNode(true));
  const headBody = tableEl.ownerDocument.createElement('tbody');
  headTable.appendChild(headBody);

  container.appendChild(headTable);
  let fitted = 0;
  for (let i = 0; i < rows.length; i++) {
    const rowClone = rows[i].cloneNode(true);
    headBody.appendChild(rowClone);
    if (!fitsWithin(container, limitBottom)) {
      rowClone.remove();
      break;
    }
    fitted++;
  }
  headTable.remove();

  if (fitted === 0 || fitted >= rows.length) return null;

  const tailTable = tableEl.cloneNode(false);
  if (thead) tailTable.appendChild(thead.cloneNode(true));
  const tailBody = tableEl.ownerDocument.createElement('tbody');
  for (let i = fitted; i < rows.length; i++) {
    tailBody.appendChild(rows[i].cloneNode(true));
  }
  tailTable.appendChild(tailBody);
  const firstTailTr = tailBody.querySelector('tr[data-wa-line]');
  if (firstTailTr) tailTable.setAttribute('data-wa-line', firstTailTr.getAttribute('data-wa-line'));
  return { head: headTable, tail: tailTable };
}

/**
 * Split <section class="footnotes"> between footnote <li> items if needed.
 */
function trySplitFootnotes(secEl, container, limitBottom) {
  const ol = secEl.querySelector('ol');
  if (!ol) return null;
  const items = Array.from(ol.children).filter((c) => c.tagName === 'LI');
  if (items.length < 2) return null;

  const headSec = secEl.cloneNode(false);
  const headOl = ol.cloneNode(false);
  headSec.appendChild(headOl);
  container.appendChild(headSec);

  let fitted = 0;
  for (let i = 0; i < items.length; i++) {
    const c = items[i].cloneNode(true);
    headOl.appendChild(c);
    if (!fitsWithin(container, limitBottom)) {
      c.remove();
      break;
    }
    fitted++;
  }
  headSec.remove();

  if (fitted === 0 || fitted >= items.length) return null;

  const tailSec = secEl.cloneNode(false);
  tailSec.classList.add('wa-footnotes-cont');
  const tailOl = ol.cloneNode(false);
  const baseStart = parseInt(ol.getAttribute('start') || '1', 10);
  tailOl.setAttribute('start', String(baseStart + fitted));
  for (let i = fitted; i < items.length; i++) {
    tailOl.appendChild(items[i].cloneNode(true));
  }
  tailSec.appendChild(tailOl);
  return { head: headSec, tail: tailSec };
}

/**
 * Place one item into `targetContainer` (subject to `limitBottom`).
 * Returns:
 *   { status: 'placed' }
 *   { status: 'split', remainder: Element }
 *   { status: 'overflow' }  (caller should advance to next column/page and retry)
 */
function placeElementInto(el, targetContainer, limitBottom, containerIsEmpty, nextSibling, lineHeightPx, maxBoxHeight) {
  // Clamp oversized figures on an empty page so they never clip or infinite-loop
  if (containerIsEmpty && (el.tagName === 'FIGURE' || el.classList.contains('figure'))) {
    const img = el.querySelector('img');
    if (img) {
      img.style.maxHeight = `${Math.max(120, Math.floor(maxBoxHeight - 52))}px`;
    }
  }

  targetContainer.appendChild(el);
  const fits = fitsWithin(targetContainer, limitBottom);

  if (fits) {
    // Anti-orphan check for headings: require space below heading for follower
    if (isHeading(el) && !containerIsEmpty && nextSibling && !nextSibling.classList?.contains('page-break')) {
      const headBottom = el.getBoundingClientRect().bottom;
      const remaining = limitBottom - headBottom;
      const minNeeded = Math.max(46, lineHeightPx * 2.6);
      if (remaining < minNeeded) {
        el.remove();
        return { status: 'overflow' };
      }
    }
    return { status: 'placed' };
  }

  // Element overflowed! Remove and decide whether to split or push whole element.
  el.remove();

  if (el.tagName === 'P') {
    const split = trySplitParagraph(el, targetContainer, limitBottom, lineHeightPx);
    if (split) {
      targetContainer.appendChild(split.head);
      return { status: 'split', remainder: split.tail };
    }
  } else if (el.tagName === 'UL' || el.tagName === 'OL') {
    const split = trySplitList(el, targetContainer, limitBottom);
    if (split) {
      targetContainer.appendChild(split.head);
      return { status: 'split', remainder: split.tail };
    }
  } else if (el.tagName === 'TABLE') {
    const split = trySplitTable(el, targetContainer, limitBottom);
    if (split) {
      targetContainer.appendChild(split.head);
      return { status: 'split', remainder: split.tail };
    }
  } else if (el.classList.contains('footnotes')) {
    const split = trySplitFootnotes(el, targetContainer, limitBottom);
    if (split) {
      targetContainer.appendChild(split.head);
      return { status: 'split', remainder: split.tail };
    }
  }

  // If container is already empty and we still couldn't split (e.g., giant atomic block),
  // force-place it once to guarantee forward progress and prevent infinite loops.
  if (containerIsEmpty) {
    targetContainer.appendChild(el);
    return { status: 'placed' };
  }

  return { status: 'overflow' };
}

/**
 * Paginate the rendered <article class="wa-document"> inside `targetDoc` into
 * discrete <section class="wa-page"> sheets inside `<div class="wa-pages">`.
 */
export async function paginateDocument(targetDoc, sourceArticleHtml, config) {
  const mount = targetDoc.getElementById('wa-root');
  if (!mount) return { pageCount: 1 };

  // Build staging wrapper offscreen with real styles active
  const staging = targetDoc.createElement('div');
  staging.className = 'wa-pages wa-staging';
  targetDoc.body.appendChild(staging);

  // Parse source HTML into detached fragment & tag first body paragraph for drop-cap scoping
  const tpl = targetDoc.createElement('template');
  tpl.innerHTML = sourceArticleHtml;
  const srcArticle = tpl.content.querySelector('.wa-document');
  if (!srcArticle) {
    staging.remove();
    return { pageCount: 1 };
  }

  const titleBlock = srcArticle.querySelector(':scope > .title-block');
  const srcBody = srcArticle.querySelector(':scope > .wa-body');
  const firstBodyP = srcBody ? srcBody.querySelector(':scope > p') : null;
  if (firstBodyP) firstBodyP.classList.add('wa-first-body-p');

  // Ensure all images in the source fragment are decoded before measuring
  const preloadHost = targetDoc.createElement('div');
  preloadHost.style.cssText = 'position:fixed;left:-20000px;top:0;visibility:hidden;width:600px;';
  preloadHost.appendChild(srcArticle);
  targetDoc.body.appendChild(preloadHost);

  try {
    if (targetDoc.fonts && targetDoc.fonts.ready) {
      await targetDoc.fonts.ready;
    }
    const imgs = Array.from(preloadHost.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              const t = setTimeout(res, 1800);
              img.onload = () => { clearTimeout(t); res(); };
              img.onerror = () => { clearTimeout(t); res(); };
            })
      )
    );
  } catch (_e) {
    // continue with available metrics
  }

  // Build ordered queue of top-level blocks to paginate
  const queue = [];
  if (titleBlock) {
    queue.push({ el: titleBlock, isTitle: true, isCover: titleBlock.classList.contains('cover') });
  }
  if (srcBody) {
    for (const child of Array.from(srcBody.children)) {
      queue.push({ el: child, isTitle: false, isCover: false });
    }
  }
  preloadHost.remove();

  // Compute reference line height once
  const bodyCs = targetDoc.defaultView ? targetDoc.defaultView.getComputedStyle(targetDoc.body) : null;
  const lineHeightPx = bodyCs ? parseFloat(bodyCs.lineHeight) || (parseFloat(bodyCs.fontSize) || 14) * 1.5 : 20;

  const columns = config.columns >= 2 ? 2 : 1;
  let pageNum = 0;
  let currentSheet = null;
  let pageContent = null;
  let pageContentRect = null;
  let activeSingleBody = null;
  let activeColsGrid = null;
  let activeColIdx = 0; // 0 = left, 1 = right

  function openNewPage() {
    pageNum++;
    currentSheet = createSheetElement(targetDoc, pageNum);
    staging.appendChild(currentSheet);
    pageContent = currentSheet.querySelector('.wa-page-content');
    pageContentRect = pageContent.getBoundingClientRect();
    activeSingleBody = null;
    activeColsGrid = null;
    activeColIdx = 0;
  }

  function ensureSingleBody() {
    if (!activeSingleBody) {
      activeColsGrid = null;
      activeColIdx = 0;
      activeSingleBody = targetDoc.createElement('div');
      activeSingleBody.className = 'wa-body wa-flow-single';
      pageContent.appendChild(activeSingleBody);
    }
    return activeSingleBody;
  }

  function ensureColumnBox() {
    if (!activeColsGrid) {
      activeSingleBody = null;
      activeColsGrid = targetDoc.createElement('div');
      activeColsGrid.className = 'wa-cols-2';
      const col0 = targetDoc.createElement('div');
      col0.className = 'wa-col wa-body';
      const col1 = targetDoc.createElement('div');
      col1.className = 'wa-col wa-body';
      activeColsGrid.appendChild(col0);
      activeColsGrid.appendChild(col1);
      pageContent.appendChild(activeColsGrid);
      activeColIdx = 0;
    }
    return activeColsGrid.children[activeColIdx];
  }

  function pageHasContent() {
    if (!pageContent) return false;
    for (const child of Array.from(pageContent.children)) {
      if (child.classList.contains('wa-cols-2')) {
        if (child.children[0].children.length > 0 || child.children[1].children.length > 0) return true;
      } else if (child.classList.contains('wa-body')) {
        if (child.children.length > 0) return true;
      } else {
        return true;
      }
    }
    return false;
  }

  openNewPage();

  let safetyCounter = 0;
  const maxSteps = Math.max(400, queue.length * 14);

  while (queue.length > 0 && safetyCounter++ < maxSteps) {
    const item = queue.shift();
    const el = item.el;
    const nextEl = queue.length > 0 ? queue[0].el : null;

    // 1. Explicit page break
    if (el.classList && el.classList.contains('page-break')) {
      if (pageHasContent()) {
        openNewPage();
      }
      continue;
    }

    // 2. Title block (full width)
    if (item.isTitle) {
      if (pageHasContent()) openNewPage();
      pageContent.appendChild(el);
      if (item.isCover && queue.length > 0) {
        openNewPage();
      }
      continue;
    }

    const limitBottom = pageContentRect.bottom;
    const maxBoxHeight = pageContentRect.height;

    // 3. Single-column OR span-all element in 2-column mode
    if (columns === 1 || isSpanAll(el, columns)) {
      // If a span-all block arrives after a 2-col band, close the 2-col band first
      if (activeColsGrid) {
        activeColsGrid = null;
        activeColIdx = 0;
      }
      const flow = ensureSingleBody();
      const emptyPage = !pageHasContent();
      const res = placeElementInto(el, flow, limitBottom, emptyPage, nextEl, lineHeightPx, maxBoxHeight);

      if (res.status === 'placed') {
        continue;
      }
      if (res.status === 'split') {
        queue.unshift({ el: res.remainder, isTitle: false, isCover: false });
        openNewPage();
        continue;
      }
      // Overflow -> advance to a fresh page and retry
      openNewPage();
      queue.unshift(item);
      continue;
    }

    // 4. Two-column columnar element
    const colBox = ensureColumnBox();
    const colIsEmpty = colBox.children.length === 0 && !pageHasContent();
    const res = placeElementInto(el, colBox, limitBottom, colIsEmpty, nextEl, lineHeightPx, maxBoxHeight);

    if (res.status === 'placed') {
      continue;
    }
    if (res.status === 'split') {
      queue.unshift({ el: res.remainder, isTitle: false, isCover: false });
      if (activeColIdx === 0) {
        activeColIdx = 1;
      } else {
        openNewPage();
      }
      continue;
    }
    // Overflow in column 0 -> switch to column 1; overflow in column 1 -> open new page
    if (activeColIdx === 0) {
      activeColIdx = 1;
      queue.unshift(item);
    } else {
      openNewPage();
      queue.unshift(item);
    }
  }

  // Remove empty trailing page if one was left over
  const allSheets = Array.from(staging.querySelectorAll(':scope > .wa-page'));
  if (allSheets.length > 1) {
    const last = allSheets[allSheets.length - 1];
    const pc = last.querySelector('.wa-page-content');
    const hasAnything = pc && pc.textContent.trim().length > 0 || (pc && pc.querySelector('img, svg, hr, table'));
    if (!hasAnything) {
      last.remove();
    }
  }

  // Stamp resolved running headers, footers & Page N of M counters onto every page
  populateMarginBoxes(staging, config);

  // Atomic commit: swap offscreen staging tree into #wa-root in one frame (zero flicker!)
  staging.classList.remove('wa-staging');
  mount.innerHTML = '';
  mount.appendChild(staging);

  const pageCount = staging.querySelectorAll(':scope > .wa-page').length;
  return { pageCount };
}
