/**
 * Headless Chrome Render Check, Exact Screen<->PDF Page-Count Parity,
 * Pixel-Diff Parity Check, Thumbnail & Contact Sheet Verification.
 */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const templatesDir = path.join(root, 'templates');
const tmpPdfDir = path.join(root, 'tests', 'tmp-pdfs');
fs.mkdirSync(tmpPdfDir, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(root, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function getPdfPages(pdfPath) {
  const out = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const m = out.match(/^Pages:\s+(\d+)/m);
  return m ? parseInt(m[1], 10) : 0;
}

function pdfPage1ToPng(pdfPath, outPngNoExt, dpi = 48) {
  execFileSync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-r', String(dpi), '-singlefile', pdfPath, outPngNoExt]);
}

function computeImageSimilarity(imgA, imgB) {
  const py = `
import sys
from PIL import Image, ImageChops, ImageFilter
a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size:
    b = b.resize(a.size, Image.Resampling.LANCZOS)
# 2px Gaussian blur normalizes Chrome Skia vs Poppler Cairo subpixel glyph hinting
# while immediately catching any layout, line-break, margin, or color shift.
ab = a.filter(ImageFilter.GaussianBlur(2.0))
bb = b.filter(ImageFilter.GaussianBlur(2.0))
diff = ImageChops.difference(ab, bb)
px = list(diff.get_flattened_data())
close = sum(1 for r, g, bl in px if (r + g + bl) / 3.0 < 18)
print(f"{(close / len(px)) * 100:.2f}")
`;
  const out = execFileSync('python3', ['-c', py, imgA, imgB], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

async function main() {
  const index = JSON.parse(fs.readFileSync(path.join(templatesDir, 'index.json'), 'utf8'));
  const templates = index.templates;
  const { server, baseUrl } = await startServer();

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const concurrency = 6;
  let cursor = 0;
  const results = [];
  const failures = [];

  async function worker() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1120, height: 1400, deviceScaleFactor: 1 });

    while (true) {
      const i = cursor++;
      if (i >= templates.length) break;
      const tpl = templates[i];
      const errors = [];
      const onConsole = (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      };
      const onPageError = (err) => errors.push(`pageerror: ${err.message}`);
      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      try {
        const url = `${baseUrl}/templates/${tpl.id}.wa/read.html`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
        await page.waitForFunction(() => window.__WA_READY__ === true, { timeout: 15000 });

        const check = await page.evaluate(() => {
          const sheets = Array.from(document.querySelectorAll('.wa-page'));
          if (sheets.length === 0) return { ok: false, reason: 'missing .wa-page' };
          const imgs = Array.from(document.querySelectorAll('.wa-page img'));
          const brokenImgs = imgs.filter((im) => !im.complete || im.naturalWidth === 0).map((im) => im.src);
          let maxOverflow = 0;
          for (const s of sheets) {
            const pc = s.querySelector('.wa-page-content');
            if (pc) {
              const ov = pc.scrollWidth - pc.clientWidth;
              if (ov > maxOverflow) maxOverflow = ov;
            }
          }
          return {
            ok: brokenImgs.length === 0 && maxOverflow <= 4,
            screenPages: sheets.length,
            brokenImgs,
            maxOverflow,
          };
        });

        if (!check.ok) {
          errors.push(`DOM check failed: ${JSON.stringify(check)}`);
        }

        const pdfPath = path.join(tmpPdfDir, `${tpl.id}.pdf`);
        await page.pdf({
          path: pdfPath,
          preferCSSPageSize: true,
          printBackground: true,
        });

        const pdfPages = getPdfPages(pdfPath);
        if (pdfPages < 3) {
          errors.push(`Page count ${pdfPages} < 3`);
        }
        if (check.screenPages !== pdfPages) {
          errors.push(`Screen/PDF page mismatch: screen=${check.screenPages} vs pdf=${pdfPages}`);
        }

        // Rasterize page 1 into templates/<id>.wa/thumb.png
        const thumbBase = path.join(templatesDir, `${tpl.id}.wa`, 'thumb');
        pdfPage1ToPng(pdfPath, thumbBase, 48);

        results.push({ id: tpl.id, category: tpl.category, screenPages: check.screenPages, pdfPages, overflow: check.maxOverflow, errors });
        if (errors.length > 0) {
          failures.push({ id: tpl.id, screenPages: check.screenPages, pdfPages, errors });
        }
      } catch (err) {
        failures.push({ id: tpl.id, screenPages: 0, pdfPages: 0, errors: [err.message] });
      } finally {
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
      }
    }
    await page.close();
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // file:// fallback check on 3 templates
  const fileCheckErrors = [];
  const filePage = await browser.newPage();
  for (const sampleId of [templates[0].id, templates[12].id, templates[96].id]) {
    const fileUrl = `file://${path.join(templatesDir, `${sampleId}.wa`, 'read.html')}`;
    await filePage.goto(fileUrl, { waitUntil: 'load', timeout: 15000 });
    await filePage.waitForFunction(() => window.__WA_READY__ === true, { timeout: 10000 });
    const count = await filePage.evaluate(() => document.querySelectorAll('.wa-page').length);
    if (count < 3) fileCheckErrors.push(`file:// render failed for ${sampleId}: ${count} pages`);
  }
  await filePage.close();

  // Real Pixel-Diff Parity Check: Screen .wa-page[data-page="1"] vs Rasterized PDF Page 1 (96 DPI)
  const parityPage = await browser.newPage();
  await parityPage.setViewport({ width: 1200, height: 1500, deviceScaleFactor: 1 });
  const parityResults = [];
  const paritySamples = [
    'academic-ieee-twocol',
    'book-classic-novel',
    'report-annual-report',
    'tech-api-reference',
    'creative-blueprint',
    'mag-broadsheet-newspaper',
  ];

  for (const sampleId of paritySamples) {
    const url = `${baseUrl}/templates/${sampleId}.wa/read.html`;
    await parityPage.goto(url, { waitUntil: 'networkidle0' });
    await parityPage.waitForFunction(() => window.__WA_READY__ === true, { timeout: 10000 });

    const screenShotPath = path.join(tmpPdfDir, `${sampleId}-screen-p1.png`);
    const page1Handle = await parityPage.$('.wa-page[data-page="1"]');
    await page1Handle.screenshot({ path: screenShotPath });

    const pdfPath = path.join(tmpPdfDir, `${sampleId}.pdf`);
    const pdfPngBase = path.join(tmpPdfDir, `${sampleId}-pdf-p1`);
    pdfPage1ToPng(pdfPath, pdfPngBase, 96);

    const similarityPct = computeImageSimilarity(screenShotPath, `${pdfPngBase}.png`);
    parityResults.push({ id: sampleId, pdfPages: getPdfPages(pdfPath), pixelSimilarityPct: similarityPct });
    if (similarityPct < 95.0) {
      failures.push({ id: sampleId, errors: [`Pixel parity ${similarityPct}% < 95%`] });
    }
  }
  await parityPage.close();

  await browser.close();
  server.close();

  fs.rmSync(tmpPdfDir, { recursive: true, force: true });

  const minPages = Math.min(...results.map((r) => r.pdfPages));
  const maxPages = Math.max(...results.map((r) => r.pdfPages));
  const exactMatches = results.filter((r) => r.screenPages === r.pdfPages).length;

  const report = {
    totalTemplates: templates.length,
    checked: results.length,
    exactScreenPdfPageMatches: exactMatches,
    minPages,
    maxPages,
    failures,
    fileCheckErrors,
    parityResults,
  };
  fs.writeFileSync(path.join(root, 'tests', 'render-report.json'), JSON.stringify(report, null, 2) + '\n');

  console.log(`Rendered ${results.length}/${templates.length} templates via Chrome headless. Pages: ${minPages}–${maxPages}. Exact screen===PDF page count: ${exactMatches}/${templates.length}.`);
  console.log(`file:// fallback check: ${fileCheckErrors.length === 0 ? 'PASSED (3/3)' : 'FAILED'}`);
  console.log(`Pixel-Diff Screen vs PDF Page 1 Parity:`, JSON.stringify(parityResults));

  if (failures.length > 0 || fileCheckErrors.length > 0) {
    console.error('FAILURES:', JSON.stringify({ failures, fileCheckErrors }, null, 2));
    process.exit(1);
  }
}

main();
