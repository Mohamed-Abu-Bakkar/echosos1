/**
 * Post-build step for Capacitor Android.
 *
 * Next.js static export writes absolute asset paths like
 *   <link rel="stylesheet" href="/_next/static/chunks/xxxx.css">
 * On Android's file:// WebView those resolve to file:///_next/... which
 * doesn't exist. Rewrite them to relative paths so they resolve against
 * the app's asset root (file:///android_asset/public/...).
 *
 * Run after `npm run build`:
 *   node scripts/fix-capacitor-paths.js
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "out");
const ASSET_PREFIX = 'href="/_next/';
const REPLACEMENT = 'href="./_next/';

function rewriteHtml(filePath) {
  let html = readFileSync(filePath, "utf8");
  let changed = false;

  // Rewrite stylesheet hrefs
  const before = html;
  html = html.replace(new RegExp(ASSET_PREFIX, "g"), REPLACEMENT);
  if (html !== before) changed = true;

  // Rewrite script srcs too
  const before2 = html;
  html = html.replace(new RegExp('src="/_next/', "g"), 'src="./_next/');
  if (html !== before2) changed = true;

  // Add a base tag so all relative assets resolve against the asset root
  if (!html.includes('<base')) {
    html = html.replace("<head>", '<head><base href="./">');
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, html);
    console.log(`Patched ${filePath}`);
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) rewriteHtml(full);
  }
}

if (!mkdirSync) {} // no-op
walk(OUT_DIR);
console.log("Done.");
