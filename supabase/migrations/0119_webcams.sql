-- 0119_webcams.sql
-- ============================================================================
-- Live "Cyprus Now" webcams — a curated, filterable registry of existing Cyprus
-- cameras (aggregation model: we link out / embed permitted sources, we do NOT
-- re-host third-party streams). Each cam can be bound to a directory listing and
-- carries coordinates so it can render as a layer on the island map.
--
-- Providers:
--   youtube  — embed_ref = YouTube video id (embedded via youtube-nocookie)
--   windy    — embed_ref = Windy webcam id (official Windy embed)
--   iframe   — embed_ref = a provider's OWN embeddable iframe src (with permission)
--   link     — external_url opens on the source site (no embed) — the safe default
--   snapshot — a periodic still image (external_url), not live video
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
  embed_ref    text,                 -- youtube id / windy id / iframe src (per provider)
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

-- ── Seed: a few unambiguous DIRECT sources (venue / institution cams) ────────
-- The full registry is populated by the curation pass (scrape of the public cam
-- index for facts + a geocode pass to fill lat/lng, then swap beach cams to
-- YouTube-Live / Windy / owned embeds where available). These three are direct,
-- publicly-listed source pages, so we link out to them. Coordinates below were
-- geocoded via Nominatim (the same service lib/geo.ts uses). Re-running the file
-- refreshes coords for these rows without disturbing anything you add later.
insert into public.webcams (slug, name_en, provider, external_url, lat, lng, district, area, category, tags, status, sort)
values
  ('troodos-north-face', 'Troodos — North Face slope (Cyprus Ski Club)', 'link', 'https://www.cyprusski.com/north-face-camera', 34.9366134, 32.8649502, 'Limassol', 'Troodos, Mount Olympus', 'mountain', array['skiing','winter'], 'published', 10),
  ('nissi-beach-ayia-napa', 'Nissi Beach', 'link', 'https://vassosnissiplage.com/live-camera/', 34.9874851, 33.9678021, 'Famagusta', 'Ayia Napa', 'beach', array['blue-flag','family-friendly'], 'published', 20),
  ('denizkizi-kyrenia', 'Denizkizi Beach', 'link', 'https://denizkizi.com/live/', 35.3501672, 33.2247541, 'Kyrenia', 'Kyrenia', 'beach', array['palm-lined'], 'published', 30)
on conflict (slug) do update set lat = excluded.lat, lng = excluded.lng, external_url = excluded.external_url, status = excluded.status;
