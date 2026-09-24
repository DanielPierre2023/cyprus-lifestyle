# Cyprus Lifestyle — Editorial Engine · Increment 3.2 (Tavily web research)

Adds Tavily as the planner's primary live-research source. SUPERSEDES Increment 3.1
(it includes the same resilience) — deploy these three files and you're current.

Files (repo paths preserved):

    lib/editorial/search.ts              ← NEW: Tavily research helper (graceful, never throws)
    lib/editorial/plan.ts                ← REPLACES Inc 3 / 3.1: Tavily → Anthropic tool → offline
    components/admin/PlannerControls.tsx  ← REPLACES Inc 3 / 3.1: shows the research source used

## One-time setup — get a free Tavily key (you do this; I never handle keys)
1. Sign up at https://app.tavily.com (free tier = 1,000 searches/month).
2. Copy your API key (starts with `tvly-`).
3. Vercel → your project → Settings → Environment Variables → add
   TAVILY_API_KEY = tvly-...  (Production + Preview), then redeploy.

## Deploy
Code only (GitHub → Vercel). No SQL. No other env changes.

## How research now resolves (per section, automatically)
1. If TAVILY_API_KEY is set → Tavily runs the section's research queries and the digest
   grounds the ideas. The cockpit shows "· researched via Tavily".
2. Else if Anthropic web_search is enabled on your account → it uses that.
3. Else → season + your 14,671 businesses only.
If a web run returns nothing usable, it retries the section fully offline, so you never
get a silent "0". The Idea Board and each idea's stored signals record the source.

## After deploying
Editorial Plan → leave "Web-search research" ON → Run planner. You should see ideas,
with "researched via Tavily" in the status line. (Tavily calls are fast, so each run
also covers more sections than the failing Anthropic-tool attempts did.)

Verified locally: `tsc` clean · all 25 test suites pass.
