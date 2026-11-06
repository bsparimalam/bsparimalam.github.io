// Markdown ⇄ editor DOM conversion.
// md → HTML uses marked (GFM) plus pandoc-style conventions: YAML title block, implicit
// figures, \newpage and [TOC]. HTML → md is a hand-written serializer for the subset
// of HTML the editor produces (and anything pasted, after sanitising).

import { Marked } from '../vendor/marked/marked.esm.js';

const marked = new Marked({ gfm: true, breaks: false, async: false });

/* ------------------------------------------------------------------ front matter */

const META_KEYS = ['title', 'subtitle', 'author', 'date', 'abstract'];

function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    const inner = s.slice(1, -1);
    return s[0] === '"' ? inner.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\') : inner.replace(/''/g, "'");
  }
  return s;
}

/** Parses the small YAML subset used for document metadata. Unknown keys are kept verbatim. */
export function splitFrontMatter(md) {
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(md);
  const meta = { title: '', subtitle: '', author: [], date: '', abstract: '', extra: '' };
  if (!m) return { meta, body: md, hasFrontMatter: false };

  const lines = m[1].split(/\r?\n/);
  const extra = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const km = /^([A-Za-z_][\w-]*):(?:\s(.*))?$/.exec(line);
    // Gather continuation lines (indented or list items) belonging to this key.
    const block = [];
    let j = i + 1;
    while (j < lines.length && (/^\s+\S/.test(lines[j]) || /^\s*$/.test(lines[j]) || /^-\s/.test(lines[j]))) {
      block.push(lines[j]);
      j++;
    }
    while (block.length && !block[block.length - 1].trim()) block.pop();
    if (!km || !META_KEYS.includes(km[1])) {
      extra.push(line, ...block);
      i = j - 1;
      continue;
    }
    const key = km[1];
    const rest = (km[2] || '').trim();
    let value;
    if (/^[|>][+-]?$/.test(rest)) {
      const indent = Math.min(...block.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
      const text = block.map((l) => l.slice(indent));
      value = rest.startsWith('|') ? text.join('\n') : text.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ');
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      value = rest.slice(1, -1).split(',').map(unquote).filter(Boolean);
    } else if (!rest && block.some((l) => /^\s*-\s/.test(l))) {
      value = block.filter((l) => /^\s*-\s/.test(l)).map((l) => unquote(l.replace(/^\s*-\s+/, '')));
    } else {
      value = unquote([rest, ...block.map((l) => l.trim())].filter(Boolean).join(' '));
    }
    if (key === 'author') meta.author = Array.isArray(value) ? value : value ? [value] : [];
    else meta[key] = Array.isArray(value) ? value.join(', ') : value;
    i = j - 1;
  }
  meta.extra = extra.join('\n');
  return { meta, body: md.slice(m[0].length), hasFrontMatter: true };
}

