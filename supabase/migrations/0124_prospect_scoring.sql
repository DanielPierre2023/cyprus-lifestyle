-- ============================================================================
-- Cyprus Lifestyle — 0124 · CRM prospect scoring
-- ----------------------------------------------------------------------------
-- Ranks CRM accounts by opportunity so outreach hits the best prospects first.
-- A read-only view the admin CRM console reads. lead_score combines:
--   • category commercial value — high for the professional / high-ticket
--     verticals (law, relocation, real estate, immigration, clinics, hotels,
--     private banks), medium for hospitality / beauty / retail, low otherwise;
--   • gap signals — no website (+20) and not yet on a paying commercial tier
--     (+15), i.e. the most room to sell into;
--   • quality signal — a strong directory rating (>=4.5 → +15, >=4.0 → +8);
--   • already a customer (status won/live) → score 0.
-- `reason` is a short human-readable explanation of the score.
--
-- security_invoker so the caller's RLS applies (admin-cockpit read), matching
-- the editorial views (0117). Idempotent (create or replace view).
-- ============================================================================

create or replace view public.crm_prospect_scores
with (security_invoker = on) as
select
  o.id,
  o.name,
  o.category,
  o.district,
  o.status,
  o.website,
  o.tier,
  d.rating,
  d.commercial_tier,
  case
    when o.status in ('won', 'live') then 0
    else
      (case
         when o.category ilike '%law%' or o.category ilike '%reloc%'
           or o.category ilike '%real%estate%' or o.category ilike '%immigration%'
           or o.category ilike '%clinic%' or o.category ilike '%health%'
           or o.category ilike '%hotel%' or o.category ilike '%bank%' then 40
         when o.category ilike '%restaurant%' or o.category ilike '%dining%'
           or o.category ilike '%beauty%' or o.category ilike '%spa%'
           or o.category ilike '%retail%' then 20
         else 10
       end)
      + (case when o.website is null then 20 else 0 end)
      + (case when d.commercial_tier is null then 15 else 0 end)
      + (case when d.rating >= 4.5 then 15 when d.rating >= 4.0 then 8 else 0 end)
  end as lead_score,
  case
    when o.status in ('won', 'live') then 'Already a customer'
    else nullif(trim(concat_ws(' · ',
      (case
         when o.category ilike '%law%' or o.category ilike '%reloc%'
           or o.category ilike '%real%estate%' or o.category ilike '%immigration%'
           or o.category ilike '%clinic%' or o.category ilike '%health%'
           or o.category ilike '%hotel%' or o.category ilike '%bank%' then 'High-value category'
         when o.category ilike '%restaurant%' or o.category ilike '%dining%'
           or o.category ilike '%beauty%' or o.category ilike '%spa%'
           or o.category ilike '%retail%' then 'Mid-value category'
         else 'Standard category'
       end),
      (case when o.website is null then 'no website yet' end),
      (case when d.commercial_tier is null then 'not a paying tier' end),
      (case when d.rating >= 4.5 then 'top-rated' when d.rating >= 4.0 then 'well-rated' end)
    )), '')
  end as reason
from public.crm_orgs o
left join public.directory_listings d on d.id = o.directory_listing_id;

select 'crm prospect scores ready' as status,
  (select count(*) from public.crm_prospect_scores) as rows;
