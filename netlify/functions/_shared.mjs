// Shared by the paste functions: storage, IDs, limits and the page shell.
import { getStore } from "@netlify/blobs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { isLanguage } from "./_highlight.mjs";

// Every paste lives for one day, then is gone.
export const TTL_MS = 24 * 60 * 60 * 1000;
// Telegram messages top out at 4096 characters; this leaves room for a
// long caption or a pasted file without letting the store be flooded.
export const MAX_BYTES = 256 * 1024;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const ID_RE = /^[A-Za-z0-9]{8}$/;

export const store = () => getStore({ name: "pastes", consistency: "strong" });

// newId draws eight characters from an alphabet without look-alikes:
// about 10^14 possibilities, so pastes cannot be found by guessing.
export function newId() {
  const bytes = randomBytes(8);
  let id = "";
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}

// authorized checks the bot's secret in constant time.
export function authorized(req) {
  const secret = process.env.PASTE_SECRET || "";
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

// savePaste validates and stores a paste for one day. It returns the new
// paste, or an error response to send back.
export async function savePaste(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return { error: Response.json({ error: "invalid json" }, { status: 400 }) };
  }
  const content = typeof body?.content === "string" ? body.content : "";
  if (!content.trim()) return { error: Response.json({ error: "empty" }, { status: 400 }) };
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_BYTES) return { error: Response.json({ error: "too large", max: MAX_BYTES }, { status: 413 }) };
  // A named language is kept only if known; anything else is detected on view.
  const language = isLanguage(body.language) ? body.language : "";

  const now = Date.now();
  const s = store();
  let id = newId();
  // A collision is astronomically unlikely; check anyway rather than overwrite.
  for (let i = 0; i < 3 && (await s.getMetadata(id)); i++) id = newId();
  const meta = { created: now, expires: now + TTL_MS, bytes, lines: content.split("\n").length, language };
  await s.set(id, content, { metadata: meta });
  return { id, expires: meta.expires };
}

// loadPaste returns a live paste, deleting it if its day is up.
export async function loadPaste(id) {
  if (!ID_RE.test(id)) return null;
  const s = store();
  const found = await s.getWithMetadata(id, { type: "text" });
  if (!found) return null;
  const expires = Number(found.metadata?.expires || 0);
  if (!expires || Date.now() >= expires) {
    await s.delete(id);
    return null;
  }
  return { text: found.data, meta: found.metadata };
}

export const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Headers every paste response carries: no caching past its life, no
// indexing, and nothing it contains may run.
export const pasteHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

// CodeMirror and its modes come from cdnjs, pinned; everything else is ours.
export const CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20";
export const PAGE_CSP =
  "default-src 'none'; script-src 'self' https://cdnjs.cloudflare.com; " +
  "style-src 'self' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
  "connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const FONTS = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap";

// Icons, drawn inline so the page loads no icon font.
const icon = (paths) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const ICONS = {
  save: icon('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  copy: icon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  raw: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>'),
  link: icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  wrap: icon('<path d="M3 6h18M3 12h15a3 3 0 1 1 0 6h-4M3 18h7"/><path d="m16 16-2 2 2 2"/>'),
  sun: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: icon('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
};

const button = (id, title, svg, extra = "") =>
  `<button class="action" type="button" id="${id}" title="${title}" aria-label="${title}" ${extra}>${svg}</button>`;

// The shell: the bar with the mark and the actions, the content, and the
// status footer. view, when given, is the paste being shown, whose path
// sits in the bar as a link to copy.
// DESCRIPTION is what search engines and link previews show for the site.
export const DESCRIPTION =
  "Paste code and share it with a short link. Automatic syntax highlighting for 30+ languages, light and dark themes, and every paste deletes itself after 24 hours.";

// seo returns the tags that let a public page be found and previewed:
// description, canonical address and the card shown when its link is shared.
function seo(title, description, path) {
  const site = (process.env.URL || "").replace(/\/$/, "");
  const url = site + path;
  const t = escapeHTML(title), d = escapeHTML(description);
  return `<meta name="description" content="${d}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="DisrBin">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${site}/og.png">
<meta name="theme-color" content="#21252B">`;
}

// page wraps a view in the app shell. Only pages given a public path are
// indexed; pastes and errors stay out of search engines.
export function page({ title, body, status = 200, view = null, foot = "", plain = false, publicPath = null, description = DESCRIPTION }) {
  const crumb = view
    ? `<a class="crumb" id="crumb" href="/${view.id}" title="Copy link"><span class="path">/${view.id}</span>${ICONS.link}</a>`
    : "";
  const actions = plain
    ? ""
    : view
    ? button("copy", "Copy text", ICONS.copy) +
      `<a class="action" id="raw" href="/${view.id}/raw" title="Raw text" aria-label="Raw text">${ICONS.raw}</a>`
    : button("save", "Save (Ctrl+S)", ICONS.save, "disabled");
  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="${publicPath ? "index, follow" : "noindex, nofollow"}">
<meta name="color-scheme" content="light dark">
<title>${escapeHTML(title)}</title>
${publicPath ? seo(title, description, publicPath) : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${CDN}/codemirror.min.css">
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script src="/theme.js"></script>
</head>
<body>
<header class="bar">
  <a class="brand" href="/" aria-label="DisrBin home"><img class="logo on-light" src="/logo-light.png" alt="DisrBin" width="118" height="26"><img class="logo on-dark" src="/logo-dark.png" alt="DisrBin" width="118" height="26"></a>
  ${crumb}
  <div class="actions">
    ${actions}
    <a class="action" id="new" href="/" title="New paste" aria-label="New paste">${ICONS.plus}</a>
    ${plain ? "" : button("wrap", "Wrap lines", ICONS.wrap, 'aria-pressed="false"')}
    <span class="divider" aria-hidden="true"></span>
    ${button("theme", "Switch theme", ICONS.sun.replace("<svg ", '<svg class="sun" ') + ICONS.moon.replace("<svg ", '<svg class="moon" '))}
  </div>
</header>
${body}
<footer class="foot">
  <span class="credit">Copyright © ${new Date().getUTCFullYear()} <a href="https://idisr.com" target="_blank" rel="noopener" title="idisr.com">Dhurgham</a><span class="sep">·</span><a class="about-link" href="/about">About</a><span class="sep">·</span><span class="made-ai">Built with AI</span></span>
  <span class="status" id="status">${foot}</span>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<script src="${CDN}/codemirror.min.js"></script>
<script src="${CDN}/addon/mode/loadmode.min.js"></script>
<script src="${CDN}/addon/edit/matchbrackets.min.js"></script>
<script src="${CDN}/addon/selection/active-line.min.js"></script>
<script src="${CDN}/addon/display/placeholder.min.js"></script>
<script src="/app.js"></script>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      ...pasteHeaders,
      ...(publicPath ? { "X-Robots-Tag": "index, follow", "Cache-Control": "public, max-age=0, must-revalidate" } : {}),
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": PAGE_CSP,
    },
  });
}

export function notFound() {
  return page({
    title: "DisrBin",
    status: 404,
    plain: true,
    body: `<main class="gone">
  <p class="eyebrow">404</p>
  <h1>Nothing here</h1>
  <p>This paste has expired or never existed. Pastes are deleted 24 hours after they are made.</p>
  <a class="btn" href="/">New paste</a>
</main>`,
  });
}
