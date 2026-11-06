// Style panel (template, quick typography settings, raw template.css editor) and the template gallery.
import { h, fill, icon, openDialog, closeDialog } from './dom.js';
import { TEMPLATES, loadTemplate, detectTemplate } from '../templates.js';
import { splitFrontMatter, renderMarkdownInto, renderTitleBlock, hasMeta, refreshToc } from '../markdown.js';

const APP_BASE = new URL('../../', import.meta.url).href;

const FONTS = [
  ['', 'Template default'],
  ['"CMU Serif", "Latin Modern Roman", "Computer Modern Serif", Georgia, serif', 'Computer Modern (LaTeX)'],
  ['"EB Garamond", Garamond, "Times New Roman", serif', 'EB Garamond'],
  ['"Source Serif 4", "Source Serif Pro", Georgia, serif', 'Source Serif'],
  ['Georgia, "Times New Roman", serif', 'Georgia'],
  ['"Times New Roman", Times, serif', 'Times'],
  ['Inter, "Helvetica Neue", Arial, sans-serif', 'Inter'],
  ['"CMU Sans Serif", "Helvetica Neue", Arial, sans-serif', 'Computer Modern Sans'],
  ['"Helvetica Neue", Helvetica, Arial, sans-serif', 'Helvetica / Arial'],
  ['system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', 'System UI'],
  ['"CMU Typewriter Text", "Courier Prime", "Courier New", monospace', 'Typewriter'],
  ['"JetBrains Mono", ui-monospace, monospace', 'JetBrains Mono'],
];
const SIZES = ['', '10pt', '10.5pt', '11pt', '12pt', '13pt', '14pt', '16pt'];
const LINE_HEIGHTS = ['', '1.2', '1.35', '1.5', '1.65', '1.8', '2'];
export const PAGE_SIZES = [
  ['letter', 'US Letter', '8.5in', '11in'], ['legal', 'US Legal', '8.5in', '14in'], ['ledger', 'Tabloid', '11in', '17in'],
  ['executive', 'Executive', '7.25in', '10.5in'], ['A3', 'A3', '297mm', '420mm'], ['A4', 'A4', '210mm', '297mm'],
  ['A5', 'A5', '148mm', '210mm'], ['B5', 'B5', '176mm', '250mm'], ['5.5in 8.5in', 'Digest 5.5 × 8.5 in', '5.5in', '8.5in'],
  ['6in 9in', 'Book 6 × 9 in', '6in', '9in'],
];
const PAGES = [['', 'Template default'], ...PAGE_SIZES.map(([v, l]) => [v, l])];
const PAGE_DIMS = Object.fromEntries(PAGE_SIZES.map(([v, , w, h]) => [v, [w, h]]));
const ORIENTATIONS = [['', 'Portrait'], ['landscape', 'Landscape']];
const MARGINS = ['', '0.5in', '0.75in', '1in', '1.25in', '1.5in', '2cm', '2.5cm', '3cm'];

const START = '/* --- Write Along quick settings (Style panel) --- */';
const END = '/* --- end quick settings --- */';

export function parseQuick(css) {
  const i = css.indexOf(START);
  const j = css.indexOf(END);
  const q = {};
  if (i < 0 || j < i) return q;
  const block = css.slice(i, j);
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) q[m[1]] = m[2].trim();
  const page = /@page\s*{([^}]*)}/.exec(block);
  if (page) {
    const size = /size:\s*([^;]+);/.exec(page[1])?.[1].trim() || '';
    const known = PAGE_SIZES.find(([v]) => v === size || `${v} landscape` === size || v.split(' ').reverse().join(' ') === size && v.includes(' '));
    q.pageSize = known ? known[0] : size;
    if (known && size !== known[0]) q.pageOrientation = 'landscape';
    q.pageMargin = /margin:\s*([^;]+);/.exec(page[1])?.[1].trim() || '';
  }
  return q;
}

