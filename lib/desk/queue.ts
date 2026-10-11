// Retired together with lib/desk/pipeline.ts: the queue is now claimed inside the edge function `process-scraped-article`
// (atomic status change scraped → rewriting, stuck jobs freed by sweep_stuck_rewrite_jobs). Nothing imports this file; it can be deleted.
export {};
