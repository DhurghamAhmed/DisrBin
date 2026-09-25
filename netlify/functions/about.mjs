// GET /about — DisrBin at a glance.
import { page, TTL_MS, MAX_BYTES } from "./_shared.mjs";
import { LANGUAGE_IDS } from "./_highlight.mjs";

const svg = (d) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const features = [
  [svg('<path d="m8 9-4 3 4 3M16 9l4 3-4 3M13.5 5l-3 14"/>'), "Auto highlighting", "Code is recognised and coloured as you paste."],
  [svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), "Self-destructing", "Every paste is deleted after 24 hours."],
  [svg('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'), "Private links", "Unguessable, unlisted and never indexed."],
  [svg('<path d="M4 17h16M4 12h16M4 7h10"/>'), "Raw & copy", "One click to copy, or open the raw text."],
];

const stats = [
  [`${TTL_MS / 3600000}h`, "lifetime"],
  [`${MAX_BYTES / 1024} KB`, "per paste"],
  [`${LANGUAGE_IDS.length - 1}+`, "languages"],
];

export default async () =>
  page({
    title: "About · DisrBin",
    plain: true,
    publicPath: "/about",
    description: "DisrBin is a fast, private paste bin: code is coloured automatically, links cannot be guessed, and every paste is deleted after 24 hours.",
    body: `<main class="about">
  <section class="hero">
    <img class="hero-logo on-light" src="/logo-light.png" alt="DisrBin" width="240" height="53">
    <img class="hero-logo on-dark" src="/logo-dark.png" alt="DisrBin" width="240" height="53">
    <p class="tagline">Paste code. Share a link. Gone in a day.</p>
  </section>
  <ul class="stats">
${stats.map(([n, l]) => `    <li><b>${n}</b><span>${l}</span></li>`).join("\n")}
  </ul>
  <ul class="cards">
${features.map(([i, h, p]) => `    <li><span class="ic">${i}</span><h2>${h}</h2><p>${p}</p></li>`).join("\n")}
  </ul>
</main>`,
  });

export const config = { path: "/about", method: "GET" };
