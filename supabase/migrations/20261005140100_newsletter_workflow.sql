-- 20261005140100_newsletter_workflow.sql
-- Phase 1 · Increment 1.3 — the Friday newsletter: draft → preview → test → APPROVE → send (resumable, never twice).
-- Idempotent; adds nullable columns, one unique index and one table. Changes no existing data.
-- Run in: Supabase → SQL Editor.
--
-- Campaign life cycle (newsletter_campaigns.status):
--   draft     prepared automatically every Friday (or by the "Prepare" button); nothing is sent
--   approved  an administrator pressed "Approve & send"; the sender picks it up (immediately, then every 3 minutes)
--   sending   delivery in progress (large lists are sent in several passes)
--   sent      every confirmed, active subscriber of that edition has been handled
--   cancelled an administrator discarded the draft
-- One campaign per (ISO week, language): preparing twice cannot create duplicates.
-- newsletter_deliveries remembers every address that has been handled for a campaign (an address is CLAIMED before it is
-- mailed), so a retry, a double click or two overlapping passes can never mail the same person twice.

alter table public.newsletter_campaigns
  add column if not exists edition_week     text,                          -- e.g. 2026-W41
  add column if not exists approved_at      timestamptz,
  add column if not exists approved_by      uuid,
  add column if not exists send_started_at  timestamptz,
  add column if not exists failed_count     integer not null default 0,
  add column if not exists sponsor_ids      uuid[]  not null default '{}',  -- sole-sponsor rows included in this edition
  add column if not exists article_slugs    text[]  not null default '{}';  -- articles included (to detect "nothing new")

create unique index if not exists newsletter_campaigns_week_lang_uidx
  on public.newsletter_campaigns (edition_week, target_language) where edition_week is not null;

create table if not exists public.newsletter_deliveries (
  campaign_id uuid not null references public.newsletter_campaigns (id) on delete cascade,
  email       text not null,
  status      text not null check (status in ('queued', 'sent', 'failed')),   -- queued = claimed by a sending pass
  error       text,
  at          timestamptz not null default now(),
  primary key (campaign_id, email)
);
create index if not exists newsletter_deliveries_campaign_idx on public.newsletter_deliveries (campaign_id, status);

alter table public.newsletter_deliveries enable row level security;
drop policy if exists "newsletter deliveries admin read" on public.newsletter_deliveries;
create policy "newsletter deliveries admin read" on public.newsletter_deliveries
  as permissive for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
revoke all on public.newsletter_deliveries from public, anon, authenticated;
grant select on public.newsletter_deliveries to authenticated;               -- limited to admins by the policy
grant all    on public.newsletter_deliveries to service_role;

-- VERIFY: select column_name from information_schema.columns where table_name = 'newsletter_campaigns' and column_name in
--   ('edition_week','approved_at','approved_by','send_started_at','failed_count','sponsor_ids','article_slugs');   -- 7 rows
