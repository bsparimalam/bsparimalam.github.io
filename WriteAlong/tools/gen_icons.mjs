import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'app/icon.svg'), 'utf8');

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent">${svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: path.join(root, `app/icon-${size}.png`), omitBackground: true });
}
await browser.close();
console.log('Generated app/icon-192.png and app/icon-512.png via headless Chrome');
