# Voice engine — one standard for every published word

**What it does.** Scores every edition of every article with ONE scorer (words, sentence shape, layout, per-language tells), and a background worker rewrites the ones that fail, in the article's own language, one edition per run.

## What it guards
- **No invented facts:** figures, quotes and capitalised names must survive the rewrite; a new figure or four new names reject the rewrite. Figures are compared as figures, not as strings (`figuresIn` in `lib/voice/guards.ts`): 18:30, 18.30 and 6:30 pm are one time; "19:00" may come back as "ora 19" / "19 Uhr" (a bare 19 never vouches for a new time); 19.00 is 19; 2,5 is 2.5. The title and the other editions of the article attest a figure (the model may write 15 for the spelled-out "cincisprezece" when the title says 15), and a figure in the NEW title is checked as well. A time that really changed (18:30 → 17:30) or dropped times are still rejected.
- **No copying:** 5-word shingle overlap against the external source must stay ≤ 12 %, no run of 12+ identical words.
- **Must really improve:** a rewrite is saved only if its score is lower than before, or, when the score sits at the ceiling of 100, if the weight of the findings is clearly lower (`lib/journalism/progress.ts`: the score stops at 100, the weight does not). Equal is not better; otherwise nothing changes. The same rule decides the Quality tab's Clean and Rewrite and the article desk's sub-editing.
- **Rollback:** every save writes `admin_audit_log` action `voice.repair` with `changes.before` (old title and body).
- **Thin pieces** are reported ("Thin for the … desk"), never padded; they need an editor.

## Controls (signed in to /admin, typed in the address bar)
| Address | Does |
|---|---|
| `/api/admin/voice` | report: how many editions pass, the 15 worst, recent runs |
| `/api/admin/voice?dry=1` | free: score, tells and cost estimate of the next edition |
| `/api/admin/voice?dry=1&id=…&lang=en` | the same for a chosen edition |
| `/api/admin/voice?run=1&id=…&lang=en` | repair that one edition now (one to three model calls on OpenAI gpt-6-luna, a few cents at most; the exact amount is in the AI spend log) |
| `?on=1` / `?off=1` | switch the background worker on / off (default OFF) |
| `?cap=40` | editions per day (default 120) |

Background worker: pg_cron job `cl-voice` (every 10 min) → `/api/cron/voice`; 3 attempts per edition, 2 h apart, then "stuck" = needs an editor. Every Clean click on the Quality tab counts as an attempt too. `RULES_VERSION` (`lib/voice/work.ts`) is stored with the attempts: when the judge or the guards change in a way that makes earlier verdicts stale, bump it and every edition gets a fresh set of attempts.

## What the editor model is told about a finding
A list of findings alone leaves the model guessing. Each finding carries the **measured value or the passage** (for equal-size paragraphs: the words per paragraph and the shortest neighbouring pair), and every family of findings has its **remedy** in `lib/journalism/editorial.ts` (`FIX`, `remediesFor`). The article desk's sub-editor and the voice engine's Clean pass get the same remedies. For paragraphs the remedy is to re-cut by the logic of the story: join neighbours that carry one thought into one fuller paragraph, let a single hard fact stand alone; never merge or split to reach a size.

## What the score counts (and what it does not)
- Only the writer's prose is judged. The site's own call-to-action cards (`<aside class="specialist-card">`: "verified firms from our directory", a link list) are template text and are cut out before every detector runs (`withoutCards`, `lib/voice/score.ts`).
- A finding adds its severity (high 40, medium 7, low 3) times the occurrences counted (five at most, each further one at 0.7). A finding whose count is the size of the text (headings, paragraphs, bullets: `over_sectioned`, `uniform_paragraphs`, `c_specificity`, `c_para_opener_many`, `c_speech_mono`, `templated_headings`, `listicle`; `countsTheText` in `lib/journalism/progress.ts`) weighs once.
- A word in capitals is never a pronoun ("EU House" is not the Romanian "eu"); the Arabic name Anna (آنا) is not "I"; "mine", "124(I)/2018" and "Our Lady" are not first person; an acronym that the article itself writes in capitals is not a shouted title.

## Clean and Rewrite on the Quality tab
- The page shows **style** and **length** apart. Style is what the publish bar measures (`MAX_SCORE`); length is the comparison with the other six editions (`lib/voice/parity.ts`, 25 extra points in the ranking only). **Clean** is offered where the style fails the bar; **Rewrite** where the length is out of line or the style is very heavy (25+). "Clean all flagged" takes only editions that Clean can help, and the list shows only editions that need something.
- After a click the answer is a sentence (`explainNote`, `lib/voice/cleanRun.ts`), not a log line.
- **Clean** = one editor pass in the edition's own language. A text that moved but still fails the bar gets a second call that starts from the improved text (a route has 60 seconds, so each call is one pass).
- **Rewrite** = re-report from the source edition, under the house rule "no sources named", saved only as a real improvement (`lib/voice/accept.ts`) or when it puts an edition that was far too short or too long back in line with the others.

## Thresholds
`MAX_SCORE` 9 (no high-severity tell), `MAX_OVERLAP` 0.12, `MAX_RUN` 12. Calibrated on real articles: the GESY guide scores 36, the Hannah Rowan article 14, plain human reporting 0.

## Limits (honest)
No tool can guarantee passing every external AI detector; AdSense judges helpfulness and originality. All non-English rules were written by model linguists and need a native-speaker spot check.
