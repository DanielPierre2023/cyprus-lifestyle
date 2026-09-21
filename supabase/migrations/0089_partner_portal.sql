-- 0089_partner_portal.sql
-- Roadmap item 09: partner self-service. A business owner claims their listing by
-- proving control of the email already on file for it (a one-time token — NO new
-- account system), then submits edits that go to a MODERATION queue before they touch
-- the live listing. Two tables + a safe, whitelisted apply function. Additive & idempotent.

-- Ownership claim: a token is emailed to the listing's on-file address; verifying it
-- proves control. Admin still approves before edits can be applied.
create table if not exists public.listing_claims (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  slug          text not null,
  email         text not null,                       -- who is claiming (must match on-file)
  token         text not null,                       -- one-time verification token
  token_expires timestamptz not null,
  status        text not null default 'pending',     -- pending | verified | approved | rejected
  verified_at   timestamptz,
  approved_at   timestamptz,
  reviewed_by   text
);
create index if not exists listing_claims_slug_idx  on public.listing_claims (slug, created_at desc);
create unique index if not exists listing_claims_token_uidx on public.listing_claims (token);

-- Moderation queue: proposed changes to a listing, only from a verified claim.
create table if not exists public.listing_edit_requests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  slug         text not null,
  claim_id     uuid references public.listing_claims(id) on delete set null,
  fields       jsonb not null default '{}',          -- proposed {phone,email,url,summary_en,...,partner_pitch}
  status       text not null default 'pending',       -- pending | approved | rejected
  reviewed_by  text,
  reviewed_at  timestamptz,
  note         text
);
create index if not exists listing_edit_requests_status_idx on public.listing_edit_requests (status, created_at desc);
create index if not exists listing_edit_requests_slug_idx   on public.listing_edit_requests (slug, created_at desc);

alter table public.listing_claims        enable row level security;
alter table public.listing_edit_requests enable row level security;
-- Admin-only read/manage; the app writes claims/edits through the service role after
-- its own token checks, so no public policy is granted (safer than an anon insert here).
drop policy if exists "listing_claims admin" on public.listing_claims;
create policy "listing_claims admin" on public.listing_claims for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "listing_edit_requests admin" on public.listing_edit_requests;
create policy "listing_edit_requests admin" on public.listing_edit_requests for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Apply an approved edit to the live listing — SECURITY: only a WHITELIST of safe
-- fields is ever written, so a malicious payload can't touch status, featured, ratings,
-- coordinates, etc. Called by the admin approve action (service role).
create or replace function public.apply_listing_edit(p_request_id uuid, p_reviewer text default null)
returns boolean language plpgsql as $$
declare r public.listing_edit_requests; f jsonb; k text;
  allowed text[] := array['phone','email','url','partner_pitch',
    'summary_en','summary_el','summary_ro','summary_ar','summary_de','summary_pl','summary_ru'];
begin
  select * into r from public.listing_edit_requests where id = p_request_id;
  if not found or r.status <> 'pending' then return false; end if;
  f := coalesce(r.fields, '{}'::jsonb);
  foreach k in array allowed loop
    if f ? k then
      execute format('update public.directory_listings set %I = $1 where slug = $2', k)
        using nullif(btrim(f ->> k), ''), r.slug;
    end if;
  end loop;
  update public.listing_edit_requests
     set status = 'approved', reviewed_by = p_reviewer, reviewed_at = now() where id = p_request_id;
  return true;
end $$;

-- report
select 'partner_portal' as check,
       (select count(*) from information_schema.tables where table_schema='public'
          and table_name in ('listing_claims','listing_edit_requests')) as tbls,
       (select count(*) from information_schema.routines where routine_schema='public' and routine_name='apply_listing_edit') as fns;
