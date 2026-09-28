-- ============================================================================
-- Cyprus Lifestyle — 0123 · Section sponsors ("Presented by …")
-- ----------------------------------------------------------------------------
-- The section-sponsorship product is sold and fulfilled (0038 drafts an inactive
-- banner on purchase), but nothing on the section pages actually renders a
-- sponsor. This mapping table drives the "Presented by <name>" lockup on a public
-- section page: one active row per section_key, optionally linked to the banner
-- and CRM account that paid for it.
--
-- Server reads via the service role (getSectionSponsor), so there is NO public
-- policy — only an admin manage policy, matching the other admin tables.
-- Additive & idempotent (safe to re-run).
-- ============================================================================

create table if not exists public.section_sponsors (
  id           uuid primary key default gen_random_uuid(),
  section_key  text not null unique,
  sponsor_name text,
  sponsor_logo text,
  sponsor_url  text,
  banner_id    uuid references public.sponsor_banners(id) on delete set null,
  org_id       uuid references public.crm_orgs(id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists section_sponsors_active_idx on public.section_sponsors (section_key) where is_active;

alter table public.section_sponsors enable row level security;
drop policy if exists "Admins manage section sponsors" on public.section_sponsors;
create policy "Admins manage section sponsors" on public.section_sponsors
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

select 'section sponsors ready' as status,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='section_sponsors') as columns;
