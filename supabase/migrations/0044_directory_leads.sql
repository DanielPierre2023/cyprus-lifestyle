-- ============================================================================
-- Cyprus Lifestyle — 0044 · Directory leads (enquiries on a listing)
--   Backs the "Request info" form on every listing hub — the lead-gen layer of
--   the directory business model (verified/featured businesses receive enquiries).
--   Mirrors ad_leads. Writes come only from the server route via the service role,
--   so RLS stays closed (no public policies) — the anon client can never read or
--   write this table. Additive & idempotent.
-- ============================================================================

create table if not exists public.directory_leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  listing_slug  text not null,
  listing_type  text,
  listing_name  text,
  name          text not null,
  email         text not null,
  message       text,
  locale        text not null default 'en',
  status        text not null default 'new',   -- new | seen | replied | closed
  org_id        uuid,                            -- optional CRM link
  source        text default 'directory'
);

create index if not exists directory_leads_created_idx on public.directory_leads (created_at desc);
create index if not exists directory_leads_slug_idx    on public.directory_leads (listing_slug);
create index if not exists directory_leads_status_idx  on public.directory_leads (status);

-- RLS on, no policies: only the service role (server routes) may touch it.
alter table public.directory_leads enable row level security;
