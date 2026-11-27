/**
 * Write Along — Shared Document Renderer (runtime/render.js)
 * Used identically by both the Editor live preview iframe and read.html.
 */

import { Marked } from '../vendor/marked.esm.js';
import DOMPurify from '../vendor/dompurify.esm.js';
import {
  parsePageConfig,
  stripAtPageRules,
  buildPaginatedPageCss,
  paginateDocument,
} from './paginate.js';

export const WA_VERSION = '2.0.0';

export function getWaReaderFilename(version = WA_VERSION) {
  return `wa-reader.${version}.html`;
}

export const WA_READER_FILENAME = getWaReaderFilename(WA_VERSION);

const PAGE_SIZE_MAP = {
  'letter': ['8.5in', '11in'],
  'letter portrait': ['8.5in', '11in'],
  'letter landscape': ['11in', '8.5in'],
  'a4': ['210mm', '297mm'],
  'a4 portrait': ['210mm', '297mm'],
  'a4 landscape': ['297mm', '210mm'],
  'a5': ['148mm', '210mm'],
  'a5 portrait': ['148mm', '210mm'],
  'a5 landscape': ['210mm', '148mm'],
  'legal': ['8.5in', '14in'],
  'legal portrait': ['8.5in', '14in'],
  'legal landscape': ['14in', '8.5in'],
  'tabloid': ['11in', '17in'],
  'executive': ['7.25in', '10.5in'],
};

const ALERT_TYPES = {
  NOTE: { cls: 'callout-note', label: 'Note', icon: 'ℹ' },
  TIP: { cls: 'callout-tip', label: 'Tip', icon: '✦' },
  IMPORTANT: { cls: 'callout-important', label: 'Important', icon: '◆' },
  WARNING: { cls: 'callout-warning', label: 'Warning', icon: '▲' },
  CAUTION: { cls: 'callout-caution', label: 'Caution', icon: '!' },
};

/**
 * Known bundled open-license fonts in runtime/fonts/
 */
