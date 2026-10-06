-- 20261008100000_member_card_offers.sql
-- Increment 3.2 — member card, partner offers + redemption log, member lifecycle e-mail stamps.
-- Idempotent. Adds THREE tables and TWO nullable columns; changes no existing behaviour. No function, no trigger, no policy.
-- Run in: Supabase → SQL Editor.   Order: this file only (needs concierge_members, which already exists).
--
--   member_cards         one row per member: the SHA-256 hash of the card's current verification token (the token itself is
--                        derived with an HMAC and is never stored), a rotation counter, and an optional first name / initials
--                        the member chose to show on the card.
--   member_offers        partner offers the owner manages in Admin → Member offers (English text + optional translations,
--                        validity window, active flag). Empty by default: no offer exists until the owner adds one.
--   member_redemptions   one row each time venue staff press "Redeem" on a valid card: offer, member id, time. Nothing else.
--                        At most one row per member per offer per Cyprus calendar day (unique index).
--   concierge_members.grace_notice_at / lapsed_notice_at
--                        stamps so the daily job sends each lifecycle e-mail (payment problem; membership ended) ONCE per event.
--
-- PRIVACY: all three tables reference concierge_members ON DELETE CASCADE, so the existing GDPR erasure of a member's row also
-- removes their card and redemption history. Redemptions hold the member id and a timestamp only (no e-mail, no name, no venue).
-- SECURITY: RLS ON and NO policy on all three tables, privileges revoked from visitors and signed-in users: only the server
-- (service role) can read or write them. No SECURITY DEFINER function is added.

create table if not exists public.member_cards (
  member_id    uuid primary key references public.concierge_members (id) on delete cascade,
  token_hash   text not null,                              -- hex sha256 of the verification token; never the token
  version      integer not null default 1,                 -- bumped when the member (or the owner) replaces the card
  display_name text,                                       -- optional first name / initials, chosen by the member
  created_at   timestamptz not null default now(),
  rotated_at   timestamptz,
  constraint member_cards_version_check check (version >= 1),
  constraint member_cards_name_check    check (display_name is null or char_length(display_name) between 1 and 24)
);
create unique index if not exists member_cards_token_hash_key on public.member_cards (token_hash);

create table if not exists public.member_offers (
  id           uuid primary key default gen_random_uuid(),
  partner_name text not null,
  offer_en     text not null,
  translations jsonb not null default '{}'::jsonb,         -- { "el": "…", "de": "…" } optional; English is the fallback
  valid_from   date,                                       -- inclusive, Cyprus calendar; null = no start
  valid_to     date,                                       -- inclusive; null = no end
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   text,
  constraint member_offers_partner_check check (char_length(partner_name) between 1 and 80),
  constraint member_offers_text_check    check (char_length(offer_en) between 1 and 300),
  constraint member_offers_translations_check check (jsonb_typeof(translations) = 'object'),
  constraint member_offers_window_check  check (valid_from is null or valid_to is null or valid_from <= valid_to)
);
create index if not exists member_offers_active_idx on public.member_offers (active, valid_to);

create table if not exists public.member_redemptions (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references public.member_offers (id) on delete cascade,
  member_id    uuid not null references public.concierge_members (id) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  redeemed_day date not null default ((now() at time zone 'Europe/Nicosia')::date)
);
-- one redemption per member per offer per day (the application passes the Cyprus day explicitly; the default is the same rule)
create unique index if not exists member_redemptions_once_per_day on public.member_redemptions (offer_id, member_id, redeemed_day);
create index        if not exists member_redemptions_offer_idx    on public.member_redemptions (offer_id, redeemed_at desc);
create index        if not exists member_redemptions_member_idx   on public.member_redemptions (member_id);

alter table public.member_cards       enable row level security;
alter table public.member_offers      enable row level security;
alter table public.member_redemptions enable row level security;
revoke all on public.member_cards, public.member_offers, public.member_redemptions from public, anon, authenticated;
grant  all on public.member_cards, public.member_offers, public.member_redemptions to service_role;

alter table public.concierge_members
  add column if not exists grace_notice_at  timestamptz,   -- "payment problem" e-mail sent (cleared again when the card recovers)
  add column if not exists lapsed_notice_at timestamptz;   -- "membership ended" e-mail sent (cleared again if the membership returns)

-- Do not mail people whose membership ended BEFORE this feature existed: mark those as already told.
update public.concierge_members
   set lapsed_notice_at = coalesce(lapsed_at, updated_at, now())
 where status = 'canceled' and lapsed_notice_at is null;

-- VERIFY:  select to_regclass('public.member_cards'), to_regclass('public.member_offers'), to_regclass('public.member_redemptions');   -- 3 names
--          select count(*) from public.member_offers;   -- 0: no offer exists until you add one in Admin → Member offers
