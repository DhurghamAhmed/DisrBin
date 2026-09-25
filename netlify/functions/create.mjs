// POST /api/paste — the bot creates a paste, authorised by PASTE_SECRET.
// Body: {"content": "...", "language": "go"}, language optional. The reply
// names the language the page will colour it as, so the bot can say so.
// No rate limit: the bot limits its own users.
import { authorized, savePaste } from "./_shared.mjs";
import { languageOf, languageName } from "./_highlight.mjs";

export default async (req) => {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const saved = await savePaste(req);
  if (saved.error) return saved.error;
  const language = languageOf(saved.content.replace(/\n$/, ""), saved.meta.language, saved.meta.bytes);
  return Response.json(
    { id: saved.id, expires: saved.expires, language, name: languageName(language) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
};

export const config = { path: "/api/paste", method: "POST" };