export const BUNDLED_FONT_FILES = {
  'EB Garamond': [
    ['eb-garamond-latin-400-normal.woff2', 400, 'normal'],
    ['eb-garamond-latin-600-normal.woff2', 600, 'normal'],
    ['eb-garamond-latin-700-normal.woff2', 700, 'normal'],
    ['eb-garamond-latin-400-italic.woff2', 400, 'italic'],
    ['eb-garamond-latin-700-italic.woff2', 700, 'italic'],
  ],
  'Cormorant Garamond': [
    ['cormorant-garamond-latin-400-normal.woff2', 400, 'normal'],
    ['cormorant-garamond-latin-600-normal.woff2', 600, 'normal'],
    ['cormorant-garamond-latin-700-normal.woff2', 700, 'normal'],
    ['cormorant-garamond-latin-400-italic.woff2', 400, 'italic'],
    ['cormorant-garamond-latin-700-italic.woff2', 700, 'italic'],
  ],
  'Libre Baskerville': [
    ['libre-baskerville-latin-400-normal.woff2', 400, 'normal'],
    ['libre-baskerville-latin-700-normal.woff2', 700, 'normal'],
    ['libre-baskerville-latin-400-italic.woff2', 400, 'italic'],
  ],
  'Crimson Pro': [
    ['crimson-pro-latin-400-normal.woff2', 400, 'normal'],
    ['crimson-pro-latin-600-normal.woff2', 600, 'normal'],
    ['crimson-pro-latin-700-normal.woff2', 700, 'normal'],
    ['crimson-pro-latin-400-italic.woff2', 400, 'italic'],
    ['crimson-pro-latin-600-italic.woff2', 600, 'italic'],
  ],
  'Playfair Display': [
    ['playfair-display-latin-400-normal.woff2', 400, 'normal'],
    ['playfair-display-latin-700-normal.woff2', 700, 'normal'],
    ['playfair-display-latin-400-italic.woff2', 400, 'italic'],
    ['playfair-display-latin-700-italic.woff2', 700, 'italic'],
  ],
  'Lora': [
    ['lora-latin-400-normal.woff2', 400, 'normal'],
    ['lora-latin-600-normal.woff2', 600, 'normal'],
    ['lora-latin-700-normal.woff2', 700, 'normal'],
    ['lora-latin-400-italic.woff2', 400, 'italic'],
    ['lora-latin-600-italic.woff2', 600, 'italic'],
  ],
  'Merriweather': [
    ['merriweather-latin-400-normal.woff2', 400, 'normal'],
    ['merriweather-latin-700-normal.woff2', 700, 'normal'],
    ['merriweather-latin-400-italic.woff2', 400, 'italic'],
  ],
  'Source Serif 4': [
    ['source-serif-4-latin-400-normal.woff2', 400, 'normal'],
    ['source-serif-4-latin-600-normal.woff2', 600, 'normal'],
    ['source-serif-4-latin-700-normal.woff2', 700, 'normal'],
    ['source-serif-4-latin-400-italic.woff2', 400, 'italic'],
    ['source-serif-4-latin-600-italic.woff2', 600, 'italic'],
  ],
  'Inter': [
    ['inter-latin-400-normal.woff2', 400, 'normal'],
    ['inter-latin-500-normal.woff2', 500, 'normal'],
    ['inter-latin-600-normal.woff2', 600, 'normal'],
    ['inter-latin-700-normal.woff2', 700, 'normal'],
  ],
  'Source Sans 3': [
    ['source-sans-3-latin-400-normal.woff2', 400, 'normal'],
    ['source-sans-3-latin-600-normal.woff2', 600, 'normal'],
    ['source-sans-3-latin-700-normal.woff2', 700, 'normal'],
    ['source-sans-3-latin-400-italic.woff2', 400, 'italic'],
  ],
  'Work Sans': [
    ['work-sans-latin-400-normal.woff2', 400, 'normal'],
    ['work-sans-latin-600-normal.woff2', 600, 'normal'],
    ['work-sans-latin-700-normal.woff2', 700, 'normal'],
    ['work-sans-latin-400-italic.woff2', 400, 'italic'],
  ],
  'Montserrat': [
    ['montserrat-latin-400-normal.woff2', 400, 'normal'],
    ['montserrat-latin-600-normal.woff2', 600, 'normal'],
    ['montserrat-latin-700-normal.woff2', 700, 'normal'],
    ['montserrat-latin-400-italic.woff2', 400, 'italic'],
  ],
  'Raleway': [
    ['raleway-latin-400-normal.woff2', 400, 'normal'],
    ['raleway-latin-600-normal.woff2', 600, 'normal'],
    ['raleway-latin-700-normal.woff2', 700, 'normal'],
    ['raleway-latin-400-italic.woff2', 400, 'italic'],
  ],
  'IBM Plex Sans': [
    ['ibm-plex-sans-latin-400-normal.woff2', 400, 'normal'],
    ['ibm-plex-sans-latin-600-normal.woff2', 600, 'normal'],
    ['ibm-plex-sans-latin-700-normal.woff2', 700, 'normal'],
    ['ibm-plex-sans-latin-400-italic.woff2', 400, 'italic'],
  ],
  'IBM Plex Serif': [
    ['ibm-plex-serif-latin-400-normal.woff2', 400, 'normal'],
    ['ibm-plex-serif-latin-600-normal.woff2', 600, 'normal'],
    ['ibm-plex-serif-latin-700-normal.woff2', 700, 'normal'],
    ['ibm-plex-serif-latin-400-italic.woff2', 400, 'italic'],
  ],
  'IBM Plex Mono': [
    ['ibm-plex-mono-latin-400-normal.woff2', 400, 'normal'],
    ['ibm-plex-mono-latin-600-normal.woff2', 600, 'normal'],
  ],
  'JetBrains Mono': [
    ['jetbrains-mono-latin-400-normal.woff2', 400, 'normal'],
    ['jetbrains-mono-latin-600-normal.woff2', 600, 'normal'],
    ['jetbrains-mono-latin-700-normal.woff2', 700, 'normal'],
  ],
  'Space Grotesk': [
    ['space-grotesk-latin-400-normal.woff2', 400, 'normal'],
    ['space-grotesk-latin-600-normal.woff2', 600, 'normal'],
    ['space-grotesk-latin-700-normal.woff2', 700, 'normal'],
  ],
  'Special Elite': [
    ['special-elite-latin-400-normal.woff2', 400, 'normal'],
  ],
  'Courier Prime': [
    ['courier-prime-latin-400-normal.woff2', 400, 'normal'],
    ['courier-prime-latin-700-normal.woff2', 700, 'normal'],
    ['courier-prime-latin-400-italic.woff2', 400, 'italic'],
  ],
  'Oswald': [
    ['oswald-latin-400-normal.woff2', 400, 'normal'],
    ['oswald-latin-600-normal.woff2', 600, 'normal'],
    ['oswald-latin-700-normal.woff2', 700, 'normal'],
  ],
  'Bebas Neue': [
    ['bebas-neue-latin-400-normal.woff2', 400, 'normal'],
  ],
  'Caveat': [
    ['caveat-latin-400-normal.woff2', 400, 'normal'],
    ['caveat-latin-700-normal.woff2', 700, 'normal'],
  ],
  'Cinzel': [
    ['cinzel-latin-400-normal.woff2', 400, 'normal'],
    ['cinzel-latin-600-normal.woff2', 600, 'normal'],
    ['cinzel-latin-700-normal.woff2', 700, 'normal'],
  ],
  'DM Sans': [
    ['dm-sans-latin-400-normal.woff2', 400, 'normal'],
    ['dm-sans-latin-500-normal.woff2', 500, 'normal'],
    ['dm-sans-latin-700-normal.woff2', 700, 'normal'],
    ['dm-sans-latin-400-italic.woff2', 400, 'italic'],
  ],
};

