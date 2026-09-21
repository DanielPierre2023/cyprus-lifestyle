-- 0081_personalization.sql
-- Living knowledge Phase 4: personalization.
-- • concierge_members.profile — a durable preference profile per SUBSCRIBER (goals,
--   budget, districts of interest, buyer type, interests…) that follows them across
--   devices, unlike the anonymous per-browser concierge_memory. Built only from what
--   the member volunteers; the member can view and clear it, same as today.
-- • directory_listings.partner_pitch — a business's OWN note about its services, current
--   offers and projects, which the concierge may relay (clearly as the business's words,
--   never editorial). The seed of "a business teaching the concierge about itself".
-- Additive & idempotent.

alter table public.concierge_members add column if not exists profile            jsonb not null default '{}'::jsonb;
alter table public.concierge_members add column if not exists profile_updated_at timestamptz;

alter table public.directory_listings add column if not exists partner_pitch    text;
alter table public.directory_listings add column if not exists partner_pitch_at timestamptz;

-- report
select 'personalization' as check,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='concierge_members' and column_name in ('profile','profile_updated_at')) as member_cols,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='directory_listings' and column_name in ('partner_pitch','partner_pitch_at')) as listing_cols;
