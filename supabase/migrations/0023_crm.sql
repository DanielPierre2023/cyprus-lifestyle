-- ============================================================================
-- Cyprus Lifestyle — 0023 · CRM (the contact book & sales pipeline)
--   crm_orgs · crm_contacts · crm_deals · crm_activities · crm_suppression
--   + osm_id/osm_type on directory_listings (idempotent OSM import)
--
-- Admin-only throughout (public.has_role(auth.uid(),'admin')). Nothing public.
-- Requires the directory tables (RUN_FIRST / 0018) already applied. Run once.
--
-- GDPR: crm_contacts holds personal data. consent_status + opt_out_at + the
-- crm_suppression registry are the compliance spine; source_url is provenance.
-- ============================================================================

-- ── directory_listings: OSM provenance (for the importer's idempotent upsert) ──
alter table public.directory_listings
  add column if not exists osm_id   text,
  add column if not exists osm_type text;
-- Full (non-partial) unique index so it can serve as an ON CONFLICT (osm_id)
-- arbiter for the importer's upsert. Postgres treats NULLs as distinct, so the
-- many curated rows with a NULL osm_id are unaffected.
create unique index if not exists directory_osm_id_uidx
  on public.directory_listings (osm_id);

-- ── crm_orgs — the business / asset we may market to (a legal person) ──────────
create table if not exists public.crm_orgs (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  category             text,                                  -- restaurant|hotel|law-relocation|car-rental|beauty-spa|retail|...
  tier                 text not null default 'C' check (tier in ('A','B','C')),
  district             text,
  website              text,
  email                text,                                  -- general/role address (info@…)
  phone                text,
  directory_listing_id uuid references public.directory_listings(id) on delete set null,
  status               text not null default 'prospect',      -- prospect|contacted|engaged|proposal|won|live|lost|dormant
  notes                text,
  source_url           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists crm_orgs_cat_idx    on public.crm_orgs (category, tier, status);
create index if not exists crm_orgs_status_idx on public.crm_orgs (status);
create index if not exists crm_orgs_listing_idx on public.crm_orgs (directory_listing_id);

-- ── crm_contacts — a natural person at an org (has data-subject rights) ────────
create table if not exists public.crm_contacts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.crm_orgs(id) on delete cascade,
  name            text,
  role            text,
  email           text,
  phone           text,
  is_role_address boolean not null default false,             -- true = info@/sales@ (lighter-risk under Cyprus B2B rules)
  consent_status  text not null default 'none',               -- none|legitimate-interest|consent|opted-out
  opt_out_at      timestamptz,
  source_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists crm_contacts_org_idx   on public.crm_contacts (org_id);
create index if not exists crm_contacts_email_idx on public.crm_contacts (lower(email));

-- ── crm_deals — the pipeline ──────────────────────────────────────────────────
create table if not exists public.crm_deals (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.crm_orgs(id) on delete cascade,
  stage          text not null default 'prospect',            -- prospect|contacted|engaged|proposal|won|live|renewal|lost
  product        text,                                        -- listed|featured|partner|banner|feature|newsletter|event|bespoke
  value_eur      numeric,
  owner          text,
  probability    integer default 0,
  next_action_at timestamptz,
  lost_reason    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists crm_deals_org_idx    on public.crm_deals (org_id);
create index if not exists crm_deals_stage_idx  on public.crm_deals (stage);
create index if not exists crm_deals_next_idx   on public.crm_deals (next_action_at) where next_action_at is not null;

-- ── crm_activities — everything that happened (emails, opens, replies, calls) ──
create table if not exists public.crm_activities (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.crm_orgs(id) on delete cascade,
  deal_id     uuid references public.crm_deals(id) on delete set null,
  contact_id  uuid references public.crm_contacts(id) on delete set null,
  type        text not null,                                  -- email|reply|open|click|call|meeting|note
  sequence_id text,                                           -- which cadence + step
  subject     text,
  body        text,
  opened_at   timestamptz,
  clicked_at  timestamptz,
  replied_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists crm_activities_org_idx  on public.crm_activities (org_id, created_at desc);
create index if not exists crm_activities_deal_idx on public.crm_activities (deal_id);

-- ── crm_suppression — do-not-contact registry (opt-out / bounce / complaint) ──
create table if not exists public.crm_suppression (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  domain     text,
  reason     text not null default 'opt-out',                 -- opt-out|bounce|complaint|manual
  created_at timestamptz not null default now()
);
create unique index if not exists crm_suppression_email_uidx on public.crm_suppression (lower(email)) where email is not null;
create index if not exists crm_suppression_domain_idx on public.crm_suppression (lower(domain));

-- ── updated_at triggers ───────────────────────────────────────────────────────
drop trigger if exists set_updated_at_crm_orgs on public.crm_orgs;
create trigger set_updated_at_crm_orgs before update on public.crm_orgs
  for each row execute function public.update_updated_at();
drop trigger if exists set_updated_at_crm_contacts on public.crm_contacts;
create trigger set_updated_at_crm_contacts before update on public.crm_contacts
  for each row execute function public.update_updated_at();
drop trigger if exists set_updated_at_crm_deals on public.crm_deals;
create trigger set_updated_at_crm_deals before update on public.crm_deals
  for each row execute function public.update_updated_at();

-- ── RLS — admin only, fails closed (no anon, no public) ───────────────────────
do $$
declare t text;
begin
  foreach t in array array['crm_orgs','crm_contacts','crm_deals','crm_activities','crm_suppression']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "crm admin all" on public.%I;', t);
    execute format($p$create policy "crm admin all" on public.%I for all to authenticated
      using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));$p$, t);
  end loop;
end $$;
