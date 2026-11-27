/**
 * Source-Line Anchored Bidirectional Scroll Sync (content.md <-> Paginated Preview)
 *
 * Maps 1-based Markdown line numbers (`data-wa-line`) to exact rendered Y positions
 * inside `#preview-frame`, using separate monotonic lookup tables for Editor->Preview
 * and Preview->Editor (handling cover pages, figures, page breaks, and 2-column layouts
 * cleanly without backward jumps or scroll feedback ping-pong).
 */

function interpolateMonotonic(pairs, srcVal, srcKey, dstKey) {
  if (!pairs || pairs.length === 0) return 0;
  if (srcVal <= pairs[0][srcKey]) return pairs[0][dstKey];
  const last = pairs[pairs.length - 1];
  if (srcVal >= last[srcKey]) return last[dstKey];

  let lo = 0;
  let hi = pairs.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (pairs[mid][srcKey] <= srcVal) lo = mid;
    else hi = mid;
  }

  const a = pairs[lo];
  const b = pairs[hi];
  const span = b[srcKey] - a[srcKey];
  if (span <= 0.0001) return a[dstKey];
  const t = (srcVal - a[srcKey]) / span;
  return a[dstKey] + t * (b[dstKey] - a[dstKey]);
}

export function createScrollSyncController({ editor, previewFrame, store }) {
  let editorToPreview = []; // [{ line, previewY }] sorted strictly by line
  let previewToEditor = []; // [{ line, previewY }] sorted strictly by previewY with monotonic line
  let ignorePreviewUntil = 0;
  let ignoreEditorUntil = 0;
  let editorRaf = 0;
  let previewRaf = 0;
  let previewBoundWin = null;
  let suppressedDepth = 0;

  function isSyncEligible() {
    return (
      Boolean(store.state.syncScroll) &&
      store.state.mode === 'edit' &&
      store.state.activeTab === 'content' &&
      !store.state.viewingGuide
    );
  }

  function getPreviewMetrics() {
    const win = previewFrame.contentWindow;
    const doc = previewFrame.contentDocument;
    if (!win || !doc || !doc.documentElement) return null;
    const scrollHeight = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0);
    const maxScroll = Math.max(0, scrollHeight - win.innerHeight);
    return { win, doc, maxScroll, scrollY: win.scrollY };
  }

  function getEditorMetrics() {
    const scrollEl = editor.view.scrollDOM;
    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    return {
      scrollEl,
      maxScroll,
      scrollTop: scrollEl.scrollTop,
      totalLines: Math.max(1, editor.view.state.doc.lines),
    };
  }

  /**
   * Rebuild line <-> previewY lookup tables after preview render, zoom, or resize.
   */
  function rebuildAnchors() {
    const pm = getPreviewMetrics();
    if (!pm) return;
    const { doc, win, maxScroll: previewMax } = pm;
    const totalLines = Math.max(1, editor.view.state.doc.lines);
    const pagesRoot = doc.querySelector('.wa-pages');
    if (!pagesRoot) {
      editorToPreview = [{ line: 1, previewY: 0 }, { line: totalLines, previewY: previewMax }];
      previewToEditor = [...editorToPreview];
      return;
    }

    const raw = [];
    const nodes = pagesRoot.querySelectorAll('[data-wa-line]');
    for (const el of nodes) {
      const ln = parseInt(el.getAttribute('data-wa-line'), 10);
      if (!Number.isFinite(ln) || ln < 1) continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0 && r.width <= 0) continue;
      const previewY = Math.max(0, Math.min(previewMax, r.top + win.scrollY - 24));
      raw.push({ line: Math.min(totalLines, ln), previewY });
    }

    // 1. Editor -> Preview table (sorted by increasing source line)
    const byLine = [...raw].sort((a, b) => a.line - b.line);
    const e2p = [{ line: 1, previewY: 0 }];
    for (const pt of byLine) {
      const prev = e2p[e2p.length - 1];
      if (pt.line > prev.line) {
        e2p.push(pt);
      }
    }
    if (e2p[e2p.length - 1].line < totalLines) {
      e2p.push({ line: totalLines, previewY: previewMax });
    } else {
      e2p[e2p.length - 1].previewY = previewMax;
    }
    editorToPreview = e2p;

    // 2. Preview -> Editor table (strictly increasing previewY + monotonic line for 2-col safety)
    const byY = [...raw].sort((a, b) => (a.previewY !== b.previewY ? a.previewY - b.previewY : a.line - b.line));
    const p2e = [{ line: 1, previewY: 0 }];
    for (const pt of byY) {
      const prev = p2e[p2e.length - 1];
      if (pt.previewY > prev.previewY + 2 && pt.line >= prev.line) {
        p2e.push(pt);
      }
    }
    if (p2e[p2e.length - 1].previewY < previewMax) {
      p2e.push({ line: totalLines, previewY: previewMax });
    } else {
      p2e[p2e.length - 1].line = totalLines;
    }
    previewToEditor = p2e;
  }

  function syncEditorToPreview() {
    if (suppressedDepth > 0 || !isSyncEligible()) return;
    if (performance.now() < ignoreEditorUntil) return;

    const pm = getPreviewMetrics();
    if (!pm || pm.maxScroll <= 0) return;
    const em = getEditorMetrics();
    if (em.maxScroll <= 0) return;

    if (editorToPreview.length < 2) rebuildAnchors();

    let targetPreviewY;
    if (em.scrollTop <= 1) {
      targetPreviewY = 0;
    } else if (em.scrollTop >= em.maxScroll - 1) {
      targetPreviewY = pm.maxScroll;
    } else {
      const exactLine = editor.getTopVisibleLine();
      targetPreviewY = interpolateMonotonic(editorToPreview, exactLine, 'line', 'previewY');
    }

    targetPreviewY = Math.max(0, Math.min(pm.maxScroll, Math.round(targetPreviewY)));
    if (Math.abs(pm.scrollY - targetPreviewY) < 1.5) return;

    ignorePreviewUntil = performance.now() + 140;
    pm.win.scrollTo(pm.win.scrollX, targetPreviewY);
  }

  function syncPreviewToEditor() {
    if (suppressedDepth > 0 || !isSyncEligible()) return;
    if (performance.now() < ignorePreviewUntil) return;

    const pm = getPreviewMetrics();
    if (!pm || pm.maxScroll <= 0) return;
    const em = getEditorMetrics();
    if (em.maxScroll <= 0) return;

    if (previewToEditor.length < 2) rebuildAnchors();

    let targetEditorTop;
    if (pm.scrollY <= 1) {
      targetEditorTop = 0;
    } else if (pm.scrollY >= pm.maxScroll - 1) {
      targetEditorTop = em.maxScroll;
    } else {
      const exactLine = interpolateMonotonic(previewToEditor, pm.scrollY, 'previewY', 'line');
      targetEditorTop = editor.getScrollTopForLine(exactLine);
    }

    targetEditorTop = Math.max(0, Math.min(em.maxScroll, Math.round(targetEditorTop)));
    if (Math.abs(em.scrollTop - targetEditorTop) < 1.5) return;

    ignoreEditorUntil = performance.now() + 140;
    em.scrollEl.scrollTop = targetEditorTop;
  }

  const onEditorScroll = () => {
    if (suppressedDepth > 0 || !isSyncEligible() || performance.now() < ignoreEditorUntil) return;
    if (editorRaf) return;
    editorRaf = requestAnimationFrame(() => {
      editorRaf = 0;
      syncEditorToPreview();
    });
  };

  const onPreviewScroll = () => {
    if (suppressedDepth > 0 || !isSyncEligible() || performance.now() < ignorePreviewUntil) return;
    if (previewRaf) return;
    previewRaf = requestAnimationFrame(() => {
      previewRaf = 0;
      syncPreviewToEditor();
    });
  };

  function bindPreviewListener() {
    const win = previewFrame.contentWindow;
    if (!win || win === previewBoundWin) return;
    previewBoundWin = win;
    win.addEventListener('scroll', onPreviewScroll, { passive: true });
  }

  editor.view.scrollDOM.addEventListener('scroll', onEditorScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (isSyncEligible()) rebuildAnchors();
  });

  /**
   * Execute a scroll restoration or programmatic layout change without firing
   * echo feedback in either direction.
   */
  function runWithoutFeedback(fn) {
    suppressedDepth++;
    ignorePreviewUntil = performance.now() + 160;
    ignoreEditorUntil = performance.now() + 160;
    try {
      return fn();
    } finally {
      setTimeout(() => {
        suppressedDepth = Math.max(0, suppressedDepth - 1);
      }, 60);
    }
  }

  return {
    bindPreviewListener,
    rebuildAnchors,
    syncEditorToPreview,
    syncPreviewToEditor,
    runWithoutFeedback,
    getAnchors: () => ({ editorToPreview, previewToEditor }),
  };
}