function yamlString(s) {
  if (s === '') return '""';
  if (/^[\w][\w .,()&!?/'-]*$/.test(s) && !/^(true|false|null|yes|no|~)$/i.test(s) && !/:\s|\s#/.test(s)) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

export function serializeFrontMatter(meta) {
  const out = [];
  if (meta.title) out.push(`title: ${yamlString(meta.title)}`);
  if (meta.subtitle) out.push(`subtitle: ${yamlString(meta.subtitle)}`);
  const authors = (meta.author || []).filter(Boolean);
  if (authors.length === 1) out.push(`author: ${yamlString(authors[0])}`);
  else if (authors.length > 1) out.push('author:', ...authors.map((a) => `  - ${yamlString(a)}`));
  if (meta.date) out.push(`date: ${yamlString(meta.date)}`);
  if (meta.abstract) out.push('abstract: |', ...meta.abstract.split('\n').map((l) => (l ? '  ' + l : '')));
  if (meta.extra && meta.extra.trim()) out.push(meta.extra.replace(/\s+$/, ''));
  return out.length ? `---\n${out.join('\n')}\n---\n\n` : '';
}

export function hasMeta(meta) {
  return !!(meta.title || meta.subtitle || meta.date || meta.abstract || (meta.author || []).some(Boolean));
}

/* ------------------------------------------------------------------ md → html */

const ALLOWED_TAGS = new Set(('a abbr b blockquote br code del div em figcaption figure h1 h2 h3 h4 h5 h6 hr i img input ' +
  'kbd li mark ol p pre s strike strong sub sup table tbody td tfoot th thead tr u ul span').split(' '));
const DROP_WITH_CONTENT = new Set('script style iframe object embed noscript template head title meta link svg math button select textarea form canvas video audio'.split(' '));
const ALLOWED_ATTRS = { a: ['href', 'title'], img: ['src', 'alt', 'title', 'data-src', 'width', 'height'], th: ['align'], td: ['align'],
  code: ['class'], input: ['type', 'checked'], ol: ['start'], div: ['class'], li: ['class'], ul: ['class'] };

function safeUrl(url, forImage) {
  const u = (url || '').trim();
  if (/^(javascript|vbscript):/i.test(u)) return '';
  if (/^data:/i.test(u) && !(forImage && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(u))) return '';
  return u;
}

/** Strips everything the editor does not understand. Works in place on a container element. */
export function sanitize(root) {
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.COMMENT_NODE) { child.remove(); continue; }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const tag = child.localName;
      if (DROP_WITH_CONTENT.has(tag)) { child.remove(); continue; }
      if (!ALLOWED_TAGS.has(tag)) {
        // Unknown wrappers (section, article, font, …): keep the content.
        walk(child);
        const blockish = /^(section|article|main|aside|header|footer|nav|center|address|details|summary|dl|dt|dd)$/.test(tag);
        if (blockish && !child.querySelector('p,h1,h2,h3,h4,h5,h6,ul,ol,pre,blockquote,table,div')) {
          const p = child.ownerDocument.createElement('p');
          p.append(...child.childNodes);
          child.replaceWith(p);
        } else child.replaceWith(...child.childNodes);
        continue;
      }
      const keep = ALLOWED_ATTRS[tag] || [];
      for (const attr of [...child.attributes]) {
        if (!keep.includes(attr.name)) child.removeAttribute(attr.name);
      }
      if (tag === 'a') child.setAttribute('href', safeUrl(child.getAttribute('href')));
      if (tag === 'img') {
        const src = safeUrl(child.getAttribute('src'), true);
        if (!src && !child.dataset.src) { child.remove(); continue; }
        child.setAttribute('src', src);
      }
      if (tag === 'input' && child.getAttribute('type') !== 'checkbox') { child.remove(); continue; }
      if (tag === 'div' && !/^(page-break|toc)$/.test(child.getAttribute('class') || '')) child.removeAttribute('class');
      walk(child);
    }
  };
  walk(root);
  return root;
}

function onlyChild(el) {
  const kids = [...el.childNodes].filter((n) => !(n.nodeType === Node.TEXT_NODE && !n.textContent.trim()));
  return kids.length === 1 ? kids[0] : null;
}

/**
 * Converts markdown body (no front matter) to sanitised editor HTML inside `container`.
 * @param {string} md
 * @param {HTMLElement} container element of the target document (gets replaced content)
 * @param {(path: string) => string|null} resolveImage maps zip-relative paths to displayable URLs
 */
