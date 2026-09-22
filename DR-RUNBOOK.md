# Cyprus Lifestyle — Disaster Recovery & Resilience Runbook

Roadmap item 18. This is the "when something goes wrong, or before it does" book:
backups and a restore drill, the recovery playbooks for the failures that actually
happen, secret rotation, load testing, and the performance-budget gate. It sits
alongside `RUNBOOK.md` (day-to-day operation, switches, env vars) and
`EXECUTION-PLAN.md` (what shipped, and why).

---

## 0 · Targets (RPO / RTO)

| Metric | Target | Why it's achievable |
| --- | --- | --- |
| **RPO** (max data loss) | ≤ 24 h on Free (daily dump); ≤ 5 min with Supabase PITR | Postgres is the single source of truth; everything else is stateless or re-derivable |
| **RTO** (time to restore service) | ≤ 15 min for a bad deploy; ≤ 2 h for a full DB restore | Vercel rolls back instantly; a DB restore is one `pg_restore` into a project that already has the schema via our migrations |

Where state lives — and this is the whole reason recovery is fast:

- **Supabase Postgres — the only durable state.** Content, directory, CRM, concierge logs, jobs, everything. Protect *this*.
- **Vercel — stateless compute.** No data; a redeploy or rollback is lossless. Env vars are configuration, backed up in §3.
- **External services** (Resend, Stripe, Anthropic/OpenAI, Upstash) hold their own state (emails, payments, rate-limit counters). Payments live in Stripe and are the authoritative financial record — our DB only mirrors them.
- **Re-derivable** without a backup: search vectors (re-embed), geocodes (re-geocode), scraped knowledge (re-scrape), the CI prelude. Losing these costs time, not data.

---

## 1 · Backups

### If you are on Supabase Pro (recommended for a live product)

1. **Daily automated backups** are on by default — verify under *Dashboard → Database → Backups*. Retention is 7 days on Pro.
2. **Point-in-Time Recovery (PITR)** is the add-on that takes RPO to minutes. Enable it under *Database → Backups → Point in Time* once revenue justifies it (~$100/mo). Until then, the daily backup + the manual dump below is your floor.

### On any plan (including Free) — the manual dump, do this weekly

The connection string is in *Dashboard → Project Settings → Database → Connection string → URI* (use the **direct** connection, not the pooler, for `pg_dump`).

```bash
# Full logical backup (schema + data), compressed custom format.
PGSSLMODE=require pg_dump "$SUPABASE_DB_URL" -Fc -f cl-backup-$(date +%F).dump

# Keep the last few off Supabase (e.g. encrypted in cloud storage you control).
```

A dump of this database is small (megabytes, not gigabytes) — cheap to keep many.

### Back up configuration too (it is not in the DB)

- **Vercel env vars:** `vercel env pull .env.backup` (store securely), or copy them from *Vercel → Settings → Environment Variables*. This is your secret inventory for §4.
- **Supabase Edge Function secrets:** listed under *Edge Functions → Manage secrets* (these are SEPARATE from Vercel env — see RUNBOOK §4).
- The repo itself (GitHub) is the backup of all code, migrations and this runbook.

---

## 2 · Restore drill — run once a quarter

A backup you have never restored is a rumour. The drill proves the dump is good and
measures your real RTO. Do it in a throwaway project, never against production.

1. Create a scratch Supabase project (Free is fine) — or a local `postgres` + `pgvector` container.
2. Apply the CI prelude so the Supabase-managed objects exist on plain Postgres:
   `psql -v ON_ERROR_STOP=1 -f supabase/ci/prelude.sql` *(local/CI only — never on real Supabase).*
3. Restore the dump: `pg_restore --no-owner --clean --if-exists -d "$SCRATCH_DB_URL" cl-backup-YYYY-MM-DD.dump`
4. **Verify** — the same gate CI uses, plus spot counts:
   - Row counts on the tables that matter: `directory_listings`, `blog_posts`, `crm_orgs`, `concierge_events`, `dsar_requests`.
   - `select * from job_queue_stats;` returns.
   - A concierge KB query returns rows.
5. Record the result in §7 (date, dump used, minutes taken, issues). Delete the scratch project.

If step 3 or 4 fails, the dump or the process is broken — fix it now, not during an incident.

---

## 3 · Recovery playbooks

### A bad deploy (most common)

Vercel keeps every deployment. *Vercel → Deployments →* the last-known-good → **Promote to Production** (or *Instant Rollback*). Service is back in under a minute; no data touched. Then fix forward on a branch. This is why we minimise risky pushes — but rollback is always there.

### Supabase is down / unreachable

The site degrades rather than dies: the concierge falls back to the edge function and then to an honest "our desk will follow up", reads are cached where possible, and writes fail closed. Check *status.supabase.com*. There is no action to take but wait and communicate; do **not** repoint the app at a stale restore while the primary may still return, or you risk split-brain writes. If the outage is prolonged and you must restore elsewhere, follow §2 into a new project and switch `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` in Vercel, then redeploy.

### Data loss or corruption (bad migration, wrong bulk update)

1. Stop the bleeding: turn the relevant switch OFF (`automation_settings` / `crm_settings`, see RUNBOOK §3) so automation can't compound it.
2. If it was a single bad statement and you have PITR, restore to the timestamp just before it.
3. Otherwise restore the latest daily/manual dump into a scratch project (§2), export just the affected table(s), and re-import. Migrations are additive and idempotent, so re-running them is safe.

