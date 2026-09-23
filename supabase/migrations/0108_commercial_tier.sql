-- ============================================================================
-- Cyprus Lifestyle — 0108 · Commercial tier on the listing (Pillar E, step 1)
-- ----------------------------------------------------------------------------
-- The tier a business actually BUYS (Listed / Featured / Partner) lives in the CRM
-- (crm_deals.product + an active stage, linked via crm_orgs.directory_listing_id). Until
-- now it reached the listing only as two booleans (featured/verified), so the concierge
-- could not tell a Partner from a Featured, and the tier-partner branch of fulfil_ad_order
-- set NOTHING on the row at all. This migration gives the listing a real, orderable tier:
--   • commercial_tier  text     — 'partner' | 'featured' | 'listed' | null  (source of truth)
--   • commercial_rank  smallint — generated 3/2/1/0, so retrieval can ORDER BY it directly
-- then backfills it from active CRM deals and teaches fulfil_ad_order to keep it in sync.
-- Ranking stays relevance-gated (see lib/concierge/rerank.ts): tier only ever breaks ties
-- among genuinely relevant results — a paying partner never outranks the honest answer.
-- Additive & idempotent; no rows deleted, no existing column dropped.
-- ============================================================================

-- ── 1. the columns ───────────────────────────────────────────────────────────
alter table public.directory_listings
  add column if not exists commercial_tier text
    check (commercial_tier is null or commercial_tier in ('partner','featured','listed'));

-- Orderable mirror of the tier (Partner=3 > Featured=2 > Listed=1 > none=0). Generated &
-- stored, so it is always consistent with commercial_tier and can be indexed for ORDER BY.
alter table public.directory_listings
  add column if not exists commercial_rank smallint
    generated always as (
      case commercial_tier
        when 'partner'  then 3
        when 'featured' then 2
        when 'listed'   then 1
        else 0
      end
    ) stored;

create index if not exists directory_commercial_rank_idx
  on public.directory_listings (commercial_rank desc);

-- ── 2. backfill from active CRM deals ────────────────────────────────────────
-- A business is a paying subscriber when it has a crm_deal in an active stage
-- (won/live/renewal). product carries the tier — accept both the bare tier names and the
-- rate-card slot spellings ('tier-partner', 'premium-listing', …). Highest tier wins.
with tiered as (
  select o.directory_listing_id as id,
         max(case
               when d.product ilike '%partner%'                                  then 3
               when d.product ilike '%featured%'                                 then 2
               when d.product ilike '%listed%' or d.product ilike '%listing%'    then 1
               else 0
             end) as rk
  from public.crm_deals d
  join public.crm_orgs o on o.id = d.org_id
  where d.stage in ('won','live','renewal')
    and o.directory_listing_id is not null
  group by o.directory_listing_id
)
update public.directory_listings l
set commercial_tier = case t.rk when 3 then 'partner' when 2 then 'featured' when 1 then 'listed' end
from tiered t
where t.id = l.id
  and t.rk > 0
  and l.commercial_tier is distinct from
      (case t.rk when 3 then 'partner' when 2 then 'featured' when 1 then 'listed' end);

-- ── 3. keep it in sync at fulfilment time ────────────────────────────────────
-- Same function as 0038, with three changes: the Listed and Featured branches now also
-- stamp commercial_tier, and the Partner branch — which previously touched nothing on the
-- listing — now stamps the listing as our top tier (partner + the badges). Everything else
-- is byte-for-byte the 0038 body, so replacing it reverts nothing.
create or replace function public.fulfil_ad_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o        record;
  v_org    uuid;
  v_listing uuid;
  v_adv    text;
  v_title  text;
  v_steps  jsonb;
  v_due    interval := interval '3 days';
