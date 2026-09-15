-- ────────────────────────────────────────────────────────────────────────────
-- AI spend — monthly rollup (per-month reference + running total).
-- Backs the "AI spend by month" table on the admin Analytics page. Mirrors the
-- existing ai_spend_daily / ai_spend_by_function_daily views (same timezone,
-- same admin-only RLS via the base table).
--
-- HOW TO RUN: paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ────────────────────────────────────────────────────────────────────────────

create or replace view public.ai_spend_by_month as
  select to_char((occurred_at at time zone 'Europe/Nicosia'), 'YYYY-MM') as month,
         count(*)                        as calls,
         round(sum(coalesce(usd, 0)), 4) as usd
  from public.ai_spend_log
  group by 1
  order by 1 desc;

-- Lifetime total in one row (handy for a quick reference / API pull).
create or replace view public.ai_spend_total as
  select count(*)                        as calls,
         round(sum(coalesce(usd, 0)), 4) as usd
  from public.ai_spend_log;
