// Word- and paragraph-level diffing, used by AI proofreading and the "Review changes" view.

export const TOKEN_RE = /\s+|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;

export function tokenize(text) {
  const out = [];
  for (const m of text.matchAll(TOKEN_RE)) out.push({ t: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

export const isWord = (t) => /[\p{L}\p{N}]/u.test(t);

export function lcsOps(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i].t === b[j].t ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i].t === b[j].t) { ops.push(['=', i++, j++]); }
    else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { ops.push(['+', i, j++]); }
    else { ops.push(['-', i++, j]); }
  }
  return ops;
}

/** Escapes text for safe insertion as HTML. */
function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/** Inline word diff of two strings as HTML with <del>/<ins>. */
export function wordDiffHtml(before, after) {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > 4_000_000) return `<del>${esc(before)}</del><ins>${esc(after)}</ins>`;
  let html = '';
  let del = '';
  let ins = '';
  const flush = () => {
    if (del) html += `<del>${esc(del)}</del>`;
    if (ins) html += `<ins>${esc(ins)}</ins>`;
    del = ins = '';
  };
  for (const [op, i, j] of lcsOps(a, b)) {
    if (op === '=') { flush(); html += esc(a[i].t); } else if (op === '-') del += a[i].t; else ins += b[j].t;
  }
  flush();
  return html;
}

/** Splits markdown into blocks separated by blank lines, keeping fenced code blocks whole. */
export function markdownBlocks(md) {
  const out = [];
  let cur = [];
  let fence = null;
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    const f = /^(`{3,}|~{3,})/.exec(line);
    if (fence) { cur.push(line); if (f && line.startsWith(fence)) fence = null; continue; }
    if (f) { fence = f[1]; cur.push(line); continue; }
    if (!line.trim()) { if (cur.length) out.push(cur.join('\n')); cur = []; continue; }
    cur.push(line);
  }
  if (cur.length) out.push(cur.join('\n'));
  return out;
}

/**
 * Block-level diff of two markdown documents with word-level detail inside changed blocks.
 * @returns {{type: 'same'|'changed'|'added'|'removed', html: string, count?: number}[]}
 */
export function markdownDiff(before, after) {
  const A = markdownBlocks(before);
  const B = markdownBlocks(after);
  const ops = lcsOps(A.map((t) => ({ t })), B.map((t) => ({ t })));
  const out = [];
  let dels = [];
  let inss = [];
  const flush = () => {
    const n = Math.max(dels.length, inss.length);
    for (let k = 0; k < n; k++) {
      if (dels[k] != null && inss[k] != null) out.push({ type: 'changed', html: wordDiffHtml(dels[k], inss[k]) });
      else if (dels[k] != null) out.push({ type: 'removed', html: `<del>${esc(dels[k])}</del>` });
      else out.push({ type: 'added', html: `<ins>${esc(inss[k])}</ins>` });
    }
    dels = [];
    inss = [];
  };
  for (const [op, i, j] of ops) {
    if (op === '=') {
      flush();
      const last = out[out.length - 1];
      if (last?.type === 'same') { last.count++; last.html = esc(A[i]); } else out.push({ type: 'same', count: 1, html: esc(A[i]) });
    } else if (op === '-') dels.push(A[i]);
    else inss.push(B[j]);
  }
  flush();
  return out;
}
