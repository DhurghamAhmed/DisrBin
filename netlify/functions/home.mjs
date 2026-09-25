// GET / — the editor: an empty CodeMirror, save, and off to the paste's link.
import { page } from "./_shared.mjs";
import { LANGUAGE_IDS, languageName } from "./_highlight.mjs";

const options = ['<option value="">Auto</option>']
  .concat(LANGUAGE_IDS.map((id) => `<option value="${id}">${languageName(id)}</option>`))
  .join("");

export default async () =>
  page({
    title: "DisrBin — Paste code, share a link",
    publicPath: "/",
    body: `<main id="app" class="edit"></main>`,
    foot: `<span id="pos">Ln 1, Col 1</span><span class="sep">·</span><span id="size">0 B</span><span class="sep extra">·</span><label class="lang extra">Language <select id="lang">${options}</select></label>`,
  });

export const config = { path: "/", method: "GET" };
