// Retired. The AI desk runs on Supabase, in the edge function `process-scraped-article` (source: scripts/edge/process-scraped-article.src.ts):
// fact core → seven independent native editions → per-edition fact check → publish bar. The scheduler reaches it through
// app/api/cron/process, the admin "Generate" button calls it directly.
//
// The desk that used to live here wrote an English draft and TRANSLATED it into six languages, had no fact check, and when a translation
// failed it filled the edition with the English text. Nothing imports this file any more; it stays as an empty module only so that an
// old checkout which still has the file does not break. It can be deleted.
export {};
