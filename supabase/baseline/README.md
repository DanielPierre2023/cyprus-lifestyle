# Database baseline — rebuild the `public` schema from this repository

`0000_live_schema_baseline.sql` recreates the production `public` schema (85 tables, 25 views, 42 functions, 91 RLS
policies, 297 indexes …) on an empty database. It exists because the 115 files in `supabase/migrations/` **cannot**
be replayed from scratch (the `directory_listings` table and ~15 early migrations were created by hand in the
dashboard). Schema only — no rows, no secrets.

It was generated on **2026-10-05 from the live catalogs** (read-only) and then **proven**: it was executed on a
real PostgreSQL 16 server, twice (idempotent), and the result is fingerprint-identical to production
(13 object counts + 8 content digests — see `expected-parity.txt`). CI repeats that proof on every pull request.

## Files
| File | Purpose |
|---|---|
| `0000_live_schema_baseline.sql` | The schema: extensions, enum, tables, constraints, functions, indexes, views, triggers, RLS, policies, grants — plus (guarded) the `auth.users` sign-up trigger and the storage buckets/policies |
| `BASELINE_VERSION` | Version of the last migration already contained in the baseline. Rebuild = baseline **+ every migration newer than this** |
| `verify-parity.sql` | Read-only fingerprint of a database (counts + md5 digests of columns, constraints, indexes, policies, triggers, view options, function and table permissions). Run it in two databases and compare |
| `expected-parity.txt` | The fingerprint of production at snapshot time. CI fails if the baseline stops producing it |
| `drill-harness.sql` | Tiny emulation of Supabase (roles, `auth.uid()`, storage stubs) so the baseline can run on plain PostgreSQL. **Never run on Supabase** |
| `live-inventory.json` | Machine-readable inventory: tables (+RLS, column count), views, functions (+who may execute), triggers, extensions, buckets, cron job names/schedules |

## Restore into a new Supabase project (disaster recovery or staging)
1. Create the project (never run this on production).
2. SQL Editor → paste and run `0000_live_schema_baseline.sql` (as `postgres`).
3. Run, in order, every file in `supabase/migrations/` whose 14-digit version is **greater** than `BASELINE_VERSION` (the hotfix first).
4. Run `verify-parity.sql` there and in production; the first 13 rows must match, and the digest rows must match too, apart from the
   differences made by migrations newer than the baseline (compare against `expected-parity.txt` right after step 2).
5. Recreate what is deliberately not in the file: the pg_cron jobs (`supabase/pg_cron/schedule.sql` — needs your site URL and `CRON_SECRET`),
   Edge Function deployments and their secrets, Auth settings, and the data (restore from a Supabase backup).

## The drill (what CI runs): `bash scripts/db/restore-drill.sh`
Builds a throw-away database → baseline (twice) → fingerprint equals production → every newer migration (twice) →
`scripts/db/security-smoke.sql` (RLS on every table; no `SECURITY DEFINER` function callable by visitors; all views `security_invoker`;
no wide-open write policy; visitors refused by Postgres itself; ordinary users see none of the internal views, admins see them).
Locally: `PGHOST=… PGUSER=… bash scripts/db/restore-drill.sh` against any PostgreSQL 15+ with pgvector.

## When to refresh the baseline
After a batch of migrations has been applied to production, regenerate the baseline from the live catalogs, set `BASELINE_VERSION`
to the last migration it contains, regenerate `expected-parity.txt` (run `verify-parity.sql` on the rebuilt database), and commit them
together. Until then new migrations simply sit on top of it (that is what step 5 of the drill exercises).

## Known characteristics (not defects of the file)
1. **It records production as it was**, including the permissions the hotfix migration later removes. That is deliberate: the drill applies the hotfix on top and proves the result.
2. Table privileges: `anon`/`authenticated`/`service_role` hold full privileges on every table (Supabase default); **row level security is the only gate**, and every table has it. 17 tables have RLS enabled with no policy (server-only via the service role): `atlas_descriptions`, `atlas_import`, `concierge_members`, `concierge_memory`, `concierge_tg_threads`, `concierge_wa_threads`, `directory_claims`, `directory_embeddings`, `directory_leads`, `directory_listing_edits`, `directory_listings_coords_backup_20260928`, `directory_owner_tokens`, `directory_reviews`, `kb_docs`, `kb_embeddings`, `membership_restore_tokens`, `stripe_events`.
3. `pg_net` is installed in schema `public` in production (unusual). On a fresh Supabase project it may be refused or land in `extensions`; the baseline skips it on plain PostgreSQL. `supabase_vault` and `pg_cron` are Supabase-managed.
4. Utility tables with no primary key, probably transient: `atlas_descriptions`, `atlas_import`, `directory_listings_coords_backup_20260928` (a dated backup) — decide whether to keep them.
5. Not captured: object ownership and comments, table storage parameters, statistics, current sequence/identity counters, realtime publications, event triggers, `FORCE ROW LEVEL SECURITY` (none in use), and Edge Function / Vault / cron command bodies (they hold secrets).
6. Function bodies were normalised from CRLF to LF line endings (semantically identical).
