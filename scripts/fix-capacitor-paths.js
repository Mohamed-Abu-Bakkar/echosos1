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

const { readdirSync, readFileSync, writeFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const OUT_DIR = join(process.cwd(), "out");

function rewriteHtml(filePath) {
  let html = readFileSync(filePath, "utf8");
  let changed = false;

  const beforeHref = html;
  html = html.replace(/href="\/_next\//g, 'href="./_next/');
  if (html !== beforeHref) changed = true;

  const beforeSrc = html;
  html = html.replace(/src="\/_next\//g, 'src="./_next/');
  if (html !== beforeSrc) changed = true;

  // Remove async/defer from Next.js chunk script tags so scripts execute in
  // order during HTML parsing (where document.currentScript is reliably set).
  // With defer/async, document.currentScript is null when Turbopack's
  // TURBOPACK.push runs, crashing e.getAttribute("src") and preventing
  // React hydration entirely.
  const beforeAsync = html;
  html = html.replace(/<script([^>]*src="\.\/_next\/[^"]*"[^>]*)async=""([^>]*)>/g, '<script$1$2>');
  html = html.replace(/<script([^>]*src="\.\/_next\/[^"]*"[^>]*)async([^>]*)>/g, '<script$1$2>');
  html = html.replace(/<script([^>]*src="\.\/_next\/[^"]*"[^>]*)defer=""([^>]*)>/g, '<script$1$2>');
  html = html.replace(/<script([^>]*src="\.\/_next\/[^"]*"[^>]*)defer([^>]*)>/g, '<script$1$2>');
  if (html !== beforeAsync) changed = true;

  // Inject a script at the top of <head> that defines document.currentScript
  // as a getter returning the currently executing script element. This is
  // needed because Chrome headless (and the Android WebView) do not set
  // document.currentScript during script execution, which causes the
  // Turbopack runtime to crash when it calls e.getAttribute("src") on null.
  const currentScriptInject = '<script>(function(){try{Object.defineProperty(document,"currentScript",{configurable:!0,get:function(){const s=document.getElementsByTagName("script");for(let i=s.length-1;i>=0;i--)if(s[i].src)return s[i];return null}})})catch(e){}})();</script>';
  if (!html.includes(currentScriptInject)) {
    html = html.replace("<head>", "<head>" + currentScriptInject);
    changed = true;
  }

  if (!html.includes('<base href="./">')) {
    html = html.replace("<head>", '<head><base href="./">');
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, html);
    console.log(`Patched ${filePath}`);
  }
}

function walk(dir) {
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
