# Cyprus Lifestyle — Editorial Engine · Increment 3.1 (Planner resilience)

Fixes "Planned: 0 ideas" when web search is unavailable, and surfaces the real reason.

Files (replace the versions from Inc 3 / Inc 4):

    lib/editorial/plan.ts               ← if a web-search run returns nothing usable,
                                          auto-retry the section WITHOUT web search
    components/admin/PlannerControls.tsx ← show the actual error when 0 ideas, and note
                                          when it fell back to offline research

## Deploy
Code only (GitHub → Vercel). No SQL, no env changes.

## What changed
- The planner now makes a section's ideation call and, if web search was on but the
  call errored or returned no usable ideas (e.g. the Anthropic web_search tool isn't
  enabled on the account, or its answer was truncated), it retries that same section
  once WITHOUT web search — so a section is never silently skipped.
- The cockpit's status line now appends the first section error when nothing was
  created, and notes "web search unavailable, used offline research" when it fell back.

## After deploying
Run the planner again with Web-search research left ON — it will now produce ideas
either way, and tell you if web search is unavailable. To use live web research,
enable the web_search tool on your Anthropic account (or ask me to wire Tavily/Brave
instead).

Verified locally: `tsc` clean · all 25 test suites pass.
