#!/usr/bin/env bash
# scripts/db/restore-drill.sh — proves the database can be rebuilt from this repository.
#
#   1. builds a throw-away database on a plain PostgreSQL server (+ a tiny Supabase emulation),
#   2. runs supabase/baseline/0000_live_schema_baseline.sql on it — twice (must be idempotent),
#   3. checks its fingerprint equals production's at snapshot time (supabase/baseline/expected-parity.txt),
#   4. applies every migration newer than the baseline (supabase/baseline/BASELINE_VERSION) — twice,
#   5. runs the security invariants (scripts/db/security-smoke.sql).
#
# Needs: a reachable PostgreSQL 15+ server with the pgvector, pg_trgm, pgcrypto and uuid-ossp
# extensions and a superuser (CI uses the pgvector/pgvector:pg16 image). Connection comes from the
# standard PG* environment variables (PGHOST, PGPORT, PGUSER, PGPASSWORD).
#
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash scripts/db/restore-drill.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

BASE=supabase/baseline
# "already exists, skipping" notices are expected on the idempotency re-runs; keep the log readable.
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
DB="cl_drill_$$"
WORK="$(mktemp -d)"
adm() { psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"; }
db()  { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
cleanup() { adm -c "drop database if exists $DB" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
step() { printf '\n▶ %s\n' "$*"; }

adm -c "create database $DB"

step "1/11  Supabase emulation (roles, auth.uid(), storage stubs)"
db -f "$BASE/drill-harness.sql"

# Three extensions are managed by Supabase itself and do not exist on plain PostgreSQL.
sed -E 's/^(create extension if not exists (supabase_vault|pg_cron|pg_net)\b)/-- [drill: Supabase-managed] \1/' \
  "$BASE/0000_live_schema_baseline.sql" > "$WORK/baseline.sql"

step "2/11  Baseline on an empty database (any error fails the drill)"
db -f "$WORK/baseline.sql"

step "3/11  Baseline again — must be idempotent"
db -f "$WORK/baseline.sql"

step "4/11  Fingerprint of the rebuilt schema vs production at snapshot time"
db -At -F ' | ' -f "$BASE/verify-parity.sql" > "$WORK/parity.txt"
if ! diff -u "$BASE/expected-parity.txt" "$WORK/parity.txt"; then
  echo "✗ The rebuilt schema differs from production's snapshot (see diff above)." >&2
  exit 1
fi
echo "  identical: $(wc -l < "$WORK/parity.txt" | tr -d ' ') fingerprints (counts + content digests)"

step "5/11  Migrations newer than the baseline ($(tr -d '[:space:]' < "$BASE/BASELINE_VERSION")) — each applied twice"
BV="$(tr -d '[:space:]' < "$BASE/BASELINE_VERSION")"
applied=0
for f in $(ls supabase/migrations | sort); do
  v="${f%%_*}"
  [[ ${#v} -eq 14 && "$v" > "$BV" ]] || continue
  echo "  $f"
  db -f "supabase/migrations/$f"
  db -f "supabase/migrations/$f"
  applied=$((applied + 1))
done
echo "  $applied migration(s) applied"

step "6/11  Security invariants"
db -f scripts/db/security-smoke.sql

step "7/11  Administrator audit trail (who changed what)"
db -f scripts/db/audit-smoke.sql

step "8/11  Newsletter workflow tables"
db -f scripts/db/newsletter-smoke.sql

step "9/11  Social auto-post queue"
db -f scripts/db/social-smoke.sql

step "10/11  Member sessions"
db -f scripts/db/member-smoke.sql

step "11/11  Scheduled-job installer + health function"
db -f scripts/db/cron-install-smoke.sql

printf '\n✓ restore drill passed: the schema rebuilds from the repo, is idempotent, matches production, and the security and audit invariants hold.\n'
