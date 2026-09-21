// lib/jobs.handlers.ts — registers real background-job handlers (roadmap item 01).
// Imported for its side effects by /api/cron/worker. Kept separate from lib/jobs.ts
// so that heavy engines (scrapers, enrichers, mail) are only pulled into the worker,
// not into every module that merely enqueues work.
//
// The core 'noop' and 'housekeeping' handlers already live in lib/jobs.ts. Add new
// kinds here as later roadmap items need them, e.g.:
//
//   import { registerJob } from '@/lib/jobs';
//   import { enrichOneListing } from '@/lib/enrich';
//   registerJob('enrich_listing', async (payload) => {
//     await enrichOneListing(String(payload.slug));   // throw to retry with backoff
//   });
//
// Enqueue it from anywhere with:
//   import { enqueue } from '@/lib/jobs';
//   await enqueue('enrich_listing', { slug }, { dedupeKey: `enrich:${slug}`, priority: 1 });
import 'server-only';
export {}; // no extra handlers registered yet — the queue is live and inert until used