/**
 * Parse simple YAML front-matter delimited by --- at the top of content.md.
 */
export function parseFrontMatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    return { meta: {}, body: normalized, bodyStartLine: 1 };
  }

  const rawYaml = match[1];
  const body = normalized.slice(match[0].length);
  const bodyStartLine = 1 + (match[0].match(/\n/g) || []).length;
  const meta = {};
  const lines = rawYaml.split('\n');
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Multi-line indented continuation
    if (/^\s+/.test(line) && currentKey) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        if (!Array.isArray(meta[currentKey])) {
          meta[currentKey] = meta[currentKey] ? [meta[currentKey]] : [];
        }
        meta[currentKey].push(stripQuotes(trimmed.slice(2).trim()));
      } else {
        meta[currentKey] = meta[currentKey]
          ? `${meta[currentKey]} ${trimmed}`
          : trimmed;
      }
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    currentKey = kv[1].trim();
    let val = kv[2].trim();
    if (val === '|' || val === '>') {
      meta[currentKey] = '';
    } else if (val === 'true') {
      meta[currentKey] = true;
    } else if (val === 'false') {
      meta[currentKey] = false;
    } else if (val.startsWith('[') && val.endsWith(']')) {
      meta[currentKey] = val
        .slice(1, -1)
        .split(',')
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
    } else {
      meta[currentKey] = stripQuotes(val);
    }
  }

  return { meta, body, bodyStartLine };
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'section';
}

/**
 * Extract footnotes from markdown body (outside fenced code blocks).
 * Preserves a 1-based original line map for accurate editor<->preview scroll sync.
 */
