-- ============================================================================
-- Historical re-costing of ai_spend_log
-- ============================================================================
-- Old rows were logged with the wrong rate (Claude/Gemini writer calls fell back
-- to a $2/$8 default) and without the 25% markup. This corrects both.
--
-- METHOD: recover each row's input/output token split from (units, usd) using the
-- OLD rate that produced the stored usd, then recompute with the CORRECT rate and
-- apply the 1.25 markup. For models whose rate never changed, this naturally
-- reduces to old_usd x 1.25.
--
-- GUARD / IDEMPOTENT: only rows without meta.base_usd are touched. Rows written by
-- the fixed code already carry base_usd (so are never re-costed), and re-costed
-- rows get base_usd set — so this whole script is safe to run once, and a second
-- run does nothing.
--
-- LIMITATION: old token counts were character-based estimates that excluded model
-- reasoning/thinking output tokens, so recovered volumes are conservative. This
-- fixes the RATE and the MARKUP exactly; the token volume of old rows stays a
-- little low. New rows log real usage.
--
-- If your markup is not 25%, change every "1.25" below to (1 + pct/100).
--
-- RUN STEP 1 (preview) first. Only run STEP 3 (the UPDATE) once you're happy.
-- ============================================================================

-- The recompute, shared by all three steps. (Repeated inline because CTEs can't
-- be reused across separate statements.)
--   oi/oo = OLD input/output $ per 1M tokens actually applied to the stored usd
--   ni/no = NEW correct input/output $ per 1M tokens

-- ─── STEP 1 · PREVIEW, per row (largest new cost first) ─────────────────────
with base as (
  select id, model,
    coalesce(units, 0)::numeric as units,
    coalesce(usd, 0)::numeric   as old_usd,
    case model
      when 'claude-sonnet-4-6' then 3.0 when 'claude-sonnet-4-5' then 3.0
      when 'claude-haiku-4-5-20251001' then 1.0
      when 'gpt-4o' then 2.5 when 'gemini-2.5-flash' then 0.3
      else 2.0 end as oi,
    case model
      when 'claude-sonnet-4-6' then 15.0 when 'claude-sonnet-4-5' then 15.0
      when 'claude-haiku-4-5-20251001' then 5.0
      when 'gpt-4o' then 10.0 when 'gemini-2.5-flash' then 2.5
      else 8.0 end as oo,
    case model
      when 'claude-sonnet-5' then 2.0 when 'claude-opus-5' then 5.0
      when 'claude-opus-4-8' then 5.0
      when 'claude-sonnet-4-6' then 3.0 when 'claude-sonnet-4-5' then 3.0
      when 'claude-haiku-4-5-20251001' then 1.0
      when 'gpt-4o' then 2.5
      when 'gemini-flash-latest' then 0.75 when 'gemini-2.5-flash' then 0.3
      else 5.0 end as ni,
    case model
      when 'claude-sonnet-5' then 10.0 when 'claude-opus-5' then 25.0
      when 'claude-opus-4-8' then 25.0
      when 'claude-sonnet-4-6' then 15.0 when 'claude-sonnet-4-5' then 15.0
      when 'claude-haiku-4-5-20251001' then 5.0
      when 'gpt-4o' then 10.0
      when 'gemini-flash-latest' then 3.75 when 'gemini-2.5-flash' then 2.5
      else 25.0 end as no_
  from public.ai_spend_log
  where (meta->>'base_usd') is null and usd is not null
),
recovered as (
  select *, greatest(0, least(units,
    round((old_usd*1000000.0 - oi*units) / nullif(oo - oi, 0)))) as out_tok
  from base
),
computed as (
  select id, model, units, old_usd, (units - out_tok) as in_tok, out_tok,
    round(((units - out_tok)*ni + out_tok*no_) / 1000000.0, 6) as new_base
  from recovered
)
select id, model, units, in_tok, out_tok, old_usd,
       round(new_base * 1.25, 6) as new_usd
from computed
order by new_usd desc
limit 200;

-- ─── STEP 2 · PREVIEW, totals (old vs new) ──────────────────────────────────
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
  select old_usd, round((((units - out_tok)*ni + out_tok*no_) / 1000000.0) * 1.25, 6) as new_usd
  from recovered
)
select count(*) as rows_to_recost,
       round(sum(old_usd), 4)  as old_total_usd,
       round(sum(new_usd), 4)  as new_total_usd
from computed;

-- ─── STEP 3 · APPLY (uncomment to run once you're happy with the preview) ────
-- with base as (
--   select id, model, coalesce(units,0)::numeric as units, coalesce(usd,0)::numeric as old_usd,
--     case model when 'claude-sonnet-4-6' then 3.0 when 'claude-sonnet-4-5' then 3.0
--       when 'claude-haiku-4-5-20251001' then 1.0 when 'gpt-4o' then 2.5
--       when 'gemini-2.5-flash' then 0.3 else 2.0 end as oi,
--     case model when 'claude-sonnet-4-6' then 15.0 when 'claude-sonnet-4-5' then 15.0
--       when 'claude-haiku-4-5-20251001' then 5.0 when 'gpt-4o' then 10.0
--       when 'gemini-2.5-flash' then 2.5 else 8.0 end as oo,
--     case model when 'claude-sonnet-5' then 2.0 when 'claude-opus-5' then 5.0
--       when 'claude-opus-4-8' then 5.0 when 'claude-sonnet-4-6' then 3.0
--       when 'claude-sonnet-4-5' then 3.0 when 'claude-haiku-4-5-20251001' then 1.0
--       when 'gpt-4o' then 2.5 when 'gemini-flash-latest' then 0.75
--       when 'gemini-2.5-flash' then 0.3 else 5.0 end as ni,
--     case model when 'claude-sonnet-5' then 10.0 when 'claude-opus-5' then 25.0
--       when 'claude-opus-4-8' then 25.0 when 'claude-sonnet-4-6' then 15.0
--       when 'claude-sonnet-4-5' then 15.0 when 'claude-haiku-4-5-20251001' then 5.0
--       when 'gpt-4o' then 10.0 when 'gemini-flash-latest' then 3.75
--       when 'gemini-2.5-flash' then 2.5 else 25.0 end as no_
--   from public.ai_spend_log where (meta->>'base_usd') is null and usd is not null
-- ),
-- recovered as (
--   select *, greatest(0, least(units,
--     round((old_usd*1000000.0 - oi*units) / nullif(oo - oi, 0)))) as out_tok from base
-- ),
-- computed as (
--   select id, (units - out_tok) as in_tok, out_tok,
--     round(((units - out_tok)*ni + out_tok*no_) / 1000000.0, 6) as new_base
--   from recovered
-- )
-- update public.ai_spend_log l
-- set usd = round(c.new_base * 1.25, 6),
--     meta = coalesce(l.meta, '{}'::jsonb) || jsonb_build_object(
--              'base_usd', c.new_base, 'markup_pct', 25, 'recosted', true,
--              'in_tokens', c.in_tok, 'out_tokens', c.out_tok)
-- from computed c
-- where l.id = c.id;
