# Cyprus Lifestyle — Editorial Engine · Increment 4 (Cockpit + field notes + approvals)

The admin cockpit that operates the engine. All admin-session gated (you must be
logged in as admin) — NO secret key in the browser.

Files (repo paths preserved):

    app/[locale]/admin/(panel)/editorial-plan/page.tsx   ← accountability dashboard + planner controls
    app/[locale]/admin/(panel)/ideas/page.tsx            ← the Idea Board (approve / reject)
    app/[locale]/admin/(panel)/field-notes/page.tsx      ← log a visit / interview → AI drafts it
    components/admin/AdminNav.tsx                         ← 3 new sidebar tabs
    components/admin/IdeaActions.tsx                      ← approve/reject buttons (client)
    components/admin/PlannerControls.tsx                  ← Run planner + autonomy toggle (client)
    components/admin/FieldNoteForm.tsx                    ← the visit/interview form (client)
    app/api/admin/editorial/idea/route.ts                ← approve (→ commission, + auto-draft) / reject / assign
    app/api/admin/editorial/field-note/route.ts          ← save a field note, optionally auto-draft
    app/api/admin/editorial/settings/route.ts            ← get/set autonomy + web-search
    app/api/admin/editorial/plan-run/route.ts            ← run the planner from the cockpit

## Deploy
Code only (GitHub → Vercel). NO new migration. Requires Increments 1 + 3 already
deployed (tables/views + the planner). No new env vars.

## New admin tabs (under Newsroom)
- **Editorial Plan** — target vs published vs backlog vs gap, per department &
  subcategory, plus directory coverage (featured / candidates). Has the "Run planner"
  and "Dry run" buttons and the Autonomy toggle (suggest-only ⇄ approve→auto-draft).
- **Idea Board** — the planner's suggestions; Approve (commissions the piece, and
  auto-drafts it when autonomy is on) or Reject. Approved pieces appear in the
  existing Editorial Pipeline board.
- **Field Notes** — log a visit/interview (what you saw, tasted, heard) and let the
  AI editor draft a house-voice piece on the spot; it lands in Editing and, if you
  attached a directory listing id, elevates that business.

## How the loop runs day to day
1. The daily cron (Increment 3) fills gaps with suggestions.
2. You open Idea Board, approve the good ones (Reject the rest).
3. Suggest-only week: you draft via the pipeline. Flip Autonomy to auto-draft and
   Approve now also writes the first draft (AI editor) → Editing.
4. Editors log visits/interviews in Field Notes → instant drafts.
5. Everything you publish is measured back on Editorial Plan.

Verified locally: `tsc` clean · all 25 test suites pass.