/** Changes only the page size / orientation of a stylesheet. */
export function withPageSize(css, size, orientation) {
  const q = parseQuick(css);
  if (size !== undefined) { if (size) q.pageSize = size; else delete q.pageSize; }
  if (orientation !== undefined) { if (orientation) q.pageOrientation = orientation; else delete q.pageOrientation; }
  return applyQuick(css, q);
}

/** Human name for the page size a document will print at, from its computed page width/height. */
export function describePage(widthPx, heightPx) {
  const toPx = (v) => parseFloat(v) * (v.endsWith('mm') ? 96 / 25.4 : 96);
  const landscape = widthPx > heightPx + 1;
  const [a, b] = landscape ? [heightPx, widthPx] : [widthPx, heightPx];
  const hit = PAGE_SIZES.find(([, , w, h]) => Math.abs(toPx(w) - a) < 2 && Math.abs(toPx(h) - b) < 2);
  const name = hit ? hit[1].replace(/ \d.*$/, '') : `${(widthPx / 96).toFixed(2).replace(/\.?0+$/, '')} × ${(heightPx / 96).toFixed(2).replace(/\.?0+$/, '')} in`;
  return { name, landscape, id: hit?.[0] || '' };
}

export function applyQuick(css, q) {
  const i = css.indexOf(START);
  const j = css.indexOf(END);
  let base = i >= 0 && j > i ? css.slice(0, i).trimEnd() + css.slice(j + END.length) : css;
  base = base.trimEnd();
  const derived = ['--page-width', '--page-min-height', '--page-padding'];
  const vars = Object.entries(q).filter(([k, v]) => k.startsWith('--') && v && !derived.includes(k));
  const landscape = q.pageOrientation === 'landscape';
  if (q.pageSize && PAGE_DIMS[q.pageSize]) {
    const [w, h] = PAGE_DIMS[q.pageSize];
    vars.push(['--page-width', landscape ? h : w], ['--page-min-height', landscape ? w : h]);
  }
  if (q.pageMargin) vars.push(['--page-padding', q.pageMargin]);
  const size = q.pageSize && (landscape ? (q.pageSize.includes(' ') ? q.pageSize.split(' ').reverse().join(' ') : `${q.pageSize} landscape`) : q.pageSize);
  const page = [size && `size: ${size};`, q.pageMargin && `margin: ${q.pageMargin};`].filter(Boolean);
  if (!vars.length && !page.length) return base + '\n';
  const uniq = new Map(vars);
  return `${base}\n\n${START}\n:root {\n${[...uniq].map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n${page.length ? `@page { ${page.join(' ')} }\n` : ''}${END}\n`;
}

/** Live preview of a template rendered in a small iframe. */
function previewFrame(t) {
  const frame = h('iframe', { loading: 'lazy', tabindex: '-1', title: `${t.name} preview` });
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${APP_BASE}fonts/fonts.css"><link rel="stylesheet" href="${APP_BASE}css/page.css"><style></style></head><body></body></html>`;
  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    doc.querySelector('style').textContent = t.css;
    const { meta, body } = splitFrontMatter(t.sample);
    renderMarkdownInto(body, doc.body);
    if (hasMeta(meta)) doc.body.prepend(renderTitleBlock(meta, doc));
    refreshToc(doc.body);
  }, { once: true });
  return frame;
}

export async function openGallery({ currentCss, onNew, onApply }) {
  const current = detectTemplate(currentCss)?.id;
  const loaded = await Promise.all(TEMPLATES.map((t) => loadTemplate(t.id).catch(() => null)));
  return openDialog('Templates', () => h('div.dlg-body',
    h('p.help', { style: { marginTop: 0 } }, 'Start a new document from a template, or restyle the one you are working on. Every template is just CSS — you can tweak it afterwards in the Style panel.'),
    h('div.gallery', loaded.filter(Boolean).map((t) => h('div.tpl-card' + (t.id === current ? '.current' : ''),
      h('div.tpl-thumb', previewFrame(t)),
      h('div.tpl-info',
        h('b', t.name, t.id === current ? h('span.status-pill.ok', { style: { marginLeft: '8px' } }, 'Current') : null),
        h('small', t.description),
        h('div.btn-row',
          h('button.btn.small.primary', { type: 'button', onclick: () => { closeDialog(); onNew(t); } }, icon('file-plus'), 'New document'),
          h('button.btn.small', { type: 'button', onclick: () => { closeDialog(); onApply(t); } }, icon('palette'), 'Apply style'))))))), { wide: true });
}

