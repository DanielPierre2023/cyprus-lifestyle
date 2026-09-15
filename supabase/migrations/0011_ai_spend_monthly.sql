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

-- Scalar helpers for the dashboard cards (mirror ai_spend_today, same timezone).
-- This month's spend (calendar month, Europe/Nicosia):
create or replace function public.ai_spend_month(p_provider text default null)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(round(sum(coalesce(l.usd, 0)), 5), 0)::numeric
  from   public.ai_spend_log l
  where  to_char((l.occurred_at at time zone 'Europe/Nicosia'), 'YYYY-MM')
           = to_char((now() at time zone 'Europe/Nicosia'), 'YYYY-MM')
    and  (p_provider is null or l.provider = p_provider);
$$;

-- Lifetime total spend as a scalar:
create or replace function public.ai_spend_total_usd(p_provider text default null)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(round(sum(coalesce(l.usd, 0)), 5), 0)::numeric
  from   public.ai_spend_log l
  where  (p_provider is null or l.provider = p_provider);
$$;
