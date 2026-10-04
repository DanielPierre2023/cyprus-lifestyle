-- =============================================================================
-- CYPRUS LIFESTYLE — Experiences catalogue (bookable activities)
-- Apply in the Supabase Dashboard → SQL Editor. Idempotent; safe to re-run.
-- ADDITIVE ONLY: one new table. No existing table, view or policy is changed.
-- =============================================================================
-- Our own catalogue of bookable experiences (boat trips, diving, jeep safaris,
-- wine tours …): OUR titles, summaries, kinds, tags, price bands and map points,
-- built from public facts (data/activities/cyprus-experiences.csv). Each entry
-- links out to book with our booking partner (GetYourGuide, partner id appended at
-- render time). No third-party descriptions, photos, ratings or reviews are stored.
--
-- Location: lat/lng is an APPROXIMATE AREA from our own gazetteer — the landmark the
-- experience is about (geo_precision = 'landmark') or the departure town ('town') —
-- spread so stacked experiences each get a pin. Never an exact meeting point.
--
-- Occupied north (same geography as 0062): experiences that VISIT northern sites are
-- flagged visits_north = true and are only shown when ACTIVITIES_NORTH_TOURS=show.
-- =============================================================================

create table if not exists public.activities (
  id               bigint generated always as identity primary key,
  provider         text not null default 'getyourguide',   -- booking partner
  external_id      text not null,                          -- partner product id (the booking link)
  slug             text,                                   -- our id
  title            text not null,                          -- our wording
  summary          text,                                   -- our wording (grounds the concierge)
  kind             text not null,                          -- lib/activities/classify.ts ACTIVITY_KINDS key
  tags             text[] not null default '{}',           -- pickup, meal, private, small-group, family, sunset …
  district         text,                                   -- directory district key (paphos, limassol, …)
  town             text,                                   -- departure, e.g. 'Paphos', 'Latchi'
  landmark         text,                                   -- e.g. 'Blue Lagoon (Akamas)'
  lat              double precision,
  lng              double precision,
  geo_precision    text check (geo_precision is null or geo_precision in ('landmark', 'town')),
  duration_min     integer,
  duration_label   text,                                   -- '4 h', '2–6 h', 'full day'
  price_band       text check (price_band is null or price_band in ('€', '€€', '€€€', '€€€€')),
  price_basis      text check (price_basis is null or price_basis in ('person', 'group')),
  group_max        integer,
  booking_url      text,                                   -- partner page; the partner id is appended at render time
  priority         smallint not null default 0 check (priority between 0 and 3),  -- editorial pick: 3 = top
  visits_north     boolean not null default false,
  north_site       text,
  status           text not null default 'active' check (status in ('active', 'hidden')),
  hidden_reason    text,
  source           text,                                   -- 'catalogue' (seeded) | 'manual' (kept by re-seeds)
  curated_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (provider, external_id)
);

-- Upgrade path: an earlier draft of this table stored copied third-party content
-- (titles, descriptions, photos, ratings, review counts, badges). Bring it to the
-- catalogue shape and DROP those columns, so none of that content stays in the database.
alter table public.activities
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists landmark text,
  add column if not exists duration_label text,
  add column if not exists price_band text,
  add column if not exists group_max integer,
  add column if not exists booking_url text,
  add column if not exists priority smallint not null default 0,
  add column if not exists curated_at timestamptz;
alter table public.activities
  drop column if exists url,
  drop column if exists supplier,
  drop column if exists poi_name,
  drop column if exists price_eur,
  drop column if exists price_before_eur,
  drop column if exists duration,
  drop column if exists features,
  drop column if exists badge,
  drop column if exists rating,
  drop column if exists review_count,
  drop column if exists itinerary,
  drop column if exists description,
  drop column if exists images,
  drop column if exists fetched_at;

comment on table public.activities is 'Cyprus Lifestyle experiences catalogue: our own entries for bookable experiences, linking out to book with the booking partner (approximate area, never an exact meeting point).';

alter table public.activities enable row level security;

drop policy if exists "activities public read active" on public.activities;
create policy "activities public read active"
  on public.activities for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "activities admin all" on public.activities;
create policy "activities admin all"
  on public.activities for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists activities_active_idx   on public.activities (status, district) where status = 'active';
create index if not exists activities_kind_idx     on public.activities (kind) where status = 'active';
create index if not exists activities_coords_idx   on public.activities (lat, lng) where lat is not null;

-- Verification (writes nothing)
select 'activities table ready' as check, count(*) as rows from public.activities;
