-- ============================================================================
-- Cyprus Lifestyle — 0006 · Advertising
--   sponsor_banners (4-lang) · ad_pricing (4-lang) · ad_inquiries
--   increment_banner_impressions() · increment_banner_clicks()
-- Adjustments: EL/AR copy columns added; colour defaults set to the Cyprus
-- Lifestyle palette (obsidian ground, gold accent); currency already EUR in TT.
-- ============================================================================

-- ── sponsor_banners ──────────────────────────────────────────────────────────
create table if not exists public.sponsor_banners (
  id             uuid primary key default gen_random_uuid(),
  advertiser_name text,
  contact_email  text,
  headline_en    text,
  headline_el    text,
  headline_ro    text,
  headline_ar    text,
  body_en        text,
  body_el        text,
  body_ro        text,
  body_ar        text,
  cta_en         text default 'Discover →',
  cta_el         text default 'Ανακαλύψτε →',
  cta_ro         text default 'Descoperă →',
  cta_ar         text default 'اكتشف ←',
  url            text,
  image_url      text,
  bg_color       text default '#0B0E11',   -- Cyprus Lifestyle obsidian
  accent_color   text default '#C9A24C',   -- Cyprus Lifestyle gold
  slot           text default 'sidebar-homepage',
  weight         integer default 1,
  is_active      boolean default true,
  start_date     date,
  end_date       date,
  impressions    bigint default 0,
  clicks         bigint default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.sponsor_banners enable row level security;

-- Verbatim from TT.
drop policy if exists "Public can read active banners" on public.sponsor_banners;
create policy "Public can read active banners" on public.sponsor_banners for select to anon, authenticated
  using (is_active = true
         and (start_date is null or start_date <= current_date)
         and (end_date   is null or end_date   >= current_date));
drop policy if exists "admins_manage_sponsor_banners" on public.sponsor_banners;
create policy "admins_manage_sponsor_banners" on public.sponsor_banners for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.sponsor_banners;
create trigger set_updated_at before update on public.sponsor_banners
  for each row execute function public.update_updated_at();

-- Counters — verbatim from TT.
create or replace function public.increment_banner_impressions(banner_id uuid)
returns void language sql security definer set search_path = public, pg_temp
as $$ update public.sponsor_banners set impressions = impressions + 1 where id = banner_id; $$;

create or replace function public.increment_banner_clicks(banner_id uuid)
returns void language sql security definer set search_path = public, pg_temp
as $$ update public.sponsor_banners set clicks = clicks + 1 where id = banner_id; $$;

-- ── ad_pricing (public rate card) ────────────────────────────────────────────
create table if not exists public.ad_pricing (
  id          uuid primary key default gen_random_uuid(),
  slot        text unique not null,
  label_en    text,
  label_el    text,
  label_ro    text,
  label_ar    text,
  format      text,
  weekly_eur  numeric,
  monthly_eur numeric,
  yearly_eur  numeric,
  updated_at  timestamptz not null default now()
);
alter table public.ad_pricing enable row level security;
drop policy if exists "Public can read pricing" on public.ad_pricing;
create policy "Public can read pricing"    on public.ad_pricing for select to anon, authenticated using (true);
drop policy if exists "admins_manage_ad_pricing" on public.ad_pricing;
create policy "admins_manage_ad_pricing"    on public.ad_pricing for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.ad_pricing;
create trigger set_updated_at before update on public.ad_pricing
  for each row execute function public.update_updated_at();

-- ── ad_inquiries (outbound rate-card sends) ──────────────────────────────────
create table if not exists public.ad_inquiries (
  id              uuid primary key default gen_random_uuid(),
  recipient_name  text not null,
  recipient_email text not null,
  language        text not null default 'en',   -- TT default was 'ro'
  slots_offered   text,                          -- scalar text in live TT
  sent_at         timestamptz default now()
);
alter table public.ad_inquiries enable row level security;
drop policy if exists "admins_manage_ad_inquiries" on public.ad_inquiries;
create policy "admins_manage_ad_inquiries" on public.ad_inquiries for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
