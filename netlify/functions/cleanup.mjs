// Runs hourly and deletes pastes whose day is up, so an unread paste does
// not linger past its expiry.
import { store } from "./_shared.mjs";

export default async () => {
  const s = store();
  const { blobs } = await s.list();
  const now = Date.now();
  let deleted = 0;
  for (const { key } of blobs) {
    const meta = await s.getMetadata(key);
    if (!meta || Number(meta.metadata?.expires || 0) <= now) {
      await s.delete(key);
      deleted++;
    }
  }
  console.log(`cleanup: ${deleted} of ${blobs.length} deleted`);
};

export const config = { schedule: "@hourly" };
