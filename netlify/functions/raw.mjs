// GET /:id/raw — the paste as plain text, for programs and copying.
import { loadPaste, notFound, pasteHeaders } from "./_shared.mjs";

export default async (req, context) => {
  const paste = await loadPaste(context.params.id);
  if (!paste) return notFound();
  return new Response(paste.text, {
    headers: {
      ...pasteHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      // Plain text only: even a paste full of HTML can never run as a page.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const config = { path: "/:id/raw", method: "GET" };
