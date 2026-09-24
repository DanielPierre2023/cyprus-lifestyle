-- ============================================================================
-- Cyprus Lifestyle — 0114 · Editorial sections (the merged taxonomy)
-- ----------------------------------------------------------------------------
-- ONE self-referential registry holds the magazine's DEPARTMENTS and their
-- SUBCATEGORIES (a subcategory is a row whose parent_key points at its department).
-- This is the backend twin of lib/editorial/taxonomy.ts — the code file is the
-- source of truth and scripts/tests/editorial-taxonomy.test.ts asserts the counts
-- (9 departments, 31 active subcategories, 79 articles/month) so the two never drift.
--
-- It is deliberately backward-compatible: six departments keep their existing keys
-- (table, escapes, culture, business, people, property) and the legacy section keys
-- (relocation, agenda, cyprus, world) live on as subcategory keys, so every existing
-- blog_posts.category value still resolves. blog_posts already has category +
-- subcategory columns (0003), so NO article column changes are needed — a piece is
-- tagged by (category = department key, subcategory = subcategory key), and legacy
-- rows whose category holds a now-subcategory key still map through the views.
--
-- Additive & idempotent. Re-running re-seeds (insert … on conflict do update).
-- ============================================================================

create table if not exists public.editorial_sections (
  key            text primary key,
  name           text not null,
  description    text,
  parent_key     text references public.editorial_sections(key) on delete cascade,
  sort           int  not null default 0,
  monthly_target int  not null default 0,   -- articles/month (0 on departments; rolled up from children)
  franchise_key  text,                       -- default franchise (lib/editorial/pipeline.ts)
  dir_groups     text[] not null default '{}', -- canonical directory category keys supplying featured subjects
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists editorial_sections_parent_idx on public.editorial_sections (parent_key) where parent_key is not null;
create index if not exists editorial_sections_active_idx on public.editorial_sections (active, sort);

alter table public.editorial_sections enable row level security;
drop policy if exists "Public can read active sections" on public.editorial_sections;
create policy "Public can read active sections" on public.editorial_sections
  for select to anon, authenticated using (active or public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins manage sections" on public.editorial_sections;
create policy "Admins manage sections" on public.editorial_sections
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.editorial_sections;
create trigger set_updated_at before update on public.editorial_sections
  for each row execute function public.update_updated_at();

-- ── Seed / re-seed the taxonomy (mirror of lib/editorial/taxonomy.ts) ─────────
-- Departments first (parent_key null) so the self-FK on subcategories is satisfied.
insert into public.editorial_sections (key, name, description, parent_key, sort, monthly_target, franchise_key, dir_groups, active) values
  ('style',         'Style',                 'How the island dresses, adorns and presents itself.',                                              null, 10,  0, null, '{}', true),
  ('table',         'The Table',             'Where and how Cyprus eats and drinks.',                                                            null, 50,  0, null, '{}', true),
  ('escapes',       'Escapes',               'The island as a place to arrive slowly.',                                                          null, 100, 0, null, '{}', true),
  ('design-living', 'Design & Living',       'Architecture, interiors and the well-made object.',                                                null, 150, 0, null, '{}', true),
  ('property',      'Property & Relocation', 'The practical business of living here.',                                                            null, 190, 0, null, '{}', true),
  ('business',      'Business',              'The island economy and the people building it.',                                                   null, 240, 0, null, '{}', true),
  ('culture',       'Culture',               'Art, heritage and what''s on.',                                                                    null, 280, 0, null, '{}', true),
  ('people',        'People',                'The human island.',                                                                                null, 330, 0, null, '{}', true),
  ('the-island',    'The Island',            'Essentials, news and the knowledge that helps — the civic layer, in the reader''s voice.',         null, 370, 0, null, '{}', true)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, parent_key = excluded.parent_key,
  sort = excluded.sort, monthly_target = excluded.monthly_target, franchise_key = excluded.franchise_key,
  dir_groups = excluded.dir_groups, active = excluded.active, updated_at = now();

insert into public.editorial_sections (key, name, description, parent_key, sort, monthly_target, franchise_key, dir_groups, active) values
  ('style-fashion',     'Fashion & Wardrobe',        'Cypriot designers, boutiques and the seasonal Mediterranean wardrobe.',            'style',         20,  3, null,                 array['fashion-clothing','footwear','tailor'], true),
  ('style-beauty',      'Beauty & Grooming',         'Salons, spas, barbers and skincare worth the appointment.',                       'style',         30,  2, 'maker',              array['beauty-spa','hair-barber','nail-salon','tattoo-piercing'], true),
  ('style-jewellery',   'Jewellery & Watches',       'Goldsmiths and ateliers, filigree cut by eye.',                                   'style',         40,  1, 'maker',              array['jewellery'], true),
  ('table-fine',        'Fine Dining',               'The tables worth travelling for, reported without flattery.',                     'table',         60,  4, 'at-the-table',       array['restaurant'], true),
  ('table-taverna',     'Tavernas & Island Cooking', 'The authentic, the local, the meze that matters.',                                'table',         70,  2, 'at-the-table',       array['restaurant','deli-gourmet'], true),
  ('table-wine',        'Wine & Vineyards',          'The island''s wineries and the people making Cypriot wine serious.',              'table',         80,  2, 'maker',              array['winery'], true),
  ('table-nightlife',   'Bars & Nightlife',          'Cocktail rooms, rooftops and where the night goes.',                              'table',         90,  2, 'at-the-table',       array['bar','nightclub'], true),
  ('escapes-beaches',   'Beaches & Coves',           'The earned beaches, the hidden coves, the swim before the crowds.',               'escapes',       110, 2, null,                 array['beach','diving-centre'], true),
  ('escapes-stays',     'Hotels, Resorts & Villas',  'Where to stay, from the grand resort to the restored stone house.',               'escapes',       120, 3, 'tastemakers',        array['hotel','villa-rental','apartment-rental','agrotourism'], true),
  ('escapes-sea',       'Sea & Society',             'Yachting, the marina set, watersports and the long lunch on the water.',          'escapes',       130, 2, null,                 array['yacht-boat-charter','diving-centre'], true),
  ('escapes-tours',     'Days Out & Tours',          'Excursions, guides and the itinerary worth following.',                           'escapes',       140, 2, null,                 array['tour-activity'], true),
  ('design-arch',       'Architecture & Interiors',  'The houses and rooms that define contemporary Cyprus.',                           'design-living', 160, 2, 'tastemakers',        array['architect'], true),
  ('design-homes',      'Homes & Gardens',           'Furnishing and planting a Mediterranean life.',                                   'design-living', 170, 2, null,                 array['furniture-homeware','gardener-landscaper'], true),
  ('design-maker',      'The Maker',                 'Craftspeople and producers — ceramicists, boat-builders, perfumers.',            'design-living', 180, 2, 'maker',              array['jewellery','winery','photographer'], true),
  ('property-buying',   'Buying & Renting',          'The market, the developments, the honest numbers.',                               'property',      200, 2, null,                 array['real-estate-agency','property-developer'], true),
  ('property-hoods',    'Neighbourhoods',            'Area guides — who lives where, and why.',                                          'property',      210, 2, null,                 '{}', true),
  ('relocation',        'Relocation & Residency',    'Visas, tax, moving — the move-to-Cyprus playbook.',                               'property',      220, 3, 'concierge-meets',    array['immigration-adviser','law-firm','company-formation'], true),
  ('property-family',   'Schools & Family',          'Schools, childcare and raising a family on the island.',                          'property',      230, 1, null,                 array['school','nursery-childcare','tutoring-language'], true),
  ('business-founders', 'Behind the Business',       'Founder profiles — how they actually built it.',                                  'business',      250, 4, 'behind-the-business',  '{}', true),
  ('business-economy',  'Economy & Investment',      'Money, funds, the forces shaping the island.',                                    'business',      260, 2, null,                 array['bank','accountant','business-consultant'], true),
  ('business-tech',     'Tech & Startups',           'The companies betting on Cyprus as a base.',                                      'business',      270, 2, null,                 array['web-it','marketing-agency'], true),
  ('culture-art',       'Art & Galleries',           'Shows, artists and the collectors around them.',                                  'culture',       290, 2, 'tastemakers',        array['museum'], true),
  ('culture-heritage',  'Heritage & Archaeology',    'The deep past, told for the present.',                                             'culture',       300, 2, null,                 array['archaeological-site'], true),
  ('culture-stage',     'Music, Film & Stage',       'Performance across the island.',                                                  'culture',       310, 2, null,                 array['theatre-arts'], true),
  ('agenda',            'The Agenda',                'The essential events calendar, curated.',                                         'culture',       320, 4, null,                 array['event-venue'], true),
  ('people-tastemakers','The Tastemakers',           'Long-form conversations with those shaping how Cyprus lives well.',               'people',        340, 4, 'tastemakers',        '{}', true),
  ('people-fivemin',    'Five Minutes With',         'Fast, quotable Q&As with someone worth knowing this week.',                       'people',        350, 8, 'five-min',           '{}', true),
  ('people-society',    'Society',                   'Parties, openings and the social calendar.',                                      'people',        360, 2, null,                 array['event-venue'], true),
  ('cyprus',            'News & Now',                'What''s happening on the island (absorbs the former "Cyprus" and "World").',      'the-island',    380, 4, null,                 '{}', true),
  ('island-essentials', 'Essentials & Civic',        'Pharmacies, emergencies, how-things-work — the concierge''s knowledge, published.','the-island',   390, 2, 'concierge-meets',    array['pharmacy','hospital','doctor-clinic'], true),
  ('island-guides',     'Guides',                    'Evergreen, practical how-to for residents and movers.',                           'the-island',    400, 2, null,                 '{}', true),
  ('world',             'World',                     'Legacy international bucket — folded into News & Now.',                            'the-island',    410, 0, null,                 '{}', false)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, parent_key = excluded.parent_key,
  sort = excluded.sort, monthly_target = excluded.monthly_target, franchise_key = excluded.franchise_key,
  dir_groups = excluded.dir_groups, active = excluded.active, updated_at = now();

-- ── report ────────────────────────────────────────────────────────────────────
select
  'editorial sections seeded' as status,
  (select count(*) from public.editorial_sections where parent_key is null and active) as departments,
  (select count(*) from public.editorial_sections where parent_key is not null and active) as subcategories,
  (select coalesce(sum(monthly_target),0) from public.editorial_sections where parent_key is not null and active) as monthly_target_total;
