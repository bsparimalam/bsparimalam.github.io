import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fontsDir = path.join(root, 'runtime', 'fonts');
const licensesDir = path.join(fontsDir, 'LICENSES');

fs.mkdirSync(fontsDir, { recursive: true });
fs.mkdirSync(licensesDir, { recursive: true });

const FAMILIES = [
  { pkg: 'eb-garamond', name: 'EB Garamond', weights: [400, 600, 700], italics: [400, 700] },
  { pkg: 'cormorant-garamond', name: 'Cormorant Garamond', weights: [400, 600, 700], italics: [400, 700] },
  { pkg: 'libre-baskerville', name: 'Libre Baskerville', weights: [400, 700], italics: [400] },
  { pkg: 'crimson-pro', name: 'Crimson Pro', weights: [400, 600, 700], italics: [400, 600] },
  { pkg: 'playfair-display', name: 'Playfair Display', weights: [400, 700], italics: [400, 700] },
  { pkg: 'lora', name: 'Lora', weights: [400, 600, 700], italics: [400, 600] },
  { pkg: 'merriweather', name: 'Merriweather', weights: [400, 700], italics: [400] },
  { pkg: 'source-serif-4', name: 'Source Serif 4', weights: [400, 600, 700], italics: [400, 600] },
  { pkg: 'inter', name: 'Inter', weights: [400, 500, 600, 700], italics: [] },
  { pkg: 'source-sans-3', name: 'Source Sans 3', weights: [400, 600, 700], italics: [400] },
  { pkg: 'work-sans', name: 'Work Sans', weights: [400, 600, 700], italics: [400] },
  { pkg: 'montserrat', name: 'Montserrat', weights: [400, 600, 700], italics: [400] },
  { pkg: 'raleway', name: 'Raleway', weights: [400, 600, 700], italics: [400] },
  { pkg: 'ibm-plex-sans', name: 'IBM Plex Sans', weights: [400, 600, 700], italics: [400] },
  { pkg: 'ibm-plex-serif', name: 'IBM Plex Serif', weights: [400, 600, 700], italics: [400] },
  { pkg: 'ibm-plex-mono', name: 'IBM Plex Mono', weights: [400, 600], italics: [] },
  { pkg: 'jetbrains-mono', name: 'JetBrains Mono', weights: [400, 600, 700], italics: [] },
  { pkg: 'space-grotesk', name: 'Space Grotesk', weights: [400, 600, 700], italics: [] },
  { pkg: 'special-elite', name: 'Special Elite', weights: [400], italics: [] },
  { pkg: 'courier-prime', name: 'Courier Prime', weights: [400, 700], italics: [400] },
  { pkg: 'oswald', name: 'Oswald', weights: [400, 600, 700], italics: [] },
  { pkg: 'bebas-neue', name: 'Bebas Neue', weights: [400], italics: [] },
  { pkg: 'caveat', name: 'Caveat', weights: [400, 700], italics: [] },
  { pkg: 'cinzel', name: 'Cinzel', weights: [400, 600, 700], italics: [] },
  { pkg: 'dm-sans', name: 'DM Sans', weights: [400, 500, 700], italics: [400] },
];

let totalBytes = 0;
let fileCount = 0;
const cssLines = ['/* Write Along Bundled Open-License Fonts (Latin subset, woff2) */\n'];
const fontManifest = {};

for (const fam of FAMILIES) {
  const pkgDir = path.join(root, 'node_modules', '@fontsource', fam.pkg);
  if (!fs.existsSync(pkgDir)) {
    console.warn(`Missing @fontsource/${fam.pkg}`);
    continue;
  }

  // Copy license
  const licFile = fs.existsSync(path.join(pkgDir, 'LICENSE'))
    ? path.join(pkgDir, 'LICENSE')
    : fs.existsSync(path.join(pkgDir, 'LICENSE.md'))
    ? path.join(pkgDir, 'LICENSE.md')
    : null;
  if (licFile) {
    fs.copyFileSync(licFile, path.join(licensesDir, `${fam.pkg}.LICENSE.txt`));
  }

  const filesDir = path.join(pkgDir, 'files');
  const famFiles = [];

  const copyVariant = (weight, style) => {
    const srcName = `${fam.pkg}-latin-${weight}-${style}.woff2`;
    const srcPath = path.join(filesDir, srcName);
    if (!fs.existsSync(srcPath)) return;
    const dstPath = path.join(fontsDir, srcName);
    fs.copyFileSync(srcPath, dstPath);
    const sz = fs.statSync(dstPath).size;
    totalBytes += sz;
    fileCount++;
    famFiles.push({ file: srcName, weight, style });
    cssLines.push(
`@font-face {
  font-family: '${fam.name}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('./${srcName}') format('woff2');
}
`
    );
  };

  for (const w of fam.weights) copyVariant(w, 'normal');
  for (const w of fam.italics) copyVariant(w, 'italic');

  fontManifest[fam.name] = famFiles;
}

fs.writeFileSync(path.join(fontsDir, 'fonts.css'), cssLines.join('\n'));
fs.writeFileSync(path.join(fontsDir, 'manifest.json'), JSON.stringify(fontManifest, null, 2) + '\n');
console.log(`Bundled ${fileCount} woff2 files across ${Object.keys(fontManifest).length} families: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
