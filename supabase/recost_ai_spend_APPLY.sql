-- ============================================================================
-- APPLY historical re-costing to ai_spend_log  —  paste and Run once.
-- ============================================================================
-- Corrects every old row: right per-model rate + 25% markup. Safe/idempotent:
-- only rows WITHOUT meta.base_usd are touched, and re-costed rows get base_usd
-- set, so a second run does nothing. (Preview version: recost_ai_spend.sql)
--
-- After it runs, the last SELECT prints the new total so you can confirm.
-- If your markup is not 25%, change 1.25 to (1 + pct/100).
-- ============================================================================

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

-- Confirmation: new total + how many rows now carry the corrected cost.
select round(sum(usd), 4)                             as new_total_usd,
       count(*) filter (where meta ? 'base_usd')      as recosted_rows,
       count(*)                                       as total_rows
from public.ai_spend_log;
