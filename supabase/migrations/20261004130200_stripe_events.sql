-- 20261004130200_stripe_events.sql  (idempotent — safe to re-run)
-- B1: Stripe webhook correctness.
--  1. stripe_events: event-id idempotency ledger (service role only; RLS on, no policies).
--  2. current_period_end / cancel_at_period_end on concierge_members and ad_orders, written
--     from customer.subscription.updated.

create table if not exists public.stripe_events (
  event_id      text primary key,
  type          text not null,
  received_at   timestamptz not null default now(),
  claimed_at    timestamptz,            -- lease: a worker is handling it (cleared on failure)
  processed_at  timestamptz             -- set only after the event was handled successfully
);
alter table public.stripe_events add column if not exists claimed_at timestamptz;
alter table public.stripe_events enable row level security;
-- No policies: only the service role (webhook route) reads/writes.
create index if not exists stripe_events_received_idx on public.stripe_events (received_at desc);

alter table public.concierge_members add column if not exists current_period_end   timestamptz;
alter table public.concierge_members add column if not exists cancel_at_period_end boolean default false;
alter table public.ad_orders         add column if not exists current_period_end   timestamptz;
alter table public.ad_orders         add column if not exists cancel_at_period_end boolean default false;

create index if not exists ad_orders_sub_idx on public.ad_orders (stripe_subscription_id) where stripe_subscription_id is not null;