begin
  select * into o from public.ad_orders where id = p_order_id;
  if not found then return; end if;

  -- idempotent: one fulfilment task per order (also guards duplicate webhooks)
  if exists (select 1 from public.fulfillment_tasks where ad_order_id = p_order_id) then
    return;
  end if;

  v_org := o.org_id;
  v_adv := coalesce(nullif(o.company,''), nullif(o.customer_name,''), 'New advertiser');
  if v_org is not null then
    select directory_listing_id into v_listing from public.crm_orgs where id = v_org;
  end if;

  if o.slot in ('tier-listed','premium-listing') then
    v_title := 'Onboard listing — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Confirm or create the directory listing','done',false),
      jsonb_build_object('label','Collect logo, photo, summary, website, phone','done',false),
      jsonb_build_object('label','Publish; confirm featured + verified','done',false),
      jsonb_build_object('label','QA the seven translations','done',false));
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, commercial_tier = 'listed', updated_at = now() where id = v_listing;
    end if;

  elsif o.slot = 'tier-featured' then
    v_title := 'Onboard Featured — ' || v_adv;
    v_due := interval '5 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Listing: publish, set featured + verified','done',false),
      jsonb_build_object('label','Banner: design + activate (draft created)','done',false),
      jsonb_build_object('label','Schedule the first quarterly sponsored feature','done',false),
      jsonb_build_object('label','Add to next newsletter mention block','done',false));
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, commercial_tier = 'featured', updated_at = now() where id = v_listing;
    end if;
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'sidebar-homepage', false, 1, v_org, p_order_id);

  elsif o.slot = 'sidebar-leaderboard' then
    v_title := 'Set up homepage banner — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Design/collect banner creative (7 languages)','done',false),
      jsonb_build_object('label','Fill headline, body, CTA, URL, image, colours','done',false),
      jsonb_build_object('label','Activate the banner','done',false));
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'sidebar-homepage', false, 1, v_org, p_order_id);

  elsif o.slot = 'section-sponsorship' then
    v_title := 'Set up section sponsorship — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree the section','done',false),
      jsonb_build_object('label','Design the "presented by" lockup + banner','done',false),
      jsonb_build_object('label','Map sponsor to the section + activate','done',false));
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'section-sponsorship', false, 1, v_org, p_order_id);

  elsif o.slot = 'sponsored-feature' then
    v_title := 'Produce sponsored feature — ' || v_adv;
    v_due := interval '10 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree angle; send interview questions / gather notes','done',false),
      jsonb_build_object('label','Draft in Editorial Studio','done',false),
      jsonb_build_object('label','Edit; confirm sponsored ("presented by")','done',false),
      jsonb_build_object('label','Translate to seven languages','done',false),
      jsonb_build_object('label','Publish + add to newsletter/social','done',false));
    insert into public.blog_posts (slug, title_en, status, sponsored, sponsor_name, sponsor_org_id)
    values ('sponsored-' || substr(p_order_id::text,1,8), '(Draft) Sponsored feature — ' || v_adv, 'draft', true, v_adv, v_org);

  elsif o.slot = 'newsletter-sole' then
    v_title := 'Schedule newsletter sponsor — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree the Saturday send date','done',false),
      jsonb_build_object('label','Collect headline, copy, image, URL','done',false),
      jsonb_build_object('label','Attach sponsor to that send','done',false));
    insert into public.newsletter_sponsors (org_id, ad_order_id, advertiser_name, target_language, status)
    values (v_org, p_order_id, v_adv, coalesce(nullif(o.locale,''),'all'), 'pending');

  elsif o.slot = 'directory-exclusive' then
    v_title := 'Set category exclusivity — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Confirm the category','done',false),
      jsonb_build_object('label','Mark account exclusive; remove competing promotion','done',false));

  elsif o.slot = 'agenda-event' then
    v_title := 'Spotlight event — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Collect event details + image','done',false),
      jsonb_build_object('label','Create the event; set featured','done',false),
      jsonb_build_object('label','Social push near the date','done',false));

  elsif o.slot = 'tier-partner' then
    v_title := 'Onboard Partner — ' || v_adv;
    v_due := interval '7 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree annual plan + exclusivity','done',false),
      jsonb_build_object('label','Build series calendar + placements','done',false),
      jsonb_build_object('label','Kick off first deliverables','done',false));
    -- Partner is our top tier: stamp the listing so the concierge can lead with it (0038 set nothing here).
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, commercial_tier = 'partner', updated_at = now() where id = v_listing;
    end if;

  else
    v_title := 'Fulfil order — ' || v_adv || ' (' || coalesce(o.slot,'?') || ')';
    v_steps := jsonb_build_array(jsonb_build_object('label','Review and fulfil this order','done',false));
  end if;

  insert into public.fulfillment_tasks (org_id, ad_order_id, product_slot, title, steps, status, due_at)
  values (v_org, p_order_id, o.slot, v_title, v_steps, 'open', now() + v_due);
end;
$$;

grant execute on function public.fulfil_ad_order(uuid) to service_role;

-- ── report ──────────────────────────────────────────────────────────────────
select
  (select count(*) from public.directory_listings where commercial_tier is not null) as with_commercial_tier,
  (select count(*) from public.directory_listings where commercial_tier = 'partner')  as partners,
  (select count(*) from public.directory_listings where commercial_tier = 'featured') as featured_tier,
  (select count(*) from public.directory_listings where commercial_tier = 'listed')   as listed_tier;
