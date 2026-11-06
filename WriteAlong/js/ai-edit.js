// Broad AI edits: rewrite the whole document from an instruction, or restyle its template.css.
// Works with any provider from proof/llm.js; long documents are split by section so small local
// models (and Chrome's on-device model) stay within their context window.
import { chat, isLocalProvider, parseJsonLoose } from './proof/llm.js';
import { splitFrontMatter } from './markdown.js';

/* ------------------------------------------------------------------ document rewrite */

const REWRITE_SYSTEM = `You edit Markdown documents. Apply the user's instruction to the Markdown you are given and return the complete rewritten Markdown.
Rules:
- Return only the Markdown: no introduction, no explanations, no code fences around the answer.
- Keep the Markdown valid. Preserve image references like ![caption](images/…), links, tables, code blocks, and the special lines \\newpage and [TOC], unless the instruction says otherwise.
- Keep the heading structure unless the instruction asks you to restructure.
- If the text starts with a YAML front matter block between --- lines, keep it as YAML with the same keys, changing values only if the instruction requires it.
- You may receive one part of a longer document. Rewrite only that part; do not add introductions or conclusions for the rest of the document.`;

/** Characters per request, by provider size. */
export function chunkLimit(p) {
  if (p.kind === 'chrome') return 2500;
  return isLocalProvider(p) ? 6000 : 30000;
}

