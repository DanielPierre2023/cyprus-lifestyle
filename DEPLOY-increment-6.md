# Cyprus Lifestyle — Editorial Engine · Increment 6 (Background drafting — timeout fix)

Fixes the "Unexpected token 'A' … is not valid JSON" error when approving with
autonomy = auto-draft (and the same latent bug in field-note auto-draft).

Files (replace the Increment 4 versions):

    app/api/admin/editorial/idea/route.ts        ← approve now backgrounds the draft
    app/api/admin/editorial/field-note/route.ts  ← field-note auto-draft backgrounds too
    components/admin/IdeaActions.tsx             ← "Approved · drafting…" message
    components/admin/FieldNoteForm.tsx           ← background-drafting message

## What was wrong
Approve-with-auto-draft wrote the whole article INLINE (commission + a full Sonnet
draft with the new craft prompt) inside one request, which exceeded Vercel's 60-second
function limit → Vercel returned its plain-text error page → the browser tried to parse
it as JSON and showed "Unexpected token 'A'…". The piece got commissioned but the draft
didn't finish.

## The fix
Approve now (a) commissions the piece fast, then (b) hands the writing to the existing
`/api/editorial/draft` route IN THE BACKGROUND using Next's `after()`. That route runs
as its own function with a full 60s budget and advances the piece to Editing. The approve
request returns instantly, so it can't time out. Same pattern applied to field-note
auto-draft (it passes the field notes to the draft route as grounding material).

## Deploy
Code only (GitHub → Vercel). No SQL, no env changes. Uses the already-deployed
`/api/editorial/draft` route and your existing ENRICH_SECRET.

## After deploying
Set Autonomy → "Approve → auto-draft" on the Editorial Plan tab, approve an idea, and
it returns immediately with "Approved · drafting…". About a minute later the piece
appears in the Editorial Pipeline under "Drafting/Editing" with the full article.

Note: the earlier failed attempt left one commissioned "Aristocat…" piece with no body
in the pipeline. Once this is live you can draft it (approve flow / draft route) or
delete it — harmless either way.

Verified locally: `tsc` clean · all 26 test suites pass.
