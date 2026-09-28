-- ============================================================================
-- Cyprus Lifestyle — 0122 · Sponsor banners → full seven languages
-- ----------------------------------------------------------------------------
-- sponsor_banners shipped with copy columns for en/el/ro/ar only (0006). The
-- site now serves seven locales, and the Banner Editor lets admins fill each
-- one, so add the missing German / Polish / Russian copy columns for headline,
-- body and CTA. Purely additive & idempotent — a no-op if prod already has them.
-- ============================================================================

alter table public.sponsor_banners add column if not exists headline_de text;
alter table public.sponsor_banners add column if not exists headline_pl text;
alter table public.sponsor_banners add column if not exists headline_ru text;
alter table public.sponsor_banners add column if not exists body_de     text;
alter table public.sponsor_banners add column if not exists body_pl     text;
alter table public.sponsor_banners add column if not exists body_ru     text;
alter table public.sponsor_banners add column if not exists cta_de      text;
alter table public.sponsor_banners add column if not exists cta_pl      text;
alter table public.sponsor_banners add column if not exists cta_ru      text;

select 'sponsor banner languages ready' as status,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='sponsor_banners'
       and column_name in ('headline_de','headline_pl','headline_ru',
                           'body_de','body_pl','body_ru',
                           'cta_de','cta_pl','cta_ru')) as lang_columns;
