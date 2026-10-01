// GET /about — DisrBin in a few lines.
import { page, ICONS, TTL_MS, MAX_BYTES } from "./_shared.mjs";
import { LANGUAGE_IDS } from "./_highlight.mjs";

const svg = (d) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const languages = LANGUAGE_IDS.length - 1;
const hours = TTL_MS / 3600000;

const features = [
  [svg('<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13.5 5l-3 14"/>'), "Automatic highlighting", "The language is recognised and coloured as you paste."],
  [svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), "Self-destructing", `Every paste is deleted after ${hours} hours.`],
  [svg('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'), "Private links", "Unguessable, unlisted and never indexed."],
  [svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), "Built for reading", "Line numbers, light and dark themes, copy and raw view."],
];

const stats = [
  [`${hours}h`, "lifetime"],
  [`${MAX_BYTES / 1024} KB`, "per paste"],
  [`${languages}+`, "languages"],
];

export default async () =>
  page({
    title: "About · DisrBin",
    plain: true,
    publicPath: "/about",
    description: "DisrBin is a fast, private paste bin: code is coloured automatically, links cannot be guessed, and every paste is deleted after 24 hours.",
    body: `<main class="about">
<div class="about-inner">
  <section class="hero">
    <h1>Paste code. Share a link.<br><span class="grad">Gone in a day.</span></h1>
    <p class="lead">DisrBin is a fast, private paste bin. Paste your code, get a short link, and it is deleted ${hours} hours later.</p>
    <div class="cta"><a class="btn btn-primary btn-lg" href="/">${ICONS.plus}<span class="label">New paste</span></a></div>
  </section>

  <ul class="stats">
${stats.map(([n, l]) => `    <li><b>${n}</b><span>${l}</span></li>`).join("\n")}
  </ul>

  <ul class="cards">
${features.map(([i, h, p]) => `    <li><span class="ic">${i}</span><h3>${h}</h3><p>${p}</p></li>`).join("\n")}
  </ul>
</div>
</main>`,
  });

export const config = { path: "/about", method: "GET" };