function extractFootnotes(md, startLine = 1) {
  const lines = md.split('\n');
  const definitions = new Map();
  const kept = [];
  const keptLines = [];
  let inFence = false;
  let fenceChar = '';
  let activeDef = null;
  let firstFootnoteLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const origLine = startLine + i;
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
      }
      activeDef = null;
      kept.push(line);
      keptLines.push(origLine);
      continue;
    }

    if (!inFence) {
      const defMatch = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
      if (defMatch) {
        activeDef = defMatch[1].trim();
        if (!firstFootnoteLine) firstFootnoteLine = origLine;
        definitions.set(activeDef, defMatch[2]);
        continue;
      }
      if (activeDef && (/^(?:\t| {2,})/.test(line) || line.trim() === '')) {
        if (line.trim() !== '') {
          definitions.set(activeDef, `${definitions.get(activeDef)} ${line.trim()}`);
        }
        continue;
      }
      activeDef = null;
    }
    kept.push(line);
    keptLines.push(origLine);
  }

  if (definitions.size === 0) {
    return { markdown: md, footnotes: [], lineMap: keptLines, firstFootnoteLine: 0 };
  }

  // Replace inline references [^id] outside code blocks and inline code
  const order = [];
  const indexMap = new Map();
  const outLines = [];
  inFence = false;
  fenceChar = '';

  for (const line of kept) {
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
      }
      outLines.push(line);
      continue;
    }
    if (inFence) {
      outLines.push(line);
      continue;
    }

    // Split by inline code spans so we don't rewrite `[^1]` inside backticks
    const parts = line.split(/(`[^`]*`)/g);
    for (let j = 0; j < parts.length; j += 2) {
      parts[j] = parts[j].replace(/\[\^([^\]]+)\]/g, (full, id) => {
        const key = id.trim();
        if (!definitions.has(key)) return full;
        if (!indexMap.has(key)) {
          indexMap.set(key, order.length + 1);
          order.push({ id: key, num: order.length + 1, text: definitions.get(key) });
        }
        const n = indexMap.get(key);
        return `<sup class="footnote-ref"><a href="#fn-${n}" id="fnref-${n}">${n}</a></sup>`;
      });
    }
    outLines.push(parts.join(''));
  }

  return { markdown: outLines.join('\n'), footnotes: order, lineMap: keptLines, firstFootnoteLine };
}

/**
 * Preprocess WA extensions outside fenced code blocks:
 * - Page breaks: `---\n<!-- pagebreak -->` or `<!-- pagebreak -->`
 * - Block class directives: `<!-- .class1 .class2 -->` (before or trailing a block)
 * - `[TOC]` placeholder
 */
function preprocessExtensions(md, inLineMap = null) {
  const lines = md.split('\n');
  const out = [];
  const outLineMap = [];
  let inFence = false;
  let fenceChar = '';

  const pushChunk = (text, origLine) => {
    const sub = text.split('\n');
    for (const s of sub) {
      out.push(s);
      outLineMap.push(origLine);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const origLine = inLineMap ? (inLineMap[i] || i + 1) : i + 1;
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
      }
      out.push(line);
      outLineMap.push(origLine);
      continue;
    }
    if (inFence) {
      out.push(line);
      outLineMap.push(origLine);
      continue;
    }

    // Page break: "---" immediately followed by "<!-- pagebreak -->"
    if (/^\s*---+\s*$/.test(line) && i + 1 < lines.length && /^\s*<!--\s*page-?break\s*-->\s*$/i.test(lines[i + 1])) {
      pushChunk('\n<div class="page-break" aria-hidden="true"></div>\n', origLine);
      i++;
      continue;
    }

    // Standalone <!-- pagebreak -->
    if (/^\s*<!--\s*page-?break\s*-->\s*$/i.test(line)) {
      pushChunk('\n<div class="page-break" aria-hidden="true"></div>\n', origLine);
      continue;
    }

    // Standalone [TOC]
    if (/^\s*\[TOC\]\s*$/i.test(line)) {
      pushChunk('\n<div data-wa-toc="true"></div>\n', origLine);
      continue;
    }

    // Standalone block-class comment before a block: <!-- .pull-quote .no-break -->
    const standaloneClass = line.match(/^\s*<!--\s*((?:\.[a-zA-Z0-9_-]+\s*)+)-->\s*$/);
    if (standaloneClass) {
      const classes = standaloneClass[1].trim().replace(/\./g, '');
      pushChunk(`\n<span data-wa-next-class="${escapeHtml(classes)}"></span>\n`, origLine);
      continue;
    }

    // Trailing class comment on a line: Some text <!-- .lead -->
    const trailingClass = line.match(/^(.*?\S)\s*<!--\s*((?:\.[a-zA-Z0-9_-]+\s*)+)-->\s*$/);
    if (trailingClass) {
      const classes = trailingClass[2].trim().replace(/\./g, '');
      out.push(`${trailingClass[1]}<span data-wa-parent-class="${escapeHtml(classes)}"></span>`);
      outLineMap.push(origLine);
      continue;
    }

    out.push(line);
    outLineMap.push(origLine);
  }

  return { text: out.join('\n'), lineMap: outLineMap };
}

/**
 * Build the Front-Matter title block HTML.
 */
function buildTitleBlockHtml(meta, includeSourceMap = false) {
  if (!meta || (!meta.title && !meta.subtitle && !meta.author && !meta.abstract)) {
    return '';
  }

  const coverClass = meta.cover ? ' cover' : '';
  const lineAttr = includeSourceMap ? ' data-wa-line="1"' : '';
  const parts = [`<header class="title-block${coverClass}"${lineAttr}>`];

  if (meta.organization) {
    parts.push(`<div class="organization">${escapeHtml(meta.organization)}</div>`);
  }
  if (meta.category) {
    parts.push(`<div class="category">${escapeHtml(meta.category)}</div>`);
  }
  if (meta.title) {
    parts.push(`<h1 class="title">${escapeHtml(meta.title)}</h1>`);
  }
  if (meta.subtitle) {
    parts.push(`<p class="subtitle">${escapeHtml(meta.subtitle)}</p>`);
  }

  const metaBits = [];
  if (meta.author) metaBits.push(`<span class="author">${escapeHtml(meta.author)}</span>`);
  if (meta.date) metaBits.push(`<span class="date">${escapeHtml(meta.date)}</span>`);
  if (meta.volume) metaBits.push(`<span class="meta-item">${escapeHtml(meta.volume)}</span>`);
  if (meta.issue) metaBits.push(`<span class="meta-item">${escapeHtml(meta.issue)}</span>`);
  if (meta.doc_id) metaBits.push(`<span class="meta-item">${escapeHtml(meta.doc_id)}</span>`);
  if (meta.version) metaBits.push(`<span class="meta-item">v${escapeHtml(meta.version)}</span>`);
  if (meta.email) metaBits.push(`<span class="meta-item">${escapeHtml(meta.email)}</span>`);
  if (meta.phone) metaBits.push(`<span class="meta-item">${escapeHtml(meta.phone)}</span>`);
  if (meta.location) metaBits.push(`<span class="meta-item">${escapeHtml(meta.location)}</span>`);
  if (meta.website) metaBits.push(`<span class="meta-item">${escapeHtml(meta.website)}</span>`);

  if (metaBits.length > 0) {
    parts.push(`<div class="meta-line">${metaBits.join('')}</div>`);
  }

  if (meta.abstract) {
    parts.push(
      `<div class="abstract"><div class="abstract-label">Abstract</div><p>${escapeHtml(meta.abstract)}</p></div>`
    );
  }

  if (meta.keywords) {
    const kw = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : meta.keywords;
    parts.push(`<div class="keywords"><strong>Keywords:</strong> ${escapeHtml(kw)}</div>`);
  }

  parts.push('</header>');
  return parts.join('\n');
}

/**
 * Extract concrete @page size, margin, background, and --page-width/--page-height
 * from a user's style.css so print-to-PDF and screen sheets are guaranteed identical.
 */
export function buildPageRulesCss(styleCss = '', meta = {}) {
  const vars = {};
  const varRe = /--(page-size|page-width|page-height|page-margin|page-background)\s*:\s*([^;{}]+);/gi;
  let m;
  while ((m = varRe.exec(styleCss)) !== null) {
    vars[m[1].toLowerCase()] = m[2].trim();
  }

  const pageSize = vars['page-size'] || 'Letter';
  const pageMargin = vars['page-margin'] || '1in 1in 1in 1in';
  const pageBg = vars['page-background'] || '';

  let width = vars['page-width'] || '';
  let height = vars['page-height'] || '';

  if (!width || !height) {
    const mapped = PAGE_SIZE_MAP[pageSize.toLowerCase()];
    if (mapped) {
      width = width || mapped[0];
      height = height || mapped[1];
    } else {
      const dims = pageSize.split(/\s+/);
      if (dims.length === 2) {
        width = width || dims[0];
        height = height || dims[1];
      } else {
        width = width || '8.5in';
        height = height || '11in';
      }
    }
  }

  const hasExplicitAtPage = /@page\s*\{[\s\S]*?\bsize\s*:/i.test(styleCss);
  const rules = [
    `:root { --page-width: ${width}; --page-height: ${height}; }`,
  ];

  if (!hasExplicitAtPage) {
    const bgLine = pageBg ? `\n  background: ${pageBg};` : '';
    rules.push(`@page {\n  size: ${pageSize};\n  margin: ${pageMargin};${bgLine}\n}`);
  }

  if (meta && meta.running_header && !/@top-center|@top-left|@top-right/i.test(styleCss)) {
    const escaped = String(meta.running_header).replace(/"/g, '\\"');
    rules.push(`@page { @top-center { content: "${escaped}"; font-size: 8.5pt; color: #666; } }`);
  }
  if (meta && meta.running_footer && !/@bottom-center|@bottom-left|@bottom-right/i.test(styleCss)) {
    const escaped = String(meta.running_footer).replace(/"/g, '\\"');
    rules.push(`@page { @bottom-center { content: "${escaped}"; font-size: 8.5pt; color: #666; } }`);
  }

  return rules.join('\n');
}

/**
 * Generate @font-face CSS rules for any bundled fonts referenced by style.css.
 */
export function buildFontFacesCss(styleCss = '', fontsBaseUrl = '/runtime/fonts/') {
  if (!fontsBaseUrl) return '';
  const base = fontsBaseUrl.endsWith('/') ? fontsBaseUrl : `${fontsBaseUrl}/`;
  const used = [];
  const lowerCss = styleCss.toLowerCase();

  for (const [family, files] of Object.entries(BUNDLED_FONT_FILES)) {
    if (lowerCss.includes(family.toLowerCase())) {
      for (const [filename, weight, style] of files) {
        used.push(
`@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('${base}${filename}') format('woff2');
}`
        );
      }
    }
  }
  return used.join('\n');
}

function stampFirstTagWithLines(html, startLine, endLine) {
  if (!html || !startLine) return html;
  const attrs = endLine && endLine > startLine
    ? ` data-wa-line="${startLine}" data-wa-line-end="${endLine}"`
    : ` data-wa-line="${startLine}"`;
  return html.replace(/^(\s*<[a-zA-Z][a-zA-Z0-9-]*)(?=[\s/>])/, `$1${attrs}`);
}

function parseMarkdownWithSourceLines(marked, preprocessed, lineMap) {
  const tokens = marked.lexer(preprocessed);
  const chunks = [];
  let lineCursor = 0;

  for (const tok of tokens) {
    const raw = tok.raw || '';
    const leadingNewlines = (raw.match(/^\n+/) || [''])[0].length;
    const rawNewlines = (raw.match(/\n/g) || []).length;
    const trimmedRaw = raw.replace(/\n+$/, '');
    const contentNewlines = (trimmedRaw.match(/\n/g) || []).length;

    const startIdx = Math.min(lineMap.length - 1, lineCursor + leadingNewlines);
    const endIdx = Math.min(lineMap.length - 1, Math.max(startIdx, lineCursor + contentNewlines));
    const origStart = lineMap[startIdx] || 1;
    const origEnd = lineMap[endIdx] || origStart;

    if (tok.type === 'space' || tok.type === 'def') {
      lineCursor += rawNewlines;
      continue;
    }

    const slice = [tok];
    slice.links = tokens.links || {};
    let blockHtml = marked.parser(slice);

    // Stamp individual <li> lines for lists and <tr> lines for tables so split lists/tables stay anchored
    if (tok.type === 'list' && Array.isArray(tok.items)) {
      let itemLineCursor = lineCursor + leadingNewlines;
      const itemLines = tok.items.map((it) => {
        const itRaw = it.raw || '';
        const itLead = (itRaw.match(/^\n+/) || [''])[0].length;
        const ln = lineMap[Math.min(lineMap.length - 1, itemLineCursor + itLead)] || origStart;
        itemLineCursor += (itRaw.match(/\n/g) || []).length;
        return ln;
      });
      let liIdx = 0;
      blockHtml = blockHtml.replace(/<li(?=[\s>])/g, () => {
        const ln = itemLines[liIdx++] || origStart;
        return `<li data-wa-line="${ln}"`;
      });
    } else if (tok.type === 'table' && Array.isArray(tok.rows)) {
      let rowIdx = 0;
      blockHtml = blockHtml.replace(/<tbody>([\s\S]*?)<\/tbody>/, (full, inner) => {
        const stamped = inner.replace(/<tr(?=[\s>])/g, () => {
          const ln = lineMap[Math.min(lineMap.length - 1, startIdx + 2 + rowIdx++)] || origStart;
          return `<tr data-wa-line="${ln}"`;
        });
        return `<tbody>${stamped}</tbody>`;
      });
    }

    chunks.push(stampFirstTagWithLines(blockHtml, origStart, origEnd));
    lineCursor += rawNewlines;
  }

  return chunks.join('');
}

/**
 * Render Markdown -> Sanitized DOM inside a target container element (or HTML string).
 */
export function renderMarkdownToHtml(markdown, options = {}) {
  const { resolveImage, includeSourceMap = false } = options;
  const { meta, body, bodyStartLine } = parseFrontMatter(markdown || '');
  const { markdown: withoutFn, footnotes, lineMap: fnLineMap, firstFootnoteLine } = extractFootnotes(body, bodyStartLine);
  const { text: preprocessed, lineMap } = preprocessExtensions(withoutFn, fnLineMap);

  const marked = new Marked({
    gfm: true,
    breaks: false,
    pedantic: false,
  });

  let rawHtml = includeSourceMap
    ? parseMarkdownWithSourceLines(marked, preprocessed, lineMap)
    : marked.parse(preprocessed);

  // Append footnotes section if present
  if (footnotes.length > 0) {
    const items = footnotes
      .map((fn) => {
        const fnHtml = marked.parseInline(fn.text);
        return `<li id="fn-${fn.num}"><p>${fnHtml}<a href="#fnref-${fn.num}" class="footnote-backref" aria-label="Back to content">↩</a></p></li>`;
      })
      .join('\n');
    const fnLineAttr = includeSourceMap && firstFootnoteLine ? ` data-wa-line="${firstFootnoteLine}"` : '';
    rawHtml += `\n<section class="footnotes" role="doc-endnotes"${fnLineAttr}><ol>${items}</ol></section>`;
  }

  const titleHtml = buildTitleBlockHtml(meta, includeSourceMap);
  const fullHtml = `<article class="wa-document">${titleHtml}<div class="wa-body">${rawHtml}</div></article>`;

  const addAttrs = ['data-wa-toc', 'data-wa-next-class', 'data-wa-parent-class', 'role', 'aria-hidden', 'aria-label', 'checked', 'disabled'];
  if (includeSourceMap) {
    addAttrs.push('data-wa-line', 'data-wa-line-end');
  }

  const cleanHtml = DOMPurify.sanitize(fullHtml, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: addAttrs,
  });

  // Post-process in a detached DOM template
  const tpl = document.createElement('template');
  tpl.innerHTML = cleanHtml;
  const root = tpl.content;

  // 1. Apply next-block class markers
  root.querySelectorAll('span[data-wa-next-class]').forEach((marker) => {
    const classes = marker.getAttribute('data-wa-next-class').split(/\s+/).filter(Boolean);
    const parentP = marker.parentElement && marker.parentElement.tagName === 'P' && marker.parentElement.childNodes.length === 1
      ? marker.parentElement
      : marker;
    const target = parentP.nextElementSibling;
    if (target) {
      target.classList.add(...classes);
    }
    parentP.remove();
  });

  // 2. Apply trailing parent-class markers
  root.querySelectorAll('span[data-wa-parent-class]').forEach((marker) => {
    const classes = marker.getAttribute('data-wa-parent-class').split(/\s+/).filter(Boolean);
    const target = marker.closest('p, blockquote, h1, h2, h3, h4, h5, h6, li, ul, ol, pre, table, div');
    if (target) {
      target.classList.add(...classes);
    }
    marker.remove();
  });

  // 3. Transform GitHub Alerts in blockquotes: > [!NOTE], > [!TIP], etc.
  root.querySelectorAll('blockquote').forEach((bq) => {
    const firstP = bq.querySelector(':scope > p:first-child');
    if (!firstP) return;
    const firstHtml = firstP.innerHTML.trim();
    const match = firstHtml.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]+([^\n<]*))?(?:<br\s*\/?>|\r?\n)?([\s\S]*)$/i);
    if (!match) return;

    const kind = match[1].toUpperCase();
    const info = ALERT_TYPES[kind];
    const customTitle = (match[2] || '').trim();
    const restOfFirstP = (match[3] || '').trim();

    const aside = document.createElement('aside');
    aside.className = `callout ${info.cls}`;
    if (bq.hasAttribute('data-wa-line')) aside.setAttribute('data-wa-line', bq.getAttribute('data-wa-line'));
    if (bq.hasAttribute('data-wa-line-end')) aside.setAttribute('data-wa-line-end', bq.getAttribute('data-wa-line-end'));
    // Preserve any user-attached classes
    bq.classList.forEach((c) => aside.classList.add(c));

    const titleEl = document.createElement('div');
    titleEl.className = 'callout-title';
    titleEl.innerHTML = `<span class="callout-icon" aria-hidden="true">${info.icon}</span><span>${escapeHtml(customTitle || info.label)}</span>`;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'callout-body';

    if (restOfFirstP) {
      const p = document.createElement('p');
      p.innerHTML = restOfFirstP;
      bodyEl.appendChild(p);
    }

    let sibling = firstP.nextElementSibling;
    while (sibling) {
      const next = sibling.nextElementSibling;
      bodyEl.appendChild(sibling);
      sibling = next;
    }

    aside.appendChild(titleEl);
    aside.appendChild(bodyEl);
    bq.replaceWith(aside);
  });

  // 4. Mark task lists cleanly
  root.querySelectorAll('li > input[type="checkbox"]').forEach((cb) => {
    const li = cb.parentElement;
    li.classList.add('task-list-item');
    if (li.parentElement) li.parentElement.classList.add('contains-task-list');
  });

  // 5. Transform standalone images into <figure class="figure"> with <figcaption class="caption">
  root.querySelectorAll('.wa-body p').forEach((p) => {
    const children = Array.from(p.childNodes).filter(
      (n) => !(n.nodeType === Node.TEXT_NODE && n.textContent.trim() === '')
    );
    if (children.length === 1 && children[0].nodeName === 'IMG') {
      const img = children[0];
      const fig = document.createElement('figure');
      fig.className = 'figure';
      if (p.hasAttribute('data-wa-line')) fig.setAttribute('data-wa-line', p.getAttribute('data-wa-line'));
      if (p.hasAttribute('data-wa-line-end')) fig.setAttribute('data-wa-line-end', p.getAttribute('data-wa-line-end'));
      p.classList.forEach((c) => fig.classList.add(c));
      fig.appendChild(img);
      const alt = (img.getAttribute('alt') || '').trim();
      if (alt) {
        const cap = document.createElement('figcaption');
        cap.className = 'caption';
        cap.textContent = alt;
        fig.appendChild(cap);
      }
      p.replaceWith(fig);
    }
  });

  // 6. Resolve relative image URLs if resolver provided
  if (typeof resolveImage === 'function') {
    root.querySelectorAll('img[src]').forEach((img) => {
      const orig = img.getAttribute('src');
      const resolved = resolveImage(orig);
      if (resolved) img.setAttribute('src', resolved);
    });
  }

  // 7. Assign heading IDs and populate [TOC]
  const usedIds = new Set();
  const headings = [];
  root.querySelectorAll('.wa-body h1, .wa-body h2, .wa-body h3, .wa-body h4').forEach((h) => {
    let id = slugify(h.textContent);
    let n = 2;
    while (usedIds.has(id)) {
      id = `${slugify(h.textContent)}-${n++}`;
    }
    usedIds.add(id);
    h.id = id;
    const level = parseInt(h.tagName[1], 10);
    if (level <= 3) {
      headings.push({ level, id, text: h.textContent.trim() });
    }
  });

  root.querySelectorAll('[data-wa-toc="true"]').forEach((placeholder) => {
    if (headings.length === 0) {
      placeholder.remove();
      return;
    }
    const nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'Table of contents');
    if (placeholder.hasAttribute('data-wa-line')) nav.setAttribute('data-wa-line', placeholder.getAttribute('data-wa-line'));
    const title = document.createElement('div');
    title.className = 'toc-title';
    title.textContent = 'Contents';
    const ol = document.createElement('ol');
    ol.className = 'toc-list';
    for (const h of headings) {
      const li = document.createElement('li');
      li.className = `toc-h${h.level}`;
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.text;
      li.appendChild(a);
      ol.appendChild(li);
    }
    nav.appendChild(title);
    nav.appendChild(ol);
    placeholder.replaceWith(nav);
  });

  const container = document.createElement('div');
  container.appendChild(root);
  return { html: container.innerHTML, meta, headings };
}

