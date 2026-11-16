/* Build step: compute sha256 hashes for every *executing* inline <script> in
   dist/*.html and inject them into dist/_headers, replacing the
   __CSP_INLINE_SCRIPT_HASHES__ placeholder in the script-src directive.

   This removes the need for script-src 'unsafe-inline': inline scripts stay
   allowed only by exact content hash, so any injected/modified inline script
   is blocked by CSP (completes F-43/F-44). Hashes are recomputed from the
   actual build output on every build, so they self-heal when scripts change.

   Data blocks that browsers never execute are intentionally skipped:
   type="application/ld+json" (structured data), type="text/svg-template"
   (client-side SVG template read via textContent), importmap, speculationrules. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const SKIP_TYPES = new Set([
  'application/ld+json',
  'text/svg-template',
  'importmap',
  'speculationrules'
]);
const PLACEHOLDER = '__CSP_INLINE_SCRIPT_HASHES__';

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const hashes = new Set();
let htmlFiles = 0;
for (const p of walk(dist)) {
  if (!p.endsWith('.html')) continue;
  htmlFiles++;
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const tm = /(?:^|\s)type\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
    if (tm && SKIP_TYPES.has(tm[1].toLowerCase())) continue;
    hashes.add(createHash('sha256').update(m[2], 'utf8').digest('base64'));
  }
}

if (htmlFiles === 0) {
  console.error('csp-hashes: no HTML files found in dist/ — run `astro build` first');
  process.exit(1);
}

const headersPath = join(dist, '_headers');
let headers;
try {
  headers = readFileSync(headersPath, 'utf8');
} catch (e) {
  console.error('csp-hashes: dist/_headers not found — public/_headers missing?');
  process.exit(1);
}
if (!headers.includes(PLACEHOLDER)) {
  console.error('csp-hashes: dist/_headers has no __CSP_INLINE_SCRIPT_HASHES__ placeholder');
  process.exit(1);
}

const directive = [...hashes].map(h => `'sha256-${h}'`).join(' ');
headers = headers.replace(PLACEHOLDER, directive);
writeFileSync(headersPath, headers);
console.log(`csp hashes: ${hashes.size} inline script hash(es) across ${htmlFiles} page(s)`);
