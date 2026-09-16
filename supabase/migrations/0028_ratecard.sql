-- ============================================================================
-- Cyprus Lifestyle — 0028 · Rate card, aligned to the Commercial Engine plan
--   Replaces the old flat weekly/monthly/yearly seed with the real model:
--   three tiers (Listed / Featured / Partner) + an à-la-carte table with
--   price ranges and proper units (per month / feature / send / event / year).
--   Adds the columns the new rate card needs; idempotent (safe to re-run).
-- ============================================================================

alter table public.ad_pricing
  add column if not exists unit       text,           -- 'per month' | 'per feature' | 'per send' | 'per event' | 'per year'
  add column if not exists price_from numeric,
  add column if not exists price_to   numeric,        -- null = single price
  add column if not exists kind       text default 'alacarte',  -- 'package' | 'alacarte'
  add column if not exists blurb_en   text,
  add column if not exists sort       int default 100;

-- Reset to the plan's rate card (delete-all + insert keeps this idempotent).
delete from public.ad_pricing;

insert into public.ad_pricing (slot, label_en, format, unit, price_from, price_to, kind, blurb_en, sort) values
 -- ── the three tiers (packages) ──
 ('tier-listed',   'Listed',   'Premium directory listing',                         'per year',   490,   null, 'package',
   'The premium directory listing: verified badge, full profile, photography, top-of-category, map priority and contact links. The self-serve entry point.', 1),
 ('tier-featured', 'Featured', 'Listing + rotating display + quarterly feature + newsletter', 'per month', 850, null, 'package',
   'Everything in Listed, plus a rotating display placement, one sponsored feature per quarter and one newsletter mention. The workhorse for hotels, developers and clinics.', 2),
 ('tier-partner',  'Partner',  'Category exclusivity + editorial series + priority everywhere', 'per year', 18000, null, 'package',
   'Category exclusivity, a named editorial series, section sponsorship, event partnership and priority everywhere. A handful only, by design (from €18k / year).', 3),

 -- ── à la carte ──
 ('sidebar-leaderboard', 'Homepage sidebar / leaderboard',              'Banner, 4 languages',            'per month',   600,  1100, 'alacarte', null, 10),
 ('section-sponsorship', 'Section sponsorship (The Table, Property…)',  'Presented-by lockup + banner',   'per month',   900,  1600, 'alacarte', null, 11),
 ('sponsored-feature',   'Sponsored feature',                          'Branded article, 4-lang, promoted','per feature',1200, 2200, 'alacarte', null, 12),
 ('newsletter-sole',     'Saturday Letter — sole sponsor',             'Newsletter, single message',     'per send',    350,   650, 'alacarte', null, 13),
 ('directory-exclusive', 'Directory — category exclusive',             'Only advertiser in a category',  'per month',   300,   700, 'alacarte', null, 14),
 ('agenda-event',        'Agenda — featured event',                    'Event spotlight + social',       'per event',   150,   450, 'alacarte', null, 15),
 ('premium-listing',     'Premium listing (Listed tier)',              'Enhanced directory profile',     'per year',    490,  null, 'alacarte', null, 16);

-- report
select kind, count(*) from public.ad_pricing group by kind order by kind;
