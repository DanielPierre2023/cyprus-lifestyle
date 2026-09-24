# Cyprus Lifestyle — Editorial Engine · Increment 3 (AI Planner + web search)

Files (repo paths preserved):

    lib/ai.ts                                   ← adds Anthropic server-side web_search to callClaude
    lib/editorial/planner.ts                    ← pure: Cyprus editorial calendar, prompts, de-dup helpers
    lib/editorial/settings.ts                   ← autonomy + web-search settings (site_settings row)
    lib/editorial/plan.ts                       ← the planner runner (sense→ideate→dedup→queue)
    app/api/editorial/plan/run/route.ts         ← key-gated endpoint (?key=ENRICH_SECRET)
    scripts/tests/editorial-planner.test.ts     ← 27 unit assertions

## Deploy
1. Code → GitHub (Vercel). NO new migration here — it uses Increment 1's
   `editorial_ideas`, `match_editorial_ideas()` and the `editorial_plan` view, so
   deploy Increment 1's SQL first.
2. Env vars already present are reused: CLAUDE_API_KEY (planner + web search),
   OPENAI_API_KEY (embeddings for de-dup), ENRICH_SECRET (the ?key= gate).
   NOTE: web search is Anthropic's billed server-side tool — your Anthropic account
   must have it enabled. If not, the planner still works: set web search off (below)
   and it grounds on the season + your directory instead.

## Run it
- One section, dry run (writes nothing — safe first test):
  /api/editorial/plan/run?key=PASTE_YOUR_ENRICH_SECRET&section=table-fine&dryRun=1
- A real pass (fills the biggest gaps, a few sections per call, self-throttling ~50s):
  /api/editorial/plan/run?key=PASTE_YOUR_ENRICH_SECRET
  Call again while it reports remainingGaps > 0. It is idempotent — de-dup stops it
  proposing anything already published or queued, and a section stops once its
  monthly target is met, so it converges and cannot run away.

## Schedule (Supabase SQL — contains your secret + URL, so run it, don't commit it)
Runs daily 06:00 UTC; each run takes the biggest current gaps and self-limits.
    select cron.schedule('editorial-planner', '0 6 * * *',
      $$ select net.http_post(
           url := 'https://cypruslifestyle.eu/api/editorial/plan/run?key=' || 'PASTE_YOUR_ENRICH_SECRET',
           headers := '{"Content-Type":"application/json"}'::jsonb) $$);

## Autonomy (Daniel's plan: suggest-only week one, then auto-draft)
Default is suggest-only + web-search-on (no row needed). To change later:
    insert into site_settings (key, value)
    values ('editorial', '{"autonomy":"auto-draft","webSearch":true,"ideasPerSection":3,"sectionsPerRun":4}'::jsonb)
    on conflict (key) do update set value = excluded.value;
(Auto-draft takes effect on idea *approval*, which is Increment 4.)

Verified locally: `tsc` clean · 25 test suites pass (editorial-planner.pure 27/27).
