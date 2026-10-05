-- 20261004130400_ai_spend_guard.sql
-- Server-side SUM used by lib/spendGuard.ts to enforce the daily / monthly AI budget.
-- Safe to run more than once. Run in: Supabase → SQL Editor.
--
-- Until this is applied the app still works: it falls back to summing up to 20,000 rows of
-- ai_spend_log in application code.

create or replace function public.ai_spend_since(p_since timestamptz)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(usd), 0)::numeric
  from public.ai_spend_log
  where occurred_at >= p_since;
$$;

-- Only the server (service role) may call it; it exposes aggregate spend.
revoke all on function public.ai_spend_since(timestamptz) from public;
revoke all on function public.ai_spend_since(timestamptz) from anon, authenticated;
grant execute on function public.ai_spend_since(timestamptz) to service_role;

-- Verify (expect a number, e.g. 0 or the spend so far today):
--   select public.ai_spend_since(date_trunc('day', now() at time zone 'utc') at time zone 'utc');
