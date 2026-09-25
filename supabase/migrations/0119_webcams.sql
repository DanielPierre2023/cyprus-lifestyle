-- 0119_webcams.sql
-- ============================================================================
-- Live "Cyprus Now" webcams — a curated, filterable registry of existing Cyprus
-- cameras (aggregation model: we link out / embed permitted sources, we do NOT
-- re-host third-party streams). Each cam can be bound to a directory listing and
-- carries coordinates so it can render as a layer on the island map.
--
-- Providers:
--   youtube  — embed_ref = YouTube video id (embedded via youtube-nocookie)
--   windy    — embed_ref = a Windy PUBLIC embed player URL (official, allowed)
--   iframe   — embed_ref = a provider's OWN embeddable iframe src (with permission)
--   link     — external_url opens on the source site (no embed) — the safe default
--   snapshot — a periodic still image (external_url), not live video
--
-- Embedding policy (why some cams embed inline and others link out):
--   • windy/youtube cams embed INLINE on /live — these networks publish official,
--     free, referrer-safe embed players that our CSP already allows
--     (frame-src *.windy.com + youtube-nocookie).
--   • SkylineWebcams cams stay 'link': their terms forbid third-party embedding and
--     they referrer-block it, so an inline frame would just fail.
--   • The paralieslive Protaras/Paralimni beach cams stay 'link': they render their
--     stream via a client-side player with no public embed, so putting them inline
--     would mean re-hosting their feed — the line we don't cross.
--   • Northern-Cyprus cams are EXCLUDED entirely — never embedded and never linked. The
--     delete below also removes any that a previous run of this file inserted.
--   • Snapshot/venue cams without a public embed stay 'link'/'snapshot' until their
--     operator grants an embeddable iframe.
--
-- RLS: public reads only published cams; all writes are admin-only. Follows the
-- same posture as the rest of the schema (published-only anon read + has_role admin).
-- ============================================================================

