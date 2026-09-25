// POST /api/new — the site's own editor creates a paste. Anyone may, so
// Netlify caps it per visitor. Only same-origin pages can call it: a JSON
// body needs a CORS preflight, and this answers none.
import { savePaste } from "./_shared.mjs";

export default async (req) => {
  if (!(req.headers.get("content-type") || "").startsWith("application/json")) {
    return Response.json({ error: "json only" }, { status: 415 });
  }
  const saved = await savePaste(req);
  if (saved.error) return saved.error;
  return Response.json(saved, { status: 201, headers: { "Cache-Control": "no-store" } });
};

export const config = {
  path: "/api/new",
  method: "POST",
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
