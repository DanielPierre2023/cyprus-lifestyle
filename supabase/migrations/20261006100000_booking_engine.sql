-- 20261006100000_booking_engine.sql
-- Increment 2.2 — booking engine + Island Key priority lane.
-- Idempotent. Adds FOUR new tables and one trigger function; changes no existing table or data.
-- Run in: Supabase → SQL Editor.   Order: this file only (it needs concierge_requests and concierge_members, which already exist).
--
--   bookings                  one row per concierge request that left a way to reach the guest: lane (member | standard), SLA deadline,
--                             assignee, status, and the hash of the guest's private status link.
--   booking_partner_requests  one row per partner the desk asked; the partner answers through a magic link (hash stored, never the link).
--   booking_events            the audit trail of a booking (who did what, when).
--   commission_ledger         what Cyprus Lifestyle expects to earn on a confirmed booking. RECORD ONLY — nothing here pays or invoices anyone.
--
-- PRIVACY: bookings.concierge_request_id → concierge_requests ON DELETE CASCADE, so the existing GDPR erasure of a person's
-- concierge_requests (public.privacy_erase…, by e-mail) also removes their bookings, partner replies and events. Ledger rows
-- keep only the booking reference and the partner (accounting record, no guest data); they survive with booking_id = null.
--
-- SECURITY: all four tables have RLS ON and NO policy — only the server (service role) can read or write them, exactly like
-- member_sessions. No SECURITY DEFINER function is added.

create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  ref                   text not null,
  concierge_request_id  uuid not null references public.concierge_requests (id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  locale                text not null default 'en',
  guest_name            text,
  guest_email           text,
  guest_phone           text,
  query                 text not null,
  note                  text,
  category              text,
  district              text,
  tier                  text not null default 'standard',
  lane                  text not null default 'standard',
  member_id             uuid references public.concierge_members (id) on delete set null,
  status                text not null default 'new',
  assigned_to           text,
  assigned_at           timestamptz,
  first_response_due_at timestamptz not null,
  first_response_at     timestamptz,
  sla_target_minutes    integer not null,
  sla_alerted_at        timestamptz,
  status_token_hash     text not null,
  closed_at             timestamptz,
  constraint bookings_ref_key unique (ref),
  constraint bookings_concierge_request_key unique (concierge_request_id),
  constraint bookings_token_hash_key unique (status_token_hash),
  constraint bookings_lane_check check (lane in ('member', 'standard')),
  constraint bookings_tier_check check (tier in ('premium', 'standard')),
  constraint bookings_status_check check (status in ('new', 'in_progress', 'awaiting_partner', 'quote_ready', 'confirmed', 'completed', 'cancelled', 'closed')),
  constraint bookings_contact_check check (guest_email is not null or guest_phone is not null)
);
-- the queue: members first, then waiting-for-first-reply, then earliest deadline (lib/booking/queue.ts is the authority; this index serves it)
create index if not exists bookings_queue_idx   on public.bookings (status, lane, first_response_due_at);
create index if not exists bookings_member_idx  on public.bookings (member_id) where member_id is not null;
create index if not exists bookings_created_idx on public.bookings (created_at desc);

create table if not exists public.booking_partner_requests (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.bookings (id) on delete cascade,
  created_at         timestamptz not null default now(),
  created_by         text,
  partner_name       text not null,
  partner_email      text,
  partner_locale     text not null default 'en',
  directory_slug     text,
  token_hash         text not null,
  expires_at         timestamptz not null,
  sent_at            timestamptz,
  email_status       text not null default 'not_sent',
  reminded_at        timestamptz,
  status             text not null default 'sent',
  responded_at       timestamptz,
  quote_amount_cents integer,
  response_note      text,
  shared_with_guest  boolean not null default false,
  shared_at          timestamptz,
  constraint booking_partner_requests_token_key unique (token_hash),
  constraint booking_partner_requests_status_check check (status in ('sent', 'accepted', 'quoted', 'declined', 'alternative')),
  constraint booking_partner_requests_email_status_check check (email_status in ('sent', 'failed', 'not_sent')),
  constraint booking_partner_requests_amount_check check (quote_amount_cents is null or quote_amount_cents > 0)
);
create index if not exists booking_partner_requests_booking_idx on public.booking_partner_requests (booking_id);
create index if not exists booking_partner_requests_open_idx    on public.booking_partner_requests (status) where status = 'sent';

