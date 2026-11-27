/**
 * Live Preview Iframe Manager (Discrete PDF-Like Pages)
 * Uses the exact same runtime/render.js + runtime/paginate.js + runtime/base.css as read.html.
 */
import { renderIntoDocument } from '../runtime/render.js';

export function createPreviewController(iframeEl, { onPageMetrics, onRendered, runWithoutFeedback } = {}) {
  let baseCss = '';
  let debounceTimer = null;
  let objectUrls = new Map();
  let lastZoom = 1.0;
  let renderSeq = 0;
  let lastPageCount = 1;
  let scrollHandlerBound = false;
  let feedbackWrapper = runWithoutFeedback || ((fn) => fn());

  async function init() {
    const res = await fetch('./runtime/base.css');
    baseCss = await res.text();
    const doc = iframeEl.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Preview</title></head><body><div id="wa-root"></div></body></html>');
    doc.close();

    if (!scrollHandlerBound && iframeEl.contentWindow) {
      scrollHandlerBound = true;
      iframeEl.contentWindow.addEventListener('scroll', () => reportCurrentPage(), { passive: true });
    }
  }

  function setFeedbackWrapper(fn) {
    feedbackWrapper = fn || ((cb) => cb());
  }

  function reportCurrentPage() {
    const doc = iframeEl.contentDocument;
    const win = iframeEl.contentWindow;
    if (!doc || !win || typeof onPageMetrics !== 'function') return;
    const sheets = Array.from(doc.querySelectorAll('.wa-page'));
    if (sheets.length === 0) return;
    const midY = win.innerHeight * 0.35;
    let currentPage = 1;
    for (let i = 0; i < sheets.length; i++) {
      const r = sheets[i].getBoundingClientRect();
      if (r.top <= midY) currentPage = i + 1;
    }
    onPageMetrics({ currentPage, pageCount: sheets.length });
  }

  function syncBlobUrls(imagesMap) {
    for (const [key, entry] of objectUrls.entries()) {
      if (!imagesMap.has(key) || imagesMap.get(key) !== entry.blob) {
        URL.revokeObjectURL(entry.url);
        objectUrls.delete(key);
      }
    }
    for (const [key, blob] of imagesMap.entries()) {
      if (!objectUrls.has(key)) {
        objectUrls.set(key, { blob, url: URL.createObjectURL(blob) });
      }
    }
  }

  function normalizeImgPath(src) {
    return String(src || '').replace(/^\.\//, '');
  }

  function applyZoom(zoom) {
    lastZoom = zoom;
    const doc = iframeEl.contentDocument;
    if (!doc || !doc.body) return;
    const root = doc.getElementById('wa-root');
    if (root) {
      root.style.transformOrigin = 'top center';
      root.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
    }
    if (typeof onRendered === 'function') {
      requestAnimationFrame(() => onRendered({ pageCount: lastPageCount, reason: 'zoom' }));
    }
  }

  async function renderNow({
    content,
    css,
    images = new Map(),
    pageGrid = false,
    zoom = lastZoom,
    baseAssetUrl = '',
    includeSourceMap = true,
  }) {
    const doc = iframeEl.contentDocument;
    if (!doc || !doc.body) return;

    const seq = ++renderSeq;
    const prevScrollX = iframeEl.contentWindow?.scrollX || 0;
    const prevScrollY = iframeEl.contentWindow?.scrollY || 0;

    syncBlobUrls(images);

    const resolveImage = (src) => {
      const clean = normalizeImgPath(src);
      if (objectUrls.has(clean)) return objectUrls.get(clean).url;
      if (baseAssetUrl && !/^(https?:|data:|blob:|\/)/i.test(clean)) {
        return `${baseAssetUrl}${clean}`;
      }
      return src;
    };

    const fontsBaseUrl = new URL('./runtime/fonts/', window.location.href).href;

    const result = await renderIntoDocument(doc, {
      markdown: content,
      styleCss: css,
      baseCss,
      fontsBaseUrl,
      resolveImage,
      pageGrid,
      includeSourceMap,
    });

    if (seq !== renderSeq) return;

    lastPageCount = result.pageCount || 1;
    applyZoom(zoom);

    requestAnimationFrame(() => {
      feedbackWrapper(() => {
        iframeEl.contentWindow?.scrollTo(prevScrollX, prevScrollY);
      });
      reportCurrentPage();
      if (typeof onRendered === 'function') {
        onRendered({ pageCount: lastPageCount, reason: 'render' });
      }
    });
  }

  function scheduleRender(payload, delayMs = 175) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderNow(payload);
    }, delayMs);
  }

  function getBaseCss() {
    return baseCss;
  }

  function getPageCount() {
    return lastPageCount;
  }

  return {
    init,
    setFeedbackWrapper,
    renderNow,
    scheduleRender,
    applyZoom,
    getBaseCss,
    getPageCount,
  };
}
