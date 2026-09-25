// POST /api/detect — names the language of what is in the editor, so the
// editor can colour it as it is typed with the same guess the saved page
// will make. Nothing is stored.
import { detect, languageName, cmMode } from "./_highlight.mjs";

// The start of a text is enough to tell its language.
const SAMPLE_CHARS = 16 * 1024;

export default async (req) => {
  if (!(req.headers.get("content-type") || "").startsWith("application/json")) {
    return Response.json({ error: "json only" }, { status: 415 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const text = typeof body?.content === "string" ? body.content.slice(0, SAMPLE_CHARS) : "";
  const language = text.trim() ? detect(text) : "plaintext";
  const { mode, mime } = cmMode(language);
  return Response.json(
    { language, name: languageName(language), mode, mime },
    { headers: { "Cache-Control": "no-store" } },
  );
};

export const config = {
  path: "/api/detect",
  method: "POST",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