create table if not exists public.booking_events (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  at         timestamptz not null default now(),
  actor      text not null,
  kind       text not null,
  detail     jsonb
);
create index if not exists booking_events_booking_idx on public.booking_events (booking_id, at desc);

create table if not exists public.commission_ledger (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  created_by           text,
  booking_id           uuid references public.bookings (id) on delete set null,
  booking_ref          text not null,
  partner_request_id   uuid references public.booking_partner_requests (id) on delete set null,
  partner_name         text not null,
  currency             text not null default 'EUR',
  gross_cents          bigint not null,
  rate_bps             integer not null,
  commission_cents     bigint not null,
  status               text not null default 'expected',
  note                 text,
  voided_at            timestamptz,
  voided_by            text,
  void_reason          text,
  constraint commission_ledger_status_check   check (status in ('expected', 'confirmed', 'void')),
  constraint commission_ledger_currency_check check (currency = 'EUR'),
  constraint commission_ledger_gross_check    check (gross_cents > 0),
  constraint commission_ledger_rate_check     check (rate_bps between 0 and 5000),
  -- the stored commission must be the half-up rounding of gross × rate: nobody (and no bug) can book a different number
  constraint commission_ledger_math_check     check (commission_cents = floor((gross_cents * rate_bps + 5000) / 10000.0)),
  constraint commission_ledger_void_check     check (status <> 'void' or (voided_at is not null and coalesce(void_reason, '') <> ''))
);
create index if not exists commission_ledger_booking_idx on public.commission_ledger (booking_id);
-- at most one live (non-void) entry per partner request; correct a mistake by voiding it and recording again
create unique index if not exists commission_ledger_one_live_idx on public.commission_ledger (partner_request_id) where status <> 'void' and partner_request_id is not null;

-- The ledger is append-only for money: the amounts, rate, partner and booking reference can never be edited, and rows are never
-- deleted by the application. Only status / void fields and the note move. (booking_id may be nulled by the FK when a booking is erased.)
create or replace function public.commission_ledger_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'commission_ledger rows are never deleted — void the entry instead';
  end if;
  if new.gross_cents is distinct from old.gross_cents or new.rate_bps is distinct from old.rate_bps
     or new.commission_cents is distinct from old.commission_cents or new.currency is distinct from old.currency
     or new.partner_name is distinct from old.partner_name or new.booking_ref is distinct from old.booking_ref
     or new.created_at is distinct from old.created_at then
    raise exception 'commission_ledger amounts are immutable — void the entry and record a new one';
  end if;
  if old.status = 'void' and new.status is distinct from 'void' then
    raise exception 'a void commission_ledger entry cannot be reopened';
  end if;
  return new;
end $$;
revoke all on function public.commission_ledger_guard() from public, anon, authenticated;

drop trigger if exists commission_ledger_guard_trg on public.commission_ledger;
create trigger commission_ledger_guard_trg before update or delete on public.commission_ledger
  for each row execute function public.commission_ledger_guard();

alter table public.bookings                 enable row level security;
alter table public.booking_partner_requests enable row level security;
alter table public.booking_events           enable row level security;
alter table public.commission_ledger        enable row level security;
revoke all on public.bookings, public.booking_partner_requests, public.booking_events, public.commission_ledger from public, anon, authenticated;
grant all on public.bookings, public.booking_partner_requests, public.booking_events, public.commission_ledger to service_role;

-- VERIFY:  select relname, relrowsecurity from pg_class where relname in ('bookings','booking_partner_requests','booking_events','commission_ledger');   -- 4 rows, all true
