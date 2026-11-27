/**
 * Export Flows: Print-to-PDF (1-to-1 Paginated), Self-Contained Standalone HTML, and .wa.zip
 */
import {
  renderIntoDocument,
  BUNDLED_FONT_FILES,
  WA_VERSION,
} from '../runtime/render.js';
import {
  parsePageConfig,
  buildPaginatedPageCss,
  stripAtPageRules,
} from '../runtime/paginate.js';
import { createWaZipBlob } from './fs.js';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function createHiddenWorkIframe() {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-20000px';
  iframe.style.top = '0';
  iframe.style.width = '1100px';
  iframe.style.height = '1400px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  const targetDoc = iframe.contentDocument;
  targetDoc.open();
  targetDoc.write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body><div id="wa-root"></div></body></html>');
  targetDoc.close();
  return { iframe, targetDoc };
}

/**
 * Print-to-PDF using a clean hidden iframe rendered & paginated via the exact same
 * runtime/render.js + runtime/paginate.js engine so screen and PDF match 1-to-1.
 */
export async function exportToPdf(doc, baseCss) {
  const { iframe, targetDoc } = createHiddenWorkIframe();

  const blobUrls = new Map();
  for (const [k, b] of doc.images.entries()) {
    blobUrls.set(k, URL.createObjectURL(b));
  }

  const fontsBaseUrl = new URL('./runtime/fonts/', window.location.href).href;

  await renderIntoDocument(targetDoc, {
    markdown: doc.content,
    styleCss: doc.css,
    baseCss,
    fontsBaseUrl,
    resolveImage: (src) => blobUrls.get(String(src || '').replace(/^\.\//, '')) || src,
  });

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  setTimeout(() => {
    for (const url of blobUrls.values()) URL.revokeObjectURL(url);
    iframe.remove();
  }, 2500);
}

/**
 * Build a 100% offline, single-file standalone HTML document containing:
 * - Pre-paginated discrete .wa-pages > .wa-page sheets (zero JS required)
 * - Inlined base.css + paginated @page rules + stripped user style.css
 * - Inlined base64 woff2 fonts for every bundled family referenced in style.css
 * - Inlined data-URI images for every embedded image
 */
export async function buildStandaloneHtmlString(doc, baseCss) {
  const dataUriMap = new Map();
  for (const [imgPath, blob] of doc.images.entries()) {
    dataUriMap.set(imgPath, await blobToDataUrl(blob));
  }

  const { iframe, targetDoc } = createHiddenWorkIframe();
  const fontsBaseUrl = new URL('./runtime/fonts/', window.location.href).href;

  let paginatedHtml = '';
  let meta = {};
  try {
    const res = await renderIntoDocument(targetDoc, {
      markdown: doc.content,
      styleCss: doc.css,
      baseCss,
      fontsBaseUrl,
      resolveImage: (src) => {
        const clean = String(src || '').replace(/^\.\//, '');
        return dataUriMap.get(clean) || src;
      },
    });
    meta = res.meta || {};
    paginatedHtml = targetDoc.getElementById('wa-root')?.innerHTML || '';
  } finally {
    iframe.remove();
  }

  // Inline referenced bundled fonts as base64 data URIs
  const fontRules = [];
  const lowerCss = (doc.css || '').toLowerCase();

  for (const [family, files] of Object.entries(BUNDLED_FONT_FILES)) {
    if (!lowerCss.includes(family.toLowerCase())) continue;
    for (const [filename, weight, style] of files) {
      try {
        const res = await fetch(`${fontsBaseUrl}${filename}`);
        if (!res.ok) continue;
        const b = await res.blob();
        const dataUrl = await blobToDataUrl(b);
        fontRules.push(
`@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('${dataUrl}') format('woff2');
}`
        );
      } catch (_e) {
        // skip if unavailable
      }
    }
  }

  const config = parsePageConfig(doc.css, meta);
  const pageRulesCss = buildPaginatedPageCss(config);
  const sanitizedUserCss = stripAtPageRules(doc.css || '');
  const title = (meta.title || doc.name.replace(/\.wa$/, '') || 'Write Along Document')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<!-- Standalone HTML exported by Write Along v${WA_VERSION} (zero network required) -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="wa-version" content="${WA_VERSION}">
  <meta name="generator" content="Write Along ${WA_VERSION}">
  <link rel="icon" href="data:,">
  <title>${title}</title>
  <style id="wa-base-css">${baseCss}</style>
  <style id="wa-font-css">${fontRules.join('\n')}</style>
  <style id="wa-page-rules">${pageRulesCss}</style>
  <style id="wa-user-css">${sanitizedUserCss}</style>
</head>
<body>
  <div id="wa-root">${paginatedHtml}</div>
</body>
</html>
`;
}

export async function exportStandaloneHtml(doc, baseCss) {
  const htmlStr = await buildStandaloneHtmlString(doc, baseCss);
  const stem = (doc.name || 'document').replace(/\.wa$/, '');
  triggerDownload(new Blob([htmlStr], { type: 'text/html;charset=utf-8' }), `${stem}.html`);
}

export async function exportWaZip(doc) {
  const blob = await createWaZipBlob(doc);
  const stem = (doc.name || 'document').replace(/\.wa$/, '');
  triggerDownload(blob, `${stem}.wa.zip`);
}