export function renderMarkdownInto(md, container, resolveImage = () => null) {
  const doc = container.ownerDocument;
  const tpl = doc.createElement('template');
  tpl.innerHTML = marked.parse(md);
  const frag = tpl.content;
  sanitize(frag);

  for (const p of [...frag.querySelectorAll('p')]) {
    const text = p.textContent.trim();
    if (text === '\\newpage' || text === '\\pagebreak') {
      const d = doc.createElement('div');
      d.className = 'page-break';
      d.contentEditable = 'false';
      p.replaceWith(d);
    } else if (/^\[(TOC|toc)\]$/.test(text)) {
      const nav = doc.createElement('nav');
      nav.className = 'toc';
      nav.contentEditable = 'false';
      p.replaceWith(nav);
    } else {
      const only = onlyChild(p);
      if (only && only.nodeName === 'IMG' && only.getAttribute('alt') && p.parentNode === frag) {
        const fig = doc.createElement('figure');
        const cap = doc.createElement('figcaption');
        cap.textContent = only.getAttribute('alt');
        fig.append(only, cap);
        p.replaceWith(fig);
      }
    }
  }

  for (const img of frag.querySelectorAll('img')) {
    const src = img.getAttribute('src') || '';
    if (!/^(https?:|data:|blob:)/i.test(src)) {
      const path = decodeURIComponent(src.replace(/^\.\//, ''));
      img.dataset.src = path;
      const url = resolveImage(path);
      if (url) img.src = url;
    }
  }

  for (const li of frag.querySelectorAll('li')) {
    const first = li.firstElementChild?.localName === 'p' ? li.firstElementChild.firstChild : li.firstChild;
    if (first && first.nodeName === 'INPUT') {
      li.classList.add('task-list-item');
      li.parentElement.classList.add('contains-task-list');
      first.removeAttribute('disabled');
      if (first.hasAttribute('checked')) first.checked = true;
      // marked emits a space after the checkbox; keep it as text so the caret has a home.
    }
  }

  container.replaceChildren(frag);
}

export function renderTitleBlock(meta, doc) {
  const header = doc.createElement('header');
  header.id = 'title-block-header';
  header.contentEditable = 'false';
  const add = (tag, cls, text) => {
    const el = doc.createElement(tag);
    el.className = cls;
    el.textContent = text;
    header.append(el);
    return el;
  };
  if (meta.title) add('h1', 'title', meta.title);
  if (meta.subtitle) add('p', 'subtitle', meta.subtitle);
  for (const a of meta.author || []) if (a) add('p', 'author', a);
  if (meta.date) add('p', 'date', meta.date);
  if (meta.abstract) {
    const div = add('div', 'abstract', '');
    const t = doc.createElement('div');
    t.className = 'abstract-title';
    t.textContent = 'Abstract';
    div.append(t);
    for (const para of meta.abstract.split(/\n\s*\n/)) {
      const p = doc.createElement('p');
      p.innerHTML = marked.parseInline(para.trim());
      sanitize(p);
      div.append(p);
    }
  }
  return header;
}

export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 64) || 'section';
}

/** Fills every nav.toc with links to the document headings (h1–h3). */
export function refreshToc(body) {
  const navs = body.querySelectorAll('nav.toc');
  if (!navs.length) return;
  const used = new Set();
  const items = [];
  for (const h of body.querySelectorAll('h1, h2, h3')) {
    if (h.closest('#title-block-header, nav.toc')) continue;
    let id = slugify(h.textContent);
    while (used.has(id)) id += '-1';
    used.add(id);
    h.id = id;
    items.push({ level: h.localName, id, text: h.textContent });
  }
  const doc = body.ownerDocument;
  for (const nav of navs) {
    const sig = JSON.stringify(items);
    if (nav.dataset.sig === sig) continue;
    nav.dataset.sig = sig;
    const title = doc.createElement('div');
    title.className = 'toc-title';
    title.textContent = 'Contents';
    const ol = doc.createElement('ol');
    for (const it of items) {
      const li = doc.createElement('li');
      li.className = `toc-${it.level}`;
      const a = doc.createElement('a');
      a.href = '#' + it.id;
      a.textContent = it.text;
      li.append(a);
      ol.append(li);
    }
    nav.replaceChildren(title, ol);
  }
}

/* ------------------------------------------------------------------ html → md */

const BLOCK_TAGS = new Set('address article aside blockquote dd div dl dt figure footer h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table tbody td tfoot th thead tr ul'.split(' '));

function isBlock(node) {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.localName);
}