function splitParagraphs(text, limit) {
  // Split an oversized section on blank lines, never inside a fenced code block.
  const parts = [];
  let cur = '';
  let fence = false;
  for (const line of text.split('\n')) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    if (!fence && !line.trim() && cur.length > limit) { parts.push(cur); cur = ''; continue; }
    cur += (cur ? '\n' : '') + line;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/** Splits markdown into chunks under `limit` characters, preferably at headings. */
export function chunkMarkdown(md, limit) {
  const sections = [];
  let cur = [];
  let fence = false;
  for (const line of md.split('\n')) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    if (!fence && /^#{1,3}\s/.test(line) && cur.some((l) => l.trim())) { sections.push(cur.join('\n')); cur = []; }
    cur.push(line);
  }
  if (cur.length) sections.push(cur.join('\n'));
  const chunks = [];
  let buf = '';
  for (const sec of sections.flatMap((s) => (s.length > limit ? splitParagraphs(s, limit) : [s]))) {
    if (buf && buf.length + sec.length + 2 > limit) { chunks.push(buf); buf = ''; }
    buf += (buf ? '\n\n' : '') + sec.trim();
  }
  if (buf.trim()) chunks.push(buf);
  return chunks;
}

export function cleanMarkdownReply(text) {
  let t = text.trim();
  const fenced = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i.exec(t);
  if (fenced) t = fenced[1];
  t = t.replace(/^(here(?:'s| is)[^\n]{0,80}:\s*\n+)/i, '');
  return t.trim();
}

const imageRefs = (md) => new Set([...md.matchAll(/!\[[^\]]*\]\((images\/[^)\s]+)/g)].map((m) => m[1]));

/**
 * @returns {Promise<{md: string, warnings: string[]}>}
 */
export async function rewriteDocument(p, md, instruction, { lang, signal, onProgress, onToken } = {}) {
  const { body, hasFrontMatter } = splitFrontMatter(md);
  const frontMatter = hasFrontMatter ? md.slice(0, md.length - body.length) : '';
  // Small local models tend to turn YAML into prose, so they only see the body; the title block stays as is.
  const sendFrontMatter = hasFrontMatter && !isLocalProvider(p) && p.kind !== 'chrome';
  const chunks = chunkMarkdown((sendFrontMatter ? frontMatter : '') + body, chunkLimit(p));
  const outline = [...body.matchAll(/^(#{1,3})\s+(.+)$/gm)].slice(0, 40).map((m) => `${'  '.repeat(m[1].length - 1)}- ${m[2]}`).join('\n');
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    onProgress?.(i, chunks.length);
    const context = chunks.length > 1 ? `This is part ${i + 1} of ${chunks.length} of a longer document.${outline ? `\nDocument outline for context:\n${outline}` : ''}\n\n` : '';
    const prompt = `Instruction: ${instruction}\n\n${context}Markdown to rewrite:\n\n${chunks[i]}`;
    const reply = await chat(p, { system: REWRITE_SYSTEM + (lang ? `\nUnless the instruction says otherwise, write in ${lang}.` : ''), prompt, signal, lang,
      onToken: (t) => onToken?.(i, t) });
    const cleaned = cleanMarkdownReply(reply);
    out.push(cleaned || chunks[i]);
  }
  onProgress?.(chunks.length, chunks.length);

  let result = out.join('\n\n').trim() + '\n';
  const warnings = [];
  // Keep the original front matter if the model dropped or broke it.
  // Models often drop the [TOC] marker; put it back before the first heading.
  if (/^\[TOC\]\s*$/m.test(body) && !/^\[TOC\]\s*$/m.test(result)) {
    const firstHeading = result.search(/^#{1,6}\s/m);
    result = firstHeading >= 0 ? `${result.slice(0, firstHeading)}[TOC]\n\n${result.slice(firstHeading)}` : `[TOC]\n\n${result}`;
  }
  const breaks = (t) => (t.match(/^\\(newpage|pagebreak)\s*$/gm) || []).length;
  if (breaks(result) < breaks(body)) warnings.push(`${breaks(body) - breaks(result)} page break(s) were removed by the rewrite.`);
  if (hasFrontMatter && !sendFrontMatter) {
    result = frontMatter + '\n' + result;
  } else if (hasFrontMatter && !splitFrontMatter(result).hasFrontMatter) {
    result = frontMatter + result.replace(/^---[\s\S]*?\n---\s*\n/, '');
    warnings.push('The title block was kept as it was.');
  }
  const lost = [...imageRefs(md)].filter((ref) => !imageRefs(result).has(ref));
  if (lost.length) warnings.push(`${lost.length} image${lost.length === 1 ? ' was' : 's were'} removed by the rewrite (${lost.join(', ')}).`);
  const words = (t) => (t.match(/[\p{L}\p{N}]+/gu) || []).length;
  const ratio = words(result) / Math.max(1, words(md));
  const asksShorter = /\b(short|brief|concise|summar|condense|cut|trim|bullet|notes|tl;?dr)/i.test(instruction);
  const asksLonger = /\b(expand|longer|elaborate|detail|lengthen|add)/i.test(instruction);
  if (ratio < (asksShorter ? 0.2 : 0.6)) warnings.push(`The new version is much shorter (${Math.round(ratio * 100)}% of the original length). Check nothing important was dropped.`);
  else if (ratio > (asksLonger ? 4 : 1.8)) warnings.push(`The new version is much longer (${Math.round(ratio * 100)}% of the original length).`);
  return { md: result, warnings };
}

/* ------------------------------------------------------------------ restyle */

const STYLE_SYSTEM = `You are a typographer and CSS designer for "Write Along" documents. A document is Markdown rendered to HTML and styled only by a stylesheet called template.css.

The HTML inside <body> uses plain elements: h1–h6, p, strong, em, del, code, a, br, hr, pre > code, blockquote > p, ul/ol > li (nested),
task lists (ul.contains-task-list > li.task-list-item > input[type=checkbox]), table > thead/tbody > tr > th/td (align attribute),
img, figure > img + figcaption, div.page-break, nav.toc (div.toc-title + ol > li.toc-h1/.toc-h2/.toc-h3 > a),
and an optional title block: header#title-block-header with h1.title, p.subtitle, p.author, p.date, div.abstract (div.abstract-title + p).

Page geometry is controlled ONLY through these :root variables plus an @page rule for printing:
--page-width, --page-min-height, --page-padding (a single length), --page-background, --desk-background.
Conventional knobs: --font-body, --font-heading, --font-mono, --font-size, --line-height, --accent.
Do not set width, margin, padding, min-height or box-shadow on body.

Fonts bundled with the app (use these family names, always with system fallbacks):
"CMU Serif" (Computer Modern), "CMU Sans Serif", "CMU Typewriter Text", "EB Garamond", "Inter", "Source Serif 4", "JetBrains Mono".
Never use @import or external URLs. Keep print rules sensible (avoid breaks after headings and inside figures/tables).
Reply with CSS only: no explanations and no code fences.`;

const AI_START = '/* --- AI style changes --- */';
const AI_END = '/* --- end AI style changes --- */';

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Extracts CSS from a model reply and removes anything unsafe for an offline, private document. */
export function cleanCssReply(text) {
  let t = text.trim();
  const fenced = /```(?:css)?\s*\n([\s\S]*?)```/i.exec(t);
  if (fenced) t = fenced[1];
  else {
    const first = t.search(/^\s*(\/\*|:root|@|[.#*[a-z][^{\n]*\{)/im);
    if (first > 0) t = t.slice(first);
  }
  return t
    .replace(/@import[^;]*;/gi, '')
    .replace(/[^;{}]*url\(\s*['"]?(https?:)?\/\/[^)]*\)[^;{}]*;?/gi, '')
    .trim();
}

/** Number of rules the browser accepts (0 means it wasn't CSS). */
export function countCssRules(css) {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet.cssRules.length;
  } catch {
    return 0;
  }
}

function withAiBlock(css, addition) {
  const i = css.indexOf(AI_START);
  const j = css.indexOf(AI_END);
  if (i >= 0 && j > i) {
    return `${css.slice(0, j).trimEnd()}\n\n${addition.trim()}\n${css.slice(j)}`;
  }
  return `${css.trimEnd()}\n\n${AI_START}\n${addition.trim()}\n${AI_END}\n`;
}

/**
 * @param {'adjust'|'redesign'} mode adjust appends overriding rules; redesign rewrites the stylesheet
 * @returns {Promise<{css: string, added: string}>}
 */
/** A short summary of a stylesheet: its :root variables and the selectors it styles (for small models). */
function cssSummary(css) {
  const clean = stripComments(css);
  const root = (clean.match(/:root\s*{[^}]*}/g) || []).join('\n');
  const selectors = [...new Set([...clean.matchAll(/(^|})\s*([^@{}][^{}]*?)\s*{/g)].map((m) => m[2].trim()).filter((x) => x && x !== ':root'))];
  return `${root}\n\nOther selectors already styled: ${selectors.join(', ').slice(0, 1500)}`;
}

/** Declarations as "selector|property|value" keys, for spotting rules that change nothing. */
function declarationKeys(css) {
  const keys = new Set();
  const sheet = new CSSStyleSheet();
  try { sheet.replaceSync(css); } catch { return keys; }
  const walk = (rules, ctx) => {
    for (const r of rules) {
      if (r.style && r.selectorText) for (const prop of r.style) keys.add(`${ctx}${r.selectorText}|${prop}|${r.style.getPropertyValue(prop).trim()}`);
      else if (r.cssRules) walk(r.cssRules, `${ctx}${r.conditionText || r.cssText.split('{')[0]}>`);
    }
  };
  walk(sheet.cssRules, '');
  return keys;
}

/** Removes declarations that already exist with the same value; returns '' if nothing new is left. */
export function dropNoopRules(current, added) {
  const existing = declarationKeys(current);
  if (![...declarationKeys(added)].some((k) => !existing.has(k)) && countCssRules(added)) {
    // Every parsed declaration exists already, unless some use var() in shorthands (those don't expand).
    if (!/var\(/.test(added)) return '';
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(added);
  const out = [];
  for (const r of sheet.cssRules) {
    if (r.style && r.selectorText) {
      // Edit the rule in place so shorthands (e.g. "border-bottom: 1px solid var(--accent)") keep their original form.
      for (const prop of [...r.style]) {
        const value = r.style.getPropertyValue(prop).trim();
        if (value && existing.has(`${r.selectorText}|${prop}|${value}`)) r.style.removeProperty(prop);
      }
      if (r.style.length || /var\(/.test(r.cssText)) out.push(r.cssText);
    } else if (!/\{\s*\}\s*$/.test(r.cssText)) out.push(r.cssText);
  }
  return out.filter((t) => !/\{\s*\}\s*$/.test(t)).join('\n');
}

/** Removes page-size/margin changes (small models like to "help" by resizing the page). */
export function stripPageGeometry(css) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const out = [];
  for (const r of sheet.cssRules) {
    if (r instanceof CSSPageRule) continue;
    if (r.style && r.selectorText) {
      for (const prop of ['--page-width', '--page-min-height', '--page-padding']) r.style.removeProperty(prop);
      if (r.style.length || /var\(/.test(r.cssText)) out.push(r.cssText);
    } else out.push(r.cssText);
  }
  return out.filter((t) => !/\{\s*\}\s*$/.test(t)).join('\n');
}

const PAGE_WORDS = /\b(page|pages|margin|margins|paper|landscape|portrait|a3|a4|a5|b5|letter|legal|tabloid|trim size)\b/i;

/* ---- small models: pick style settings (JSON), the app writes the CSS */

export const FONT_CHOICES = {
  'Computer Modern (LaTeX serif)': '"CMU Serif", "Latin Modern Roman", Georgia, serif',
  'EB Garamond (book serif)': '"EB Garamond", Garamond, "Times New Roman", serif',
  'Source Serif (modern serif)': '"Source Serif 4", "Source Serif Pro", Georgia, serif',
  'Georgia (classic serif)': 'Georgia, "Times New Roman", serif',
  'Times (traditional serif)': '"Times New Roman", Times, serif',
  'Inter (modern sans-serif)': 'Inter, "Helvetica Neue", Arial, sans-serif',
  'Computer Modern Sans': '"CMU Sans Serif", "Helvetica Neue", Arial, sans-serif',
  'Helvetica / Arial (neutral sans-serif)': '"Helvetica Neue", Helvetica, Arial, sans-serif',
  'System UI (sans-serif)': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  'Typewriter (monospace)': '"CMU Typewriter Text", "Courier New", monospace',
};

const HEX = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
const KNOB_SCHEMA = {
  type: 'object',
  properties: {
    bodyFont: { type: 'string', enum: Object.keys(FONT_CHOICES) },
    headingFont: { type: 'string', enum: Object.keys(FONT_CHOICES) },
    fontSizePt: { type: 'number', minimum: 8, maximum: 18 },
    lineHeight: { type: 'number', minimum: 1, maximum: 2.4 },
    textColor: HEX,
    headingColor: HEX,
    accentColor: HEX,
    linkColor: HEX,
    pageColor: HEX,
    headingWeight: { type: 'string', enum: ['normal', 'semibold', 'bold'] },
    headingRule: { type: 'boolean' },
    justifyText: { type: 'boolean' },
    paragraphSpacing: { type: 'string', enum: ['none', 'small', 'medium', 'large'] },
  },
};

const KNOB_SYSTEM = `You choose typography settings for a document. Read the user's request and reply with a JSON object containing ONLY the settings the request asks to change; leave everything else out.
Keys: bodyFont, headingFont (one of: ${Object.keys(FONT_CHOICES).map((f) => `"${f}"`).join(', ')}),
fontSizePt (body text size in points, normal is 11), lineHeight (normal is 1.5), textColor, headingColor, accentColor, linkColor, pageColor (hex colours like "#1a2b3c"),
headingWeight ("normal", "semibold" or "bold"), headingRule (true to draw a thin rule under section headings), justifyText (true/false), paragraphSpacing ("none", "small", "medium", "large").`;

/** Turns chosen settings into CSS rules. */
export function knobsToCss(k) {
  const root = [];
  const rules = [];
  const font = (name) => FONT_CHOICES[name];
  if (font(k.bodyFont)) root.push(`--font-body: ${font(k.bodyFont)};`);
  if (font(k.headingFont)) root.push(`--font-heading: ${font(k.headingFont)};`);
  if (k.fontSizePt >= 8 && k.fontSizePt <= 18) root.push(`--font-size: ${Math.round(k.fontSizePt * 2) / 2}pt;`);
  if (k.lineHeight >= 1 && k.lineHeight <= 2.4) root.push(`--line-height: ${Math.round(k.lineHeight * 100) / 100};`);
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : null);
  if (hex(k.accentColor)) root.push(`--accent: ${k.accentColor};`);
  if (hex(k.textColor)) root.push(`--text-color: ${k.textColor};`);
  if (hex(k.pageColor)) root.push(`--page-background: ${k.pageColor};`);
  if (root.length) rules.push(`:root {\n  ${root.join('\n  ')}\n}`);
  if (font(k.bodyFont)) rules.push(`body { font-family: var(--font-body); }`);
  if (hex(k.textColor)) rules.push(`body { color: var(--text-color); }`);
  const heading = [];
  if (font(k.headingFont)) heading.push('font-family: var(--font-heading);');
  if (hex(k.headingColor)) heading.push(`color: ${k.headingColor};`);
  if (k.headingWeight) heading.push(`font-weight: ${{ normal: 400, semibold: 600, bold: 700 }[k.headingWeight] || 700};`);
  if (heading.length) rules.push(`h1, h2, h3, h4, h5, h6, #title-block-header .title { ${heading.join(' ')} }`);
  if (k.headingRule === true) rules.push('h1, h2 { border-bottom: 1px solid var(--accent, currentColor); padding-bottom: 0.25em; }');
  if (k.headingRule === false) rules.push('h1, h2 { border-bottom: 0; }');
  if (hex(k.linkColor)) rules.push(`a { color: ${k.linkColor}; }`);
  if (k.justifyText === true) rules.push('p { text-align: justify; hyphens: auto; }');
  if (k.justifyText === false) rules.push('p { text-align: start; }');
  const gap = { none: '0', small: '0.4em', medium: '0.9em', large: '1.4em' }[k.paragraphSpacing];
  if (gap) rules.push(`p { margin-top: 0; margin-bottom: ${gap}; }`);
  return rules.join('\n');
}

const COLOR_NAMES = {
  navy: '#1f2a5a', 'dark blue': '#1d3557', blue: '#1c5fb8', 'light blue': '#4a90c2', teal: '#0b7285', turquoise: '#0f9b9b',
  green: '#2b7a3d', 'dark green': '#1b5e20', 'forest green': '#22543d', olive: '#6b6b1f', red: '#b42318', crimson: '#a4161a',
  maroon: '#6d1a1f', burgundy: '#7a1f35', orange: '#c2560a', gold: '#a87b00', brown: '#6b4423', purple: '#5f3dc4', violet: '#6741d9',
  indigo: '#3b2f8f', pink: '#c2255c', black: '#111111', charcoal: '#2f3338', 'dark gray': '#3a3f45', 'dark grey': '#3a3f45',
  gray: '#5f6670', grey: '#5f6670', slate: '#475569',
};
const PAGE_TINTS = { 'off-white': '#fbf8f1', cream: '#fbf5e6', ivory: '#fffdf4', beige: '#f5efe0', warm: '#fbf7ef', parchment: '#f6efdc', white: '#ffffff' };
const COLOR_RE = new RegExp(`\\b(${Object.keys(COLOR_NAMES).sort((a, b) => b.length - a.length).join('|')})\\b`, 'i');

/** Settings that can be read straight from the request ("navy headings", "off-white page"). */
export function explicitKnobs(text) {
  const k = {};
  const t = text.toLowerCase();
  const colorBefore = (nouns) => {
    const m = new RegExp(`\\b(${Object.keys(COLOR_NAMES).sort((a, b) => b.length - a.length).join('|')})\\s+(?:[a-z-]+\\s+)?(${nouns})\\b`).exec(t);
    return m ? COLOR_NAMES[m[1]] : null;
  };
  k.headingColor = colorBefore('headings?|titles?|headers?');
  k.linkColor = colorBefore('links?');
  k.accentColor = colorBefore('accents?|rules?|highlights?') || (/accent/.test(t) && COLOR_RE.test(t) ? COLOR_NAMES[COLOR_RE.exec(t)[1].toLowerCase()] : null);
  k.textColor = colorBefore('text|body text');
  const tint = /\b(off-white|cream|ivory|beige|parchment)\b/.exec(t) || (/\bwarm\b/.test(t) && /\b(page|paper|background)\b/.test(t) ? ['', 'warm'] : null);
  if (tint) k.pageColor = PAGE_TINTS[tint[1]];
  if (/\b(rules?|lines?|borders?|dividers?|underlines?)\s+(under|below|beneath)\b|\bunderlined? headings?\b/.test(t)) k.headingRule = true;
  if (/\bjustif(y|ied)\b/.test(t)) k.justifyText = true;
  for (const key of Object.keys(k)) if (!k[key]) delete k[key];
  return k;
}

const BROAD = /\b(look|feel|style|theme|design|like an?|vibe|aesthetic|redesign|makeover|overhaul)\b/i;
const RELEVANT = {
  bodyFont: /font|serif|sans|typeface|garamond|georgia|times|inter|helvetica|arial|typewriter|mono|latex/i,
  headingFont: /font|serif|sans|typeface/i,
  fontSizePt: /size|larger|bigger|smaller|small|large|big|read/i,
  lineHeight: /spacing|line|leading|airy|dense|compact|tight|read/i,
  textColor: /text colou?r|colou?r of the text|darker text|lighter text|contrast|colou?r.*\btext\b|\btext\b.*colou?r/i,
  headingColor: /heading|title|header/i,
  accentColor: /accent|colou?r|rule/i,
  linkColor: /link/i,
  pageColor: /page|paper|background|tint/i,
  headingWeight: /bold|weight|heavy|light/i,
  headingRule: /rule|line under|underline|divider|border|separator/i,
  justifyText: /justif|align/i,
  paragraphSpacing: /spacing|space|airy|compact|dense|paragraph|tight/i,
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Cleans a small model's settings: keeps what the request is about, adds explicit colours, and drops unreadable colours. */
export function sanitizeKnobs(knobs, instruction, pageBackground = '#ffffff') {
  const k = { ...(knobs || {}) };
  const broad = BROAD.test(instruction);
  if (!broad) for (const key of Object.keys(k)) if (RELEVANT[key] && !RELEVANT[key].test(instruction)) delete k[key];
  // Colours only when the request talks about colour at all.
  if (!broad && !COLOR_RE.test(instruction) && !/colou?r|dark|light|warm|cool|muted|bright|contrast|tint|black|white/i.test(instruction)) {
    for (const key of ['textColor', 'headingColor', 'accentColor', 'linkColor', 'pageColor']) delete k[key];
  }
  // Respect serif / sans-serif and named fonts even when the model picks something else.
  const t = instruction.toLowerCase();
  const isSans = (f) => /sans|helvetica|system|inter/i.test(f || '');
  for (const [key, nouns] of [['headingFont', 'headings?|titles?|headers?'], ['bodyFont', 'body|text|paragraphs?']]) {
    const m = new RegExp(`\\b(sans[- ]?serif|serif|monospace|typewriter)\\s+(?:[a-z-]+\\s+)?(?:${nouns})\\b|\\b(?:${nouns})\\s+(?:in|with|using)\\s+(?:an?\\s+)?(sans[- ]?serif|serif|monospace)`).exec(t);
    const want = m && (m[1] || m[2]);
    if (!want) continue;
    if (/sans/.test(want) && !isSans(k[key])) k[key] = 'Inter (modern sans-serif)';
    else if (want === 'serif' && (isSans(k[key]) || !k[key] || /mono|typewriter/i.test(k[key]))) k[key] = key === 'headingFont' ? 'Source Serif (modern serif)' : 'Georgia (classic serif)';
    else if (/mono|typewriter/.test(want)) k[key] = 'Typewriter (monospace)';
  }
  const named = [['garamond', 'EB Garamond (book serif)'], ['georgia', 'Georgia (classic serif)'], ['times', 'Times (traditional serif)'],
    ['computer modern|latex', 'Computer Modern (LaTeX serif)'], ['inter\\b', 'Inter (modern sans-serif)'], ['helvetica|arial', 'Helvetica / Arial (neutral sans-serif)'], ['source serif', 'Source Serif (modern serif)']];
  for (const [re, font] of named) {
    const m = new RegExp(`\\b(${re})`).exec(t);
    if (!m) continue;
    const after = t.slice(m.index, m.index + 40);
    if (/heading|title/.test(after)) k.headingFont = font; else k.bodyFont = font;
  }
  Object.assign(k, explicitKnobs(instruction));
  const page = /^#[0-9a-f]{6}$/i.test(k.pageColor || '') ? k.pageColor : pageBackground;
  for (const key of ['textColor', 'headingColor', 'linkColor']) {
    if (k[key] && /^#[0-9a-f]{6}$/i.test(k[key]) && contrast(k[key], page) < 4) delete k[key];
  }
  if (k.accentColor && /^#[0-9a-f]{6}$/i.test(k.accentColor) && contrast(k.accentColor, page) < 2) delete k.accentColor;
  if (k.pageColor && luminance(k.pageColor) < 0.6) delete k.pageColor; // keep pages light; dark paper is a view option
  return k;
}

async function restyleWithKnobs(p, css, instruction, { signal, lang, pageBackground }) {
  const reply = await chat(p, { system: KNOB_SYSTEM, prompt: `Request: ${instruction}`, json: true, schema: KNOB_SCHEMA, signal, lang });
  let knobs;
  try { knobs = parseJsonLoose(reply); } catch { knobs = {}; }
  knobs = sanitizeKnobs(knobs, instruction, pageBackground);
  const added = dropNoopRules(css, knobsToCss(knobs));
  if (!added) throw new Error('The model didn’t pick any setting that changes the style. Try naming what to change (fonts, size, colours, spacing).');
  return { css: withAiBlock(css, added), added, knobs };
}

export async function restyle(p, css, instruction, mode, { signal, onToken, lang, pageBackground } = {}) {
  const small = isLocalProvider(p) || p.kind === 'chrome';
  // Small models can't write reliable CSS, but they can reliably pick settings that the app turns into CSS.
  if (small && mode === 'adjust') return restyleWithKnobs(p, css, instruction, { signal, lang, pageBackground });
  const current = small && mode === 'adjust' ? cssSummary(css) : stripComments(css);
  const task = mode === 'redesign'
    ? 'Write a COMPLETE new stylesheet that replaces the current one. Start it with the comment /* Write Along template: Custom */ and define the page variables and @page rule.'
    : `Return ONLY the few new CSS rules needed for this change; they are appended after the current stylesheet, so they override it. Prefer changing :root variables. Do NOT repeat the current stylesheet.`;
  const prompt = `Current stylesheet${small && mode === 'adjust' ? ' (summary)' : ''}:\n${current}\n\nRequested change: ${instruction}\n\n${task}`;
  const reply = await chat(p, { system: STYLE_SYSTEM, prompt, signal, lang, onToken });
  let added = cleanCssReply(reply);
  const rules = countCssRules(added);
  if (!rules) throw new Error('The model did not return usable CSS. Try rephrasing, or use a larger model.');
  if (mode === 'redesign') {
    if (rules < 8) throw new Error(`The model returned only ${rules} CSS rule${rules === 1 ? '' : 's'}, not a whole stylesheet. Try “Adjust current style” instead.`);
    return { css: added.trim() + '\n', added };
  }
  if (!PAGE_WORDS.test(instruction)) added = stripPageGeometry(added);
  added = dropNoopRules(css, added);
  if (!added) throw new Error('The model only repeated the existing styles, so nothing changed. Try a more specific request (e.g. name colours or fonts) or a larger model.');
  return { css: withAiBlock(css, added), added };
}
