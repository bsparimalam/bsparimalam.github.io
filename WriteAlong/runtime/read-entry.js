/**
 * Write Along — Self-contained read.html runtime bootstrap.
 * Bundled via esbuild into runtime/read-bundle.js for portable .wa/read.html files.
 */
import { renderIntoDocument, WA_VERSION } from './render.js';
import baseCss from './base.css';

async function loadTextWithFallback(url, fallbackElementId) {
  // On file:// or offline, fetch may throw; fall back to inlined script block.
  if (location.protocol !== 'file:') {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) {
        return await res.text();
      }
    } catch (_err) {
      // fall through to inline fallback
    }
  }
  const el = document.getElementById(fallbackElementId);
  return el ? el.textContent : '';
}

function detectFontsBaseUrl() {
  const meta = document.querySelector('meta[name="wa-fonts-base"]');
  if (meta && meta.content) return meta.content;
  if (location.pathname.includes('/templates/')) return '../../runtime/fonts/';
  if (location.pathname.includes('/docs/')) return '../runtime/fonts/';
  return '';
}

async function boot() {
  const [markdown, styleCss] = await Promise.all([
    loadTextWithFallback('./content.md', 'wa-content'),
    loadTextWithFallback('./style.css', 'wa-style'),
  ]);

  const fontsBaseUrl = detectFontsBaseUrl();
  await renderIntoDocument(document, {
    markdown,
    styleCss,
    baseCss,
    fontsBaseUrl,
  });
  window.__WA_READY__ = true;
}

window.__WA_VERSION__ = WA_VERSION;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