function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/([*`[\]])/g, '\\$1')
    .replace(/~~/g, '\\~\\~')
    .replace(/(^|[^\w])_|_(?=[^\w]|$)/g, (m) => m.replace('_', '\\_'))
    .replace(/<(?=[A-Za-z/!?])/g, '\\<')
    .replace(/&(?=#?\w+;)/g, '\\&');
}

// Escapes constructs that would be read as block syntax at the start of a line.
function escapeLineStart(line) {
  return line
    .replace(/^(\s*)(#{1,6})(?=\s|$)/, '$1\\$2')
    .replace(/^(\s*)([>+-])(?=\s|$)/, '$1\\$2')
    .replace(/^(\s*)(\d+)([.)])(?=\s|$)/, '$1$2\\$3')
    .replace(/^(\s*)(=+|-+)\s*$/, (m, s, r) => s + '\\' + r)
    .replace(/^(\s*)(\|)/, '$1\\$2');
}

function codeSpan(text) {
  const runs = text.match(/`+/g) || [];
  const n = runs.reduce((m, r) => Math.max(m, r.length), 0) + 1;
  const fence = '`'.repeat(n);
  const pad = /^`|`$|^\s.*\S|\S.*\s$/.test(text) && text.trim() ? ' ' : '';
  return fence + pad + text + pad + fence;
}

function wrapMarker(inner, marker) {
  if (!inner.trim()) return inner;
  const lead = inner.match(/^\s*/)[0];
  const trail = inner.match(/\s*$/)[0];
  return lead + marker + inner.trim() + marker + trail;
}

function linkDest(url) {
  if (!url) return '';
  return /[\s()<>]/.test(url) ? `<${url.replace(/>/g, '%3E')}>` : url;
}

function titlePart(title) {
  return title ? ` "${title.replace(/"/g, '\\"')}"` : '';
}

function imageMd(img) {
  const src = img.dataset.src || img.getAttribute('src') || '';
  const alt = (img.getAttribute('alt') || '').replace(/([[\]\\])/g, '\\$1');
  return `![${alt}](${linkDest(src)}${titlePart(img.getAttribute('title'))})`;
}

function inline(node, ctx = {}) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      let t = child.textContent.replace(/[\u00a0]/g, ' ');
      if (!ctx.pre) t = t.replace(/[\t\n\r ]+/g, ' ');
      out += ctx.raw ? t : escapeText(t);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const tag = child.localName;
    switch (tag) {
      case 'strong': case 'b': out += wrapMarker(inline(child, ctx), '**'); break;
      case 'em': case 'i': out += wrapMarker(inline(child, ctx), '*'); break;
      case 'del': case 's': case 'strike': out += wrapMarker(inline(child, ctx), '~~'); break;
      case 'code': out += codeSpan(child.textContent.replace(/\u00a0/g, ' ')); break;
      case 'br': out += '\\\n'; break;
      case 'img': out += imageMd(child); break;
      case 'input': if (child.type === 'checkbox') break; break;
      case 'a': {
        const text = inline(child, ctx);
        const href = child.getAttribute('href') || '';
        if (!href) out += text;
        else if (text === escapeText(href) && /^https?:\/\//.test(href)) out += `<${href}>`;
        else out += `[${text}](${linkDest(href)}${titlePart(child.getAttribute('title'))})`;
        break;
      }
      case 'sub': case 'sup': case 'kbd': case 'mark': case 'u':
        out += `<${tag}>${inline(child, ctx)}</${tag}>`; break;
      default:
        out += isBlock(child) ? ' ' + inline(child, ctx) + ' ' : inline(child, ctx);
    }
  }
  return out;
}

function finishInline(text) {
  // Trim each line, drop a trailing hard break, and protect line starts.
  return text
    .replace(/\\\n\s*$/, '')
    .split('\n')
    .map((l, i) => escapeLineStart(i === 0 ? l.trim() : l.trim()))
    .join('\n')
    .replace(/ +\\$/gm, '\\')
    .trim();
}

function indentLines(text, first, rest) {
  return text.split('\n').map((l, i) => (i === 0 ? first + l : l ? rest + l : '')).join('\n');
}

