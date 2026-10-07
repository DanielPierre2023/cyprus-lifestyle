# Voice engine — one standard for every published word

**What it does.** Scores every edition of every article with ONE scorer (words, sentence shape, layout, per-language tells), and a background worker rewrites the ones that fail, in the article's own language, one edition per run.

## What it guards
- **No invented facts:** figures, quotes and capitalised names must survive the rewrite; a new figure or four new names reject the rewrite.
- **No copying:** 5-word shingle overlap against the external source must stay ≤ 12 %, no run of 12+ identical words.
- **Must improve:** a rewrite is saved only if its score is lower than before; otherwise nothing changes.
- **Rollback:** every save writes `admin_audit_log` action `voice.repair` with `changes.before` (old title and body).
- **Thin pieces** are reported ("Thin for the … desk"), never padded; they need an editor.

## Controls (signed in to /admin, typed in the address bar)
| Address | Does |
|---|---|
| `/api/admin/voice` | report: how many editions pass, the 15 worst, recent runs |
| `/api/admin/voice?dry=1` | free: score, tells and cost estimate of the next edition |
| `/api/admin/voice?dry=1&id=…&lang=en` | the same for a chosen edition |
| `/api/admin/voice?run=1&id=…&lang=en` | repair that one edition now (one model call, ≈ US$0.03–0.09) |
| `?on=1` / `?off=1` | switch the background worker on / off (default OFF) |
| `?cap=40` | editions per day (default 60) |

Background worker: pg_cron job `cl-voice` (every 10 min) → `/api/cron/voice`; 3 attempts per edition, 2 h apart, then "stuck" = needs an editor.

## Thresholds
`MAX_SCORE` 9 (no high-severity tell), `MAX_OVERLAP` 0.12, `MAX_RUN` 12. Calibrated on real articles: the GESY guide scores 36, the Hannah Rowan article 14, plain human reporting 0.

## Limits (honest)
No tool can guarantee passing every external AI detector; AdSense judges helpfulness and originality. All non-English rules were written by model linguists and need a native-speaker spot check.
