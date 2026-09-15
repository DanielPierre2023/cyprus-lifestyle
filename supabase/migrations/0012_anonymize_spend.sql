-- ============================================================================
-- Remove every trace of which LLM was used, and (in the same pass) re-cost the
-- old rows. Run this ONCE in the Supabase SQL editor. It replaces the separate
-- re-cost file — it does the re-cost first, then anonymizes.
--
-- After this:
--   • ai_spend_log.provider / .model are 'llm' on every row (no vendor/model).
--   • the rollup views expose no provider/model column at all.
--   • all old rows carry the correct rate + 25% markup.
-- Safe/idempotent: the re-cost only touches rows without meta.base_usd.
-- ============================================================================

-- STEP A — re-cost old rows (uses the real model, so it must run BEFORE anonymize).
with base as (
  select id, model, coalesce(units,0)::numeric as units, coalesce(usd,0)::numeric as old_usd,
    case model when 'claude-sonnet-4-6' then 3.0 when 'claude-sonnet-4-5' then 3.0
      when 'claude-haiku-4-5-20251001' then 1.0 when 'gpt-4o' then 2.5
      when 'gemini-2.5-flash' then 0.3 else 2.0 end as oi,
    case model when 'claude-sonnet-4-6' then 15.0 when 'claude-sonnet-4-5' then 15.0
      when 'claude-haiku-4-5-20251001' then 5.0 when 'gpt-4o' then 10.0
      when 'gemini-2.5-flash' then 2.5 else 8.0 end as oo,
    case model when 'claude-sonnet-5' then 2.0 when 'claude-opus-5' then 5.0
      when 'claude-opus-4-8' then 5.0 when 'claude-sonnet-4-6' then 3.0
      when 'claude-sonnet-4-5' then 3.0 when 'claude-haiku-4-5-20251001' then 1.0
      when 'gpt-4o' then 2.5 when 'gemini-flash-latest' then 0.75
      when 'gemini-2.5-flash' then 0.3 else 5.0 end as ni,
    case model when 'claude-sonnet-5' then 10.0 when 'claude-opus-5' then 25.0
      when 'claude-opus-4-8' then 25.0 when 'claude-sonnet-4-6' then 15.0
      when 'claude-sonnet-4-5' then 15.0 when 'claude-haiku-4-5-20251001' then 5.0
      when 'gpt-4o' then 10.0 when 'gemini-flash-latest' then 3.75
      when 'gemini-2.5-flash' then 2.5 else 25.0 end as no_
  from public.ai_spend_log where (meta->>'base_usd') is null and usd is not null
),
recovered as (
  select *, greatest(0, least(units,
    round((old_usd*1000000.0 - oi*units) / nullif(oo - oi, 0)))) as out_tok from base
),
computed as (
  select id, (units - out_tok) as in_tok, out_tok,
    round(((units - out_tok)*ni + out_tok*no_) / 1000000.0, 6) as new_base
  from recovered
)
update public.ai_spend_log l
set usd = round(c.new_base * 1.25, 6),
    meta = coalesce(l.meta, '{}'::jsonb) || jsonb_build_object(
             'base_usd', c.new_base, 'markup_pct', 25, 'recosted', true,
             'in_tokens', c.in_tok, 'out_tokens', c.out_tok)
from computed c
where l.id = c.id;

-- STEP B — anonymize: no LLM/vendor names left on any row.
update public.ai_spend_log
set provider = 'llm', model = 'llm'
where provider is distinct from 'llm' or model is distinct from 'llm';

-- Also neutralize any legacy function_name that named a provider/model.
update public.ai_spend_log
set function_name = 'other'
where lower(coalesce(function_name, '')) in
  ('claude', 'openai', 'google', 'gemini', 'sonnet', 'opus', 'haiku', 'gpt4o', 'gpt-4o');

-- STEP C — rollup views that expose NO provider/model column.
drop view if exists public.ai_spend_daily;
create view public.ai_spend_daily as
  select (occurred_at at time zone 'Europe/Nicosia')::date as day,
         round(sum(coalesce(usd, 0)), 5) as usd,
         count(*)                        as calls
  from public.ai_spend_log
  group by 1;

drop view if exists public.ai_spend_by_function_daily;
create view public.ai_spend_by_function_daily as
  select (occurred_at at time zone 'Europe/Nicosia')::date as day,
         function_name,
         count(*)                        as calls,
         round(sum(coalesce(usd, 0)), 5) as usd
  from public.ai_spend_log
  group by 1, 2;

-- Confirmation.
select round(sum(usd), 4) as total_usd,
       count(*)           as rows,
       count(distinct model) as distinct_models   -- should be 1 ('llm')
from public.ai_spend_log;
