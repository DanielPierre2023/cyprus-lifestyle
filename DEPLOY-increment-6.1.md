# Cyprus Lifestyle — Editorial Engine · Increment 6.1 (Reliable drafting)

Replaces Increment 6. The background `after()` trigger did not fire reliably on the
deployment (pieces stayed "Commissioned" and never drafted). This switches to a
mechanism that always works: the cockpit runs drafting as its own request.

Files (repo paths preserved):

    app/api/admin/editorial/draft/route.ts        ← NEW admin route: draft ONE piece by id
                                                    (its own 60s budget) → advances to Editing
    app/api/admin/editorial/idea/route.ts         ← approve now returns fast + { blogPostId, autoDraft }
    app/api/admin/editorial/field-note/route.ts   ← field note commissions + returns { blogPostId, autoDraft }
    components/admin/IdeaActions.tsx              ← Approve → then calls the draft route (two steps)
    components/admin/FieldNoteForm.tsx            ← Save → then calls the draft route

## How it works now
- APPROVE (with autonomy = auto-draft): step 1 commissions the piece fast and carries the
  planner's brief onto it; step 2 (a separate request from the browser) calls the new
  admin draft route, which writes the full article in its own 60-second function and moves
  it to Editing. You'll see "Approved · drafting…" then "Drafted · N words — now in Editing".
- FIELD NOTES: same two-step; the notes are carried onto the piece and the draft route
  writes from them.
- Each step stays well inside Vercel's 60s limit, so no timeouts.

## Deploy
Code only (GitHub → Vercel). No SQL, no env changes.

## Leftovers from testing
The earlier tests left ~8 "Commissioned" pieces with no body in the pipeline (Aristocat,
the tavern, several Five Minutes With). They're harmless. Once this is live, approving new
ideas drafts them properly; the old commissioned ones can be deleted, or I can add a
"Draft" button to the pipeline board to write them on demand — your call.

Verified locally: `tsc` clean · all 26 test suites pass.