create table if not exists public.webcams (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name_en      text,
  name_el      text,
  name_ro      text,
  name_ar      text,
  name_de      text,
  name_pl      text,
  name_ru      text,
  provider     text not null default 'link' check (provider in ('youtube','windy','iframe','link','snapshot')),
  embed_ref    text,                 -- youtube id / windy embed URL / iframe src (per provider)
  external_url text,                 -- canonical source page (used by 'link'/'snapshot')
  thumb_url    text,                 -- optional preview image
  lat          double precision,
  lng          double precision,
  district     text,                 -- Cyprus district (Famagusta, Larnaca, Limassol, Paphos, Nicosia, Kyrenia)
  area         text,                 -- human place label (e.g. 'Protaras', 'Ayia Napa')
  category     text not null default 'beach' check (category in ('beach','mountain','city','village')),
  tags         text[] not null default '{}',
  listing_id   uuid references public.directory_listings(id) on delete set null,
  status       text not null default 'draft' check (status in ('draft','published')),
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.webcams is 'Curated registry of Cyprus live webcams (aggregation: link/embed permitted sources, never re-hosting third-party streams).';

alter table public.webcams enable row level security;

drop policy if exists "webcams public read published" on public.webcams;
create policy "webcams public read published"
  on public.webcams for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "webcams admin all" on public.webcams;
create policy "webcams admin all"
  on public.webcams for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists webcams_published_idx on public.webcams (status, sort) where status = 'published';
create index if not exists webcams_category_idx  on public.webcams (category) where status = 'published';
create index if not exists webcams_district_idx  on public.webcams (district) where status = 'published';
create index if not exists webcams_listing_idx   on public.webcams (listing_id);
create index if not exists webcams_geo_idx        on public.webcams (lat, lng) where status = 'published';

-- ── Remove northern-Cyprus cams (policy: none on this site, embedded or linked) ─
-- Kyrenia district is entirely in the north; the tag catches any others. This runs
-- before the seed so re-running the file also cleans up rows from a previous version.
delete from public.webcams
  where district = 'Kyrenia' or ('northern-cyprus' = any(tags));

-- ── Seed: the curated Cyprus webcam set ──────────────────────────────────────
-- INLINE-EMBED cams use provider 'windy' with a Windy public embed player URL
-- (https://webcams.windy.com/webcams/public/embed/player/<ID>/day?autoresize=1) —
-- these play right in the /live grid. LINK cams open their own source page.
-- Windy ids verified against newsincyprus.com/cyprus-cams (their declared cam↔id
-- pairing) and the existing seed. Re-running this file refreshes every seed row
-- (embed_ref included), so it safely upgrades the previously link-only rows.
insert into public.webcams (slug, name_en, provider, embed_ref, external_url, lat, lng, district, area, category, tags, status, sort)
values
  -- ── INLINE EMBEDS (Windy public player) — play in-page on /live ──────────────
  ('nissi-beach-ayia-napa',   'Nissi Beach',      'windy', 'https://webcams.windy.com/webcams/public/embed/player/1706342674/day?autoresize=1', 'https://vassosnissiplage.com/live-camera/', 34.9874851, 33.9678021, 'Famagusta', 'Ayia Napa', 'beach',    array['blue-flag','family-friendly'], 'published', 110),
  ('troodos-jubilee',         'Troodos panorama (Jubilee Hotel)', 'windy', 'https://webcams.windy.com/webcams/public/embed/player/1611067697/day?autoresize=1', 'https://kitasweather.com/cyprus-weather-camera/troodos-jubilee-hotel-cam/', 34.9233165, 32.8776077, 'Limassol', 'Troodos', 'mountain', array['views','hiking'], 'published', 140),
  ('pera-pedi',               'Pera Pedi',        'windy', 'https://webcams.windy.com/webcams/public/embed/player/1671723030/day?autoresize=1', 'https://www.windy.com/webcams/1671723030', 34.8606896, 32.8743527, 'Limassol', 'Pera Pedi',        'village', array['wine-village'], 'published', 160),
  ('agios-athanasios',        'Agios Athanasios', 'windy', 'https://webcams.windy.com/webcams/public/embed/player/1793900308/day?autoresize=1', 'https://www.windy.com/webcams/1793900308', 34.7103009, 33.0517218, 'Limassol', 'Agios Athanasios', 'village', array['village-view'], 'published', 170),
  ('vavatsinia',              'Vavatsinia',       'windy', 'https://webcams.windy.com/webcams/public/embed/player/1653838512/day?autoresize=1', 'https://www.windy.com/webcams/1653838512', 34.8934727, 33.2289324, 'Larnaca',  'Vavatsinia',       'village', array['village-view'], 'published', 180),
  ('pissouri',                'Pissouri',         'windy', 'https://webcams.windy.com/webcams/public/embed/player/1736266979/day?autoresize=1', 'https://www.windy.com/webcams/1736266979', 34.6689046, 32.7010481, 'Limassol', 'Pissouri',         'village', array['coastal'], 'published', 190),
  -- New inline-embed cams (fill Paphos + Limassol gaps)
  ('tsada-paphos',            'Tsada',            'windy', 'https://webcams.windy.com/webcams/public/embed/player/1613392407/day?autoresize=1', 'https://kitasweather.com/cyprus-weather-camera/tsada-cam/', null, null, 'Paphos',   'Tsada',        'village', array['views','vineyards'], 'published', 200),
  ('parekklisia-limassol',    'Parekklisia',      'windy', 'https://webcams.windy.com/webcams/public/embed/player/1671722912/day?autoresize=1', 'https://kitasweather.com/cyprus-weather-camera/prastio-cam/', null, null, 'Limassol', 'Parekklisia',  'village', array['village-view'], 'published', 210),
  ('fasoula-limassol',        'Fasoula',          'windy', 'https://webcams.windy.com/webcams/public/embed/player/1612599638/day?autoresize=1', 'https://kitasweather.com/cyprus-weather-camera/fasoyla-cam/', null, null, 'Limassol', 'Fasoula',      'village', array['village-view'], 'published', 220),

  -- ── LINK-OUT cams (no public embed / embedding not permitted) ────────────────
  -- Protaras & Paralimni beaches (paralieslive — client-side player, no public embed)
  ('fig-tree-bay-protaras',  'Fig Tree Bay',   'link', null, 'https://www.paralieslive.com/streams/fig-tree-bay-camera-1',  35.014189,  34.057184,  'Famagusta', 'Protaras',  'beach', array['blue-flag','calm'],            'published', 10),
  ('pernera-beach-protaras', 'Pernera Beach',  'link', null, 'https://www.paralieslive.com/streams/pernera-beach-camera-1', 35.0330067, 34.0406852, 'Famagusta', 'Protaras',  'beach', array['family-friendly'],             'published', 20),
  ('kalamies-beach-protaras','Kalamies Beach', 'link', null, 'https://www.paralieslive.com/streams/kalamies-beach-camera-1',35.0367490, 34.0377150, 'Famagusta', 'Protaras',  'beach', array['sandy-cove'],                  'published', 30),
  ('kapparis-beach-paralimni','Kapparis Beach','link', null, 'https://www.paralieslive.com/streams/kapparis-beach-camera-1',35.0584628, 34.0111471, 'Famagusta', 'Paralimni', 'beach', array['quieter'],                     'published', 40),
  ('malama-beach-paralimni', 'Malama Beach',   'link', null, 'https://www.paralieslive.com/streams/malama-beach-camera-1',  35.0549374, 34.0151304, 'Famagusta', 'Paralimni', 'beach', array['local-favourite'],             'published', 50),
  ('nisia-lombardi-paralimni','Nisia Lombardi','link', null, 'https://www.paralieslive.com/streams/nisia-lombardi-camera-1',35.0367490, 34.0377150, 'Famagusta', 'Paralimni', 'beach', array['rocky-islets'],                'published', 60),
  ('potami-beach-paralimni', 'Potami Beach',   'link', null, 'https://www.paralieslive.com/streams/potami-beach-camera-1',  35.0287626, 34.0450075, 'Famagusta', 'Paralimni', 'beach', array['small-cove'],                  'published', 70),
  ('vryssi-beach-protaras',  'Vryssi Beach',   'link', null, 'https://www.paralieslive.com/streams/sunrise-beach-camera-1', 35.0125000, 34.0580000, 'Famagusta', 'Protaras',  'beach', array['two-camera-angles'],           'published', 80),
  ('vrysoudia-beach-paralimni','Vrysoudia Beach','link',null,'https://www.paralieslive.com/streams/vrysoudia-beach-camera-1',35.0442497,34.0313942, 'Famagusta', 'Paralimni', 'beach', array['blue-flag'],                   'published', 90),
  ('vyzakia-beach-paralimni','Vyzakia Beach',  'link', null, 'https://www.paralieslive.com/streams/vyzakia-beach-camera-1', 35.0370000, 34.0050000, 'Famagusta', 'Paralimni', 'beach', array['quiet-stretch'],               'published', 100),
  -- (Denizkizi/Kyrenia and any other northern-Cyprus cams are intentionally omitted — see the delete above.)
  -- Troodos ski slope (Cyprus Ski Club — venue cam, no public embed)
  ('troodos-north-face',     'Troodos — North Face slope (Cyprus Ski Club)', 'link', null, 'https://www.cyprusski.com/north-face-camera', 34.9366134, 32.8649502, 'Limassol', 'Troodos, Mount Olympus', 'mountain', array['skiing','winter'], 'published', 130),
  -- Larnaca seafront (SkylineWebcams — embedding not permitted, link only)
  ('larnaca-promenade',      'Larnaca seafront (Finikoudes)', 'link', null, 'https://www.skylinewebcams.com/en/webcam/cyprus/larnaca-district/larnaca/larnaca-promenade.html', 34.9110000, 33.6367000, 'Larnaca', 'Larnaca', 'city', array['promenade','marina'], 'published', 150)
on conflict (slug) do update set
  name_en = excluded.name_en, provider = excluded.provider, embed_ref = excluded.embed_ref,
  external_url = excluded.external_url, lat = excluded.lat, lng = excluded.lng,
  district = excluded.district, area = excluded.area, category = excluded.category,
  tags = excluded.tags, status = excluded.status;
