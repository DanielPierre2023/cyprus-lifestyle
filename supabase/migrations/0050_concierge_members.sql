-- 0050_concierge_members.sql
-- The concierge members' tier. One row per member (created by the Stripe webhook
-- on checkout). Recognised in the browser by the anonymous cid used at checkout,
-- and linkable by email across devices. Written only by the service role.

create table if not exists public.concierge_members (
  id                      uuid primary key default gen_random_uuid(),
  cid                     text,
  email                   text,
  tier                    text not null default 'concierge',
  status                  text not null default 'active',   -- active | canceled | failed | pending
  stripe_customer_id      text,
  stripe_subscription_id  text,
  stripe_session_id       text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists concierge_members_cid_idx on public.concierge_members (cid);
create index if not exists concierge_members_email_idx on public.concierge_members (lower(email));
create unique index if not exists concierge_members_sub_idx
  on public.concierge_members (stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.concierge_members enable row level security;
-- No policies: only the service role (membership + webhook routes) reads/writes.