function listItem(li, marker) {
  const parts = [];
  let buf = null;
  let checkbox = '';
  const flush = () => {
    if (buf) {
      const t = finishInline(inline(buf));
      if (t) parts.push(t);
      buf = null;
    }
  };
  for (const child of li.childNodes) {
    if (child.nodeName === 'INPUT' && child.type === 'checkbox' && !parts.length && !buf?.childNodes.length) {
      checkbox = child.checked ? '[x] ' : '[ ] ';
      continue;
    }
    if (isBlock(child)) {
      flush();
      const b = block(child);
      if (b) parts.push(b);
    } else {
      if (!buf) buf = li.ownerDocument.createElement('span');
      buf.append(child.cloneNode(true));
    }
  }
  flush();
  // A task-list checkbox may live inside the first <p> of a loose item.
  if (!checkbox && li.classList.contains('task-list-item')) {
    const box = li.querySelector(':scope > p > input[type=checkbox]');
    if (box) checkbox = box.checked ? '[x] ' : '[ ] ';
  }
  const loose = [...li.children].filter((c) => c.localName === 'p').length > 1;
  const body = parts.join(loose ? '\n\n' : '\n') || '';
  const pad = ' '.repeat(marker.length);
  return indentLines(checkbox + body, marker, pad);
}

function table(el) {
  const rows = [...el.querySelectorAll('tr')];
  if (!rows.length) return '';
  const cell = (c) => finishInline(inline(c)).replace(/\\\n/g, ' ').replace(/\|/g, '\\|') || ' ';
  const matrix = rows.map((r) => [...r.children].filter((c) => /^t[hd]$/.test(c.localName)).map(cell));
  const width = Math.max(...matrix.map((r) => r.length));
  for (const r of matrix) while (r.length < width) r.push(' ');
  const aligns = [...rows[0].children].map((c) => c.getAttribute('align') || c.style.textAlign || '');
  const sep = Array.from({ length: width }, (_, i) => {
    const a = aligns[i];
    return a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---';
  });
  const line = (r) => `| ${r.join(' | ')} |`;
  return [line(matrix[0]), `| ${sep.join(' | ')} |`, ...matrix.slice(1).map(line)].join('\n');
}

function preText(el) {
  let out = '';
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent;
    else if (n.nodeName === 'BR') out += '\n';
    else if (n.nodeType === Node.ELEMENT_NODE) out += (/^(DIV|P)$/.test(n.nodeName) && out && !out.endsWith('\n') ? '\n' : '') + preText(n);
  }
  return out;
}

