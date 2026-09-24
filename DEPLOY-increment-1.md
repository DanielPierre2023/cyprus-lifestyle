# Cyprus Lifestyle — Editorial Engine · Increment 1 (Data foundation)

Files in this zip (repo paths preserved — drag the folders into GitHub as-is):

    lib/editorial/taxonomy.ts                     ← the merged taxonomy (source of truth)
    scripts/tests/editorial-taxonomy.test.ts      ← unit tests (26 assertions)
    supabase/migrations/0114_editorial_sections.sql
    supabase/migrations/0115_editorial_ideas.sql
    supabase/migrations/0116_editorial_field_notes.sql
    supabase/migrations/0117_editorial_views.sql

## Deploy — two steps

### 1. Code → GitHub (Vercel auto-builds)
Drag `lib/` and `scripts/` from this zip into the repo. Nothing here changes the
public site; these are backend/support files only.

### 2. Migrations → Supabase SQL editor (run in order)
If you have NOT yet run the earlier editorial-pipeline migrations, run them FIRST:
  0112_editorial_pipeline.sql   (adds blog_posts pipeline columns)
  0113_publish_gate.sql
Then run, in this exact order:
  0114_editorial_sections.sql   → seeds 9 departments + 31 subcategories (79/month)
  0115_editorial_ideas.sql      → the commissioning backlog (+ pgvector dedup)
  0116_editorial_field_notes.sql
  0117_editorial_views.sql      → editorial_plan + editorial_coverage

Each prints a small report row at the end. 0114 should report
`departments=9, subcategories=31, monthly_target_total=79`.

## What this does / does NOT do
- DOES: create the backend taxonomy + accountability data model. Reuses the
  existing blog_posts.category/subcategory columns — NO article columns change,
  NO existing article or URL breaks (legacy keys relocation/agenda/cyprus/world
  are kept).
- DOES NOT: change anything on the public website. Nav, article pages and the
  concierge are untouched. Increment 2 (the public category repartition) comes
  next, and I'll show you the exact changes before you deploy them.

Verified locally: `tsc` clean · 24 test suites pass · full migration gate applies
0000–0117 on a fresh database.
