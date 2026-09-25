// POST /api/paste — the bot creates a paste, authorised by PASTE_SECRET.
// Body: {"content": "...", "language": "go"}, language optional. No rate limit: the bot limits its own users.
import { authorized, savePaste } from "./_shared.mjs";

export default async (req) => {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const saved = await savePaste(req);
  if (saved.error) return saved.error;
  return Response.json(saved, { status: 201, headers: { "Cache-Control": "no-store" } });
};

export const config = { path: "/api/paste", method: "POST" };