function block(el) {
  const tag = el.localName;
  if (el.id === 'title-block-header') return '';
  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const t = finishInline(inline(el)).replace(/\\\n/g, ' ');
      return t ? '#'.repeat(+tag[1]) + ' ' + t.replace(/#+$/, (m) => '\\' + m) : '';
    }
    case 'p': return finishInline(inline(el));
    case 'hr': return '---';
    case 'pre': {
      const code = el.querySelector('code');
      const text = preText(code || el).replace(/\u00a0/g, ' ').replace(/\n$/, '');
      const lang = ((code && code.className) || '').match(/language-([\w+#.-]+)/)?.[1] || '';
      const runs = text.match(/^`{3,}/gm) || [];
      const fence = '`'.repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
      return `${fence}${lang}\n${text}\n${fence}`;
    }
    case 'blockquote': {
      const inner = blocks(el);
      return inner.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n');
    }
    case 'ul': case 'ol': {
      const start = tag === 'ol' ? parseInt(el.getAttribute('start') || '1', 10) || 1 : 1;
      const items = [...el.children].filter((c) => c.localName === 'li');
      // Single-paragraph items (Google Docs, Word) stay tight; real multi-paragraph items make the list loose.
      const loose = items.some((li) => [...li.children].filter((c) => isBlock(c) && !/^(ul|ol)$/.test(c.localName)).length > 1);
      const parts = [];
      let n = start;
      let pad = '';
      for (const c of el.children) {
        if (c.localName === 'li') {
          const marker = tag === 'ol' ? `${n++}. ` : '- ';
          pad = ' '.repeat(marker.length);
          parts.push(listItem(c, marker));
        } else if (c.localName === 'ul' || c.localName === 'ol') {
          // Browsers' indent command nests lists directly inside lists; attach to the previous item.
          const nested = block(c);
          if (parts.length) parts[parts.length - 1] += '\n' + indentLines(nested, pad, pad);
          else parts.push(nested);
        }
      }
      return parts.join(loose ? '\n\n' : '\n');
    }
    case 'li': return listItem(el, '- ');
    case 'table': return table(el);
    case 'figure': {
      const img = el.querySelector('img');
      if (!img) return blocks(el);
      const cap = el.querySelector('figcaption');
      const alt = cap ? cap.textContent.trim().replace(/\s+/g, ' ') : img.getAttribute('alt') || '';
      const clone = img.cloneNode();
      clone.setAttribute('alt', alt);
      return imageMd(clone);
    }
    case 'nav': return el.classList.contains('toc') ? '[TOC]' : blocks(el);
    case 'div':
      if (el.classList.contains('page-break')) return '\\newpage';
      return [...el.childNodes].some(isBlock) ? blocks(el) : finishInline(inline(el));
    default:
      return [...el.childNodes].some(isBlock) ? blocks(el) : finishInline(inline(el));
  }
}

function listKind(md) {
  return /^- /.test(md) ? 'ul' : /^\d+\. /.test(md) ? 'ol' : '';
}

function blocks(container) {
  const out = [];
  let buf = null;
  const flush = () => {
    if (buf) {
      const t = finishInline(inline(buf));
      if (t) out.push(t);
      buf = null;
    }
  };
  for (const child of container.childNodes) {
    if (isBlock(child)) {
      flush();
      const b = block(child);
      if (b) out.push(b);
    } else if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
      if (!buf) buf = container.ownerDocument.createElement('span');
      buf.append(child.cloneNode(true));
    }
  }
  flush();
  // Two adjacent lists of the same type would merge; separate them with a comment.
  const joined = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && listKind(out[i]) && listKind(out[i]) === listKind(out[i - 1])) joined.push('<!-- -->');
    joined.push(out[i]);
  }
  return joined.join('\n\n');
}

/** Serialises an editor body element to markdown (without front matter). */
export function domToMarkdown(body) {
  return blocks(body).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** Turns inline styling (Google Docs, Word, web pages) into semantic tags before styles are stripped. */
function semanticize(root) {
  for (const el of [...root.querySelectorAll('[style]')]) {
    const st = el.getAttribute('style').toLowerCase();
    const weight = /font-weight:\s*(\w+)/.exec(st)?.[1];
    if (/^(b|strong)$/.test(el.localName) && weight && /^(normal|[1-4]00)$/.test(weight)) {
      el.replaceWith(...el.childNodes);
      continue;
    }
    const wraps = [];
    if (el.localName === 'span' || el.localName === 'font') {
      if (weight && /^(bold|bolder|[6-9]00)$/.test(weight)) wraps.push('strong');
      if (/font-style:\s*italic/.test(st)) wraps.push('em');
      if (/text-decoration[^;]*line-through/.test(st)) wraps.push('del');
      if (/font-family:[^;]*(mono|courier|consolas)/.test(st)) wraps.push('code');
    }
    for (const tag of wraps) {
      const w = root.ownerDocument.createElement(tag);
      w.append(...el.childNodes);
      el.append(w);
    }
  }
}

/** Converts arbitrary pasted/dropped HTML to clean editor HTML by round-tripping through markdown. */
export function cleanHtmlViaMarkdown(html, doc) {
  const tpl = doc.createElement('template');
  tpl.innerHTML = html;
  semanticize(tpl.content);
  sanitize(tpl.content);
  const holder = doc.createElement('div');
  holder.append(tpl.content);
  return domToMarkdown(holder);
}

export function markdownToPlainText(md) {
  const tpl = document.createElement('template');
  tpl.innerHTML = marked.parse(md);
  return tpl.content.textContent;
}
