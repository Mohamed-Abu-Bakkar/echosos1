#!/usr/bin/env node
/**
 * Fix Capacitor Android static asset paths.
 *
 * Next.js static export writes absolute asset paths like:
 *   <link rel="stylesheet" href="/_next/static/chunks/xxx.css">
 *   <script src="/_next/static/chunks/xxx.js"></script>
 *
 * On Android's file:// WebView, absolute paths resolve to
 * file:///_next/static/... which does not exist. Assets live at
 * file:///android_asset/public/_next/static/...
 *
 * This script rewrites all /_next/ references to ./_next/ and adds
 * <base href="./"> so relative assets resolve correctly.
 *
 * Run after `npm run build`:
 *   node scripts/fix-capacitor-paths.js
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "out");

function rewriteHtml(filePath: string) {
  let html = readFileSync(filePath, "utf8");
  let changed = false;

  // Rewrite stylesheet hrefs from absolute to relative
  const beforeHref = html;
  html = html.replace(/href="\/_next\//g, 'href="./_next/');
  if (html !== beforeHref) changed = true;

  // Rewrite script srcs from absolute to relative
  const beforeSrc = html;
  html = html.replace(/src="\/_next\//g, 'src="./_next/');
  if (html !== beforeSrc) changed = true;

  // Add <base href="./"> if not present (must be right after <head>)
  if (!html.includes('<base href="./">')) {
    html = html.replace("<head>", '<head><base href="./">');
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, html);
    console.log(`Patched ${filePath}`);
  }
}

function walk(dir: string) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".html")) {
      rewriteHtml(full);
    }
  }
}

if (!existsSync(OUT_DIR)) {
  console.error(`Output directory ${OUT_DIR} does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

walk(OUT_DIR);
console.log("Done. All HTML files patched with relative asset paths.");