export function initStylePanel({ root, getCss, setCss, onBrowse, onExportCss }) {
  let timer = 0;
  const editor = h('textarea.css-editor', { spellcheck: false, oninput: () => {
    clearTimeout(timer);
    timer = setTimeout(() => { setCss(editor.value, { fromEditor: true }); renderQuick(); }, 300);
  } });
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input'));
    }
  });
  const quickBox = h('div');
  const currentBox = h('div.card');

  const select = (label, options, value, onchange) => h('label.field', h('span', label),
    h('select', { onchange: (e) => onchange(e.target.value) },
      options.map((o) => (Array.isArray(o) ? h('option', { value: o[0], selected: o[0] === value }, o[1]) : h('option', { value: o, selected: o === value }, o || 'Template default')))));

  function update(key, value) {
    const q = parseQuick(getCss());
    q[key] = value;
    if (!value) delete q[key];
    setCss(applyQuick(getCss(), q));
  }

  function renderQuick() {
    const q = parseQuick(getCss());
    const t = detectTemplate(getCss());
    fill(currentBox, h('div.tpl-current',
      icon('layout-template'),
      h('div', { style: { flex: 1 } }, h('b', t ? t.name : 'Custom style'), h('small.muted', t ? t.description : 'This document carries its own template.css.')),
      h('button.btn.small', { type: 'button', onclick: onBrowse }, 'Change…')));
    const accentOn = !!q['--accent'];
    fill(quickBox, 
      h('div.field-row',
        select('Body font', FONTS, q['--font-body'] || '', (v) => update('--font-body', v)),
        select('Heading font', FONTS, q['--font-heading'] || '', (v) => update('--font-heading', v))),
      h('div.field-row',
        select('Text size', SIZES, q['--font-size'] || '', (v) => update('--font-size', v)),
        select('Line spacing', LINE_HEIGHTS, q['--line-height'] || '', (v) => update('--line-height', v))),
      h('div.field-row',
        select('Page size', PAGES, q.pageSize || '', (v) => update('pageSize', v)),
        select('Margins', MARGINS, q.pageMargin || '', (v) => update('pageMargin', v))),
      h('div.field-row',
        select('Orientation', ORIENTATIONS, q.pageOrientation || '', (v) => update('pageOrientation', v)),
        h('div')),
      h('label.field', h('span', 'Accent colour'),
        h('div.inline-input',
          h('input', { type: 'color', value: q['--accent'] || '#3b5bdb', disabled: !accentOn, oninput: (e) => update('--accent', e.target.value) }),
          h('label.chk', h('input', { type: 'checkbox', checked: accentOn, onchange: (e) => update('--accent', e.target.checked ? '#3b5bdb' : '') }), 'Override')),
        h('small', 'Used by templates for headings, rules and links where they support it.')),
    );
    if (document.activeElement !== editor) editor.value = getCss();
  }

  fill(root, 
    h('h3', 'Template'),
    currentBox,
    h('h3', 'Quick settings'),
    quickBox,
    h('h3', 'template.css'),
    h('p.help', 'All formatting lives in this stylesheet, saved inside your document. Edits apply live.'),
    editor,
    h('div.btn-row', { style: { marginTop: '8px' } },
      h('button.btn.small', { type: 'button', onclick: async () => {
        const t = detectTemplate(getCss());
        if (!t) return;
        const fresh = await loadTemplate(t.id);
        setCss(fresh.css);
      } }, icon('refresh-cw'), 'Reset to template'),
      h('button.btn.small', { type: 'button', onclick: onExportCss }, icon('file-code'), 'Download CSS')),
  );
  renderQuick();
  return { render: renderQuick };
}
