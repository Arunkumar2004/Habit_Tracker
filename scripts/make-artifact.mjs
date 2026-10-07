// Usage: npm run build:artifact   (vite build --mode artifact, then this script)
//
// Turns the single-file build (dist-artifact/index.html, made by vite-plugin-singlefile) into page content for a
// claude.ai Artifact: dist-artifact/runway-os.html with no <!doctype>, <html>, <head> or <body> tags. Order:
//   <title>, Google Fonts <link> tags, inlined <style> blocks, <div id="root"></div>, inlined module <script>.
// Fails loudly (exit 1) if any part is missing or the build still points at an external script or stylesheet.
// No dependencies.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'dist-artifact/index.html');
const out = resolve(root, 'dist-artifact/runway-os.html');

function fail(msg) {
  console.error(`make-artifact: ${msg}`);
  process.exit(1);
}

let html;
try {
  html = readFileSync(src, 'utf8');
} catch {
  fail(`cannot read ${src}. Run "npm run build:artifact" first.`);
}

const title = html.match(/<title>[\s\S]*?<\/title>/i)?.[0];
if (!title) fail('no <title> in dist-artifact/index.html');

const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
const fontLinks = links.filter((l) => /fonts\.(googleapis|gstatic)\.com/i.test(l));
if (!fontLinks.some((l) => /rel=["']?stylesheet/i.test(l) && /fonts\.googleapis\.com/i.test(l))) {
  fail('no Google Fonts stylesheet <link> in dist-artifact/index.html');
}
const otherSheets = links.filter((l) => /rel=["']?stylesheet/i.test(l) && !/fonts\.googleapis\.com/i.test(l));
if (otherSheets.length) fail(`external stylesheet not inlined: ${otherSheets[0]}`);

const styles = [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]);
if (!styles.length) fail('no inlined <style> in dist-artifact/index.html (is vite-plugin-singlefile active?)');

if (!/<div id=["']root["']\s*>\s*<\/div>/i.test(html)) fail('no <div id="root"></div> in dist-artifact/index.html');

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const external = scripts.find((m) => /\bsrc\s*=/i.test(m[1]));
if (external) fail(`external script not inlined: <script${external[1]}>`);
const modules = scripts.filter((m) => /type=["']?module/i.test(m[1]) && m[2].trim().length > 0);
if (!modules.length) fail('no inlined <script type="module"> in dist-artifact/index.html');

const page = [
  title,
  ...fontLinks,
  ...styles,
  '<div id="root"></div>',
  ...modules.map((m) => m[0]),
].join('\n') + '\n';

for (const tag of ['<!doctype', '<html', '<head', '<body']) {
  // Only checks the page skeleton outside the script/style bodies, which may legitimately mention these strings.
  const outside = page.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  if (outside.toLowerCase().includes(tag)) fail(`output still contains ${tag}`);
}

writeFileSync(out, page, 'utf8');
const bytes = Buffer.byteLength(page, 'utf8');
const kb = (bytes / 1024).toFixed(1);
console.log(`make-artifact: wrote dist-artifact/runway-os.html (${kb} KB, ${bytes} bytes; source ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} KB)`);
if (bytes > 16 * 1024 * 1024) fail('output is over the 16 MB artifact limit');