### A leaked or compromised secret

Rotate it immediately (§4). Assume anything the key could reach was reachable. For `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY`, treat it as an incident: rotate, review recent access/logs, and check for unexpected writes or charges.

### Bad data from an automated subsystem

Every subsystem has a switch and every heavy job is on the durable queue. Turn the switch OFF; dead-lettered jobs are visible in `job_queue` (status `dead`) and in the admin Analytics tab. Fix the handler, re-enable, and the queue drains.

---

## 4 · Secret rotation

Rotate on a schedule and immediately on any suspected exposure. All app secrets live
in **Vercel** env (the Next app reads only Vercel); a few inbound webhooks also need
the matching secret set on the **Supabase Edge Function** side (RUNBOOK §4). After any
change in Vercel, **redeploy** for it to take effect.

| Secret | Where to rotate | Blast radius if leaked | Cadence |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → rotate | **Full DB write, RLS bypass** — highest | Immediately on suspicion; else yearly |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | Public by design (RLS still applies); rotate only if RLS policy assumed secrecy | Rarely |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → API keys / Webhooks | Payments | Immediately on suspicion; else yearly |
| `CLAUDE_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Each provider console | Model spend | On suspicion; rotate yearly; watch spend in Analytics |
| `RESEND_API_KEY`, `RESEND_INBOUND_SECRET`, `RESEND_WEBHOOK_SECRET` | Resend dashboard | Send/receive mail as us | On suspicion; yearly |
| `CRON_SECRET`, `ENRICH_SECRET`, `BACKFILL_SECRET`, `REVALIDATE_SECRET` | Our own — set any strong random value in Vercel | Trigger our jobs/endpoints | Yearly; after any contractor offboards |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console | Rate-limit store | Yearly |
| Social/API tokens (`META_*`, `WHATSAPP_*`, `X_*`, `LINKEDIN_*`) | Each platform | Post as us on that channel | Per platform policy |
| Maps/media keys (`GOOGLE_*`, `PLACES_KEY`, `UNSPLASH_ACCESS_KEY`) | Each console; restrict by referrer/IP | Quota theft | Yearly; keep referrer-restricted |

**Procedure:** create the new value → update it in Vercel (and Supabase Edge secrets if the key is used there) → redeploy → confirm the feature works (e.g. `/api/concierge/selftest?key=…` for the model keys, a test email for Resend) → revoke the old value. Never rotate `SUPABASE_SERVICE_ROLE_KEY` and `ANON_KEY` blind — confirm the new ones work before revoking.

---

## 5 · Load testing

A zero-dependency probe of the key public routes lives at `scripts/perf/loadtest.mjs`.
GET-only and gentle by default, so it is safe to point at production for a quick read;
raise the knobs against a staging deploy for a real soak.

```bash
BASE_URL=https://cypruslifestyle.eu npm run perf:loadtest
BASE_URL=https://cypruslifestyle.eu CONCURRENCY=20 DURATION=30 npm run perf:loadtest
```

It reports throughput and p50/p90/p95/p99 latency and the error rate per route.

**What "good" looks like** (cached public pages on Vercel's edge): p95 well under ~800 ms and a 0% error rate. Investigate if p95 climbs over ~1.5 s or errors appear — usually a cold serverless function, a slow Supabase query, or an upstream (model/mail) timeout. The concierge chat route is model-bound and intentionally excluded from the default path set; test it separately and expect seconds, not milliseconds.

Run it before and after a change you expect to affect performance, and after any infra change (region, plan, caching).

---

## 6 · Performance budgets (the CWV gate)

We enforce a **first-load JS budget** per route so a heavy new dependency is caught in
review, not in the field — first-load JS is the lever that most directly moves LCP/INP
on real devices.

```bash
npm run build && npm run perf:budgets      # enforce (nonzero exit on breach)
node scripts/perf/check-budgets.mjs --warn # report only
```

- Budgets live in `perf-budgets.json` (KB per normalised route; longest-prefix match, else `default`). They were calibrated from a measured build with headroom, so the gate is green today and trips on a real regression. Only navigable pages are measured — route handlers and layout/loading/error fragments are skipped. The pure pass/fail logic is unit-tested (`scripts/tests/perf-budgets.test.ts`).
- **In CI:** `.github/workflows/perf.yml` runs the full build + gate. It is **manual** (`workflow_dispatch`) by default so it never slows the main push CI. To make it a true gate on every change, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repo secrets and add `pull_request:` to its `on:` triggers.
- **Tuning:** as bundles shrink, lower the numbers so the ratchet only tightens. If a deliberate feature legitimately needs more, raise that route's budget in the same PR, with a one-line why.

---

## 7 · Restore-drill log

Fill one row each quarter (the drill in §2). An empty log means the drill hasn't been done.

| Date | Backup dated | Method (dump / PITR) | RTO (min) | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| _pending_ | | | | | first drill after go-live |

---

## 8 · Where to watch, day to day

- **Health:** `GET /api/health`. **Errors:** admin → Analytics (grouped `error_log`), and Sentry if `NEXT_PUBLIC_SENTRY_DSN` is set.
- **Jobs:** admin → Analytics (queue stats + dead-letters), table `job_queue`.
- **Concierge quality:** admin → Analytics → *Concierge quality · live evals* (run on demand).
- **Spend:** admin → Analytics → AI spend by month/function.
- **Backups:** Supabase → Database → Backups (confirm the last one is recent).