/**
 * Mount a complete rendered & paginated .wa document into a target Document (iframe or read.html).
 * Returns { meta, pageCount, config }.
 */
export async function renderIntoDocument(targetDoc, { markdown, styleCss, baseCss, fontsBaseUrl, resolveImage, pageGrid = false, includeSourceMap = false }) {
  const { html, meta } = renderMarkdownToHtml(markdown, { resolveImage, includeSourceMap });
  const fontCss = buildFontFacesCss(styleCss, fontsBaseUrl);
  const config = parsePageConfig(styleCss, meta);
  const pageRulesCss = buildPaginatedPageCss(config);
  const sanitizedUserCss = stripAtPageRules(styleCss || '');

  if (meta.title) {
    targetDoc.title = meta.title;
  }

  targetDoc.documentElement.classList.toggle('wa-page-grid', Boolean(pageGrid));

  const setStyle = (id, cssText) => {
    let el = targetDoc.getElementById(id);
    if (!el) {
      el = targetDoc.createElement('style');
      el.id = id;
      targetDoc.head.appendChild(el);
    }
    el.textContent = cssText || '';
  };

  if (baseCss !== undefined) setStyle('wa-base-css', baseCss);
  setStyle('wa-font-css', fontCss);
  setStyle('wa-page-rules', pageRulesCss);
  setStyle('wa-user-css', sanitizedUserCss);

  let mount = targetDoc.getElementById('wa-root');
  if (!mount) {
    mount = targetDoc.createElement('div');
    mount.id = 'wa-root';
    targetDoc.body.innerHTML = '';
    targetDoc.body.appendChild(mount);
  }

  const { pageCount } = await paginateDocument(targetDoc, html, config);
  return { meta, pageCount, config };
}
