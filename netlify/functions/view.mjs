// GET /:id — a paste, read-only in the same editor, coloured by its language.
import { loadPaste, notFound, page, escapeHTML } from "./_shared.mjs";
import { languageOf, languageName, cmMode, mostlyArabic } from "./_highlight.mjs";

const size = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`);

export default async (req, context) => {
  const id = context.params.id;
  const paste = await loadPaste(id);
  if (!paste) return notFound();

  const { created, expires, bytes, language: hint } = paste.meta;
  const text = paste.text.replace(/\n$/, "");
  const language = languageOf(text, hint, bytes);
  const { mode, mime } = cmMode(language);
  const lines = text.split("\n").length;
  const dir = language === "plaintext" && mostlyArabic(text) ? "rtl" : "ltr";
  const stamp = new Date(created).toISOString();
  const left = Math.max(0, Number(expires) - Date.now());
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
  const ttl = h ? `${h}h ${m}m` : `${Math.max(1, m)}m`;

  return page({
    title: `DisrBin · ${id}`,
    view: { id },
    body: `<main id="app" class="view" data-mode="${mode || ""}" data-mime="${mime || ""}" data-dir="${dir}">
  <textarea id="source" hidden readonly>${escapeHTML(text)}</textarea>
  <pre id="fallback" class="fallback" dir="${dir}">${escapeHTML(text)}</pre>
</main>`,
    foot: `<span class="chip">${languageName(language)}</span><span class="sep"></span><span>${lines} ${lines === 1 ? "line" : "lines"}</span><span class="sep"></span><span>${size(bytes)}</span><span class="sep extra"></span><time class="extra" data-created="${created}" datetime="${stamp}">${stamp.slice(0, 16).replace("T", " ")}</time><span class="sep extra"></span><span class="ttl extra" id="ttl" data-expires="${expires}">Expires in ${ttl}</span>`,
  });
};

export const config = { path: "/:id", excludedPath: ["/about"], method: "GET", preferStatic: true };
