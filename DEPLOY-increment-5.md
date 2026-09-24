# Cyprus Lifestyle — Editorial Engine · Increment 5 (The House Book — highest-level, undetectable writing)

Raises the WRITING to NYT / Vogue / Washington Post standard, per franchise, and makes
it undetectable as AI in all seven languages.

Files (repo paths preserved):

    lib/editorial/craft.ts                 ← NEW: per-franchise formats, house style,
                                             anti-AI rules + deterministic scrubber + tell linter
    lib/editorial/generate.ts              ← draft, translate and a NEW polish pass now
                                             apply the House Book and scrub every output
    app/api/editorial/polish/route.ts      ← NEW key-gated editing pass (?key=…&id=…&locale=…)
    scripts/tests/editorial-craft.test.ts  ← 26 unit assertions

## Deploy
Code only (GitHub → Vercel). No SQL, no env changes. Requires Increments 1/3/4 deployed.

## What changed — automatically, on every new piece
1. REDACTIONAL FORMAT per franchise. Each column is now written to its real architecture:
   - The Tastemakers → scene-set opening · who & why now · the conversation as narrative
     with verbatim quotes · a turn · a resonant close (never a summary).
   - Five Minutes With → standfirst · 5–7 sharp Q&As · a kicker.
   - Behind the Business / The Maker → founder & craft profiles with the hard specifics.
   - At the Table → arrival · the food dish by dish · the verdict.
   - The Concierge Meets → the service interview. The Power List → ranked, opinionated.
2. HOUSE STYLE. Reported, specific, a point of view, not a wasted word — the NYT/Vogue/WaPo bar.
3. ANTI-AI, and undetectable:
   - NO em dashes (—) anywhere. A deterministic scrubber guarantees it even if the model slips
     (it also preserves number ranges like 9–11 and paragraph breaks).
   - ~45 tell-tale AI phrases banned ("nestled", "hidden gem", "boasts", "in the heart of",
     "a testament to", "vibrant", "seamless", "delve into", …), plus varied human rhythm,
     no formulaic tricolons, no summary conclusions.
   - Applied in ALL 7 EDITIONS: the translation step writes each language as a native
     journalist would and scrubs it too, so no edition reads as machine-made.

## The polish pass (the pipeline's "editing" stage)
For an extra lift on any draft, run:
    /api/editorial/polish?key=PASTE_YOUR_ENRICH_SECRET&id=<blog_post_id>&locale=en
It scores the draft for AI tells, tells the model exactly what to remove, rewrites to the
format + standard, scrubs, and reports tells before/after. Run per locale (en, el, ro, ar,
de, pl, ru). Safe to run more than once.

Note: new drafts get all of the above automatically. Your 71 existing articles aren't
retroactively changed — polish them with the route above if you want them lifted too.

Verified locally: `tsc` clean · all 26 test suites pass (editorial-craft.pure 26/26).
