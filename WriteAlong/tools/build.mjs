#!/usr/bin/env node
// Regenerates the precache manifest inside sw.js from the files on disk.
// Run after every change, before deploying:  node tools/build.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Not part of the deployed app.
const EXCLUDE = [/^tools\//, /^\.git/, /^node_modules\//, /^README\.md$/, /^sw\.js$/, /(^|\/)\.[^/]+$/, /\.map$/, /^tests?\//];
// Downloaded only when a feature that needs them is switched on.
const LAZY = [/^vendor\/harper\//];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

const files = walk(root).filter((f) => !EXCLUDE.some((re) => re.test(f))).sort();
const core = {};
const lazy = {};
const all = createHash('sha256');
let coreBytes = 0;
let lazyBytes = 0;
for (const f of files) {
  const data = readFileSync(join(root, f));
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
  all.update(f + hash);
  if (LAZY.some((re) => re.test(f))) { lazy[f] = hash; lazyBytes += data.length; }
  else { core[f] = hash; coreBytes += data.length; }
}
const version = all.digest('hex').slice(0, 10);

const swPath = join(root, 'sw.js');
const sw = readFileSync(swPath, 'utf8');
const block = `// <precache>
const VERSION = '${version}';
const CORE = ${JSON.stringify(core, null, 2)};
const LAZY = ${JSON.stringify(lazy, null, 2)};
// </precache>`;
const next = sw.replace(/\/\/ <precache>[\s\S]*?\/\/ <\/precache>/, block);
if (next === sw && !sw.includes(`VERSION = '${version}'`)) throw new Error('precache markers not found in sw.js');
writeFileSync(swPath, next);

const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
console.log(`Write Along ${version}: ${Object.keys(core).length} core files (${mb(coreBytes)}), ${Object.keys(lazy).length} on-demand files (${mb(lazyBytes)}).`);
