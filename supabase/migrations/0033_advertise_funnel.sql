-- 0033_advertise_funnel.sql
-- The self-serve Advertise funnel: a per-item self_serve flag on the rate card,
-- an inbound quote-request table (ad_leads) and a purchases table (ad_orders)
-- that the Stripe checkout route + webhook write to.
--
-- Nothing here is destructive; safe to re-run.

-- ── 1. self-serve flag on the rate card ─────────────────────────────────────
-- Fixed-price items (a single price, and not the enterprise Partner tier) can be
-- bought directly; ranged/negotiated items and Partner are "request a quote".
-- The flag is editable per row, so the split can be changed without code.
alter table public.ad_pricing
  add column if not exists self_serve boolean not null default false;

update public.ad_pricing
   set self_serve = true
 where price_to is null
   and slot <> 'tier-partner'
   and coalesce(price_from, 0) > 0;

-- ── 2. inbound quote requests ───────────────────────────────────────────────
create table if not exists public.ad_leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  slot       text,                                  -- ad_pricing.slot of interest (null = general)
  label      text,                                  -- human label captured at submit time
  message    text,
  locale     text not null default 'en',
  status     text not null default 'new',           -- new | contacted | won | lost
  org_id     uuid references public.crm_orgs(id) on delete set null, -- CRM account this enquiry belongs to
  created_at timestamptz not null default now()
);
-- Self-heal: 0035's org_id add was guarded on these tables existing, so if 0035
-- ran before this migration the column was skipped. Add it unconditionally here.
alter table public.ad_leads add column if not exists org_id uuid references public.crm_orgs(id) on delete set null;
alter table public.ad_leads enable row level security;
drop policy if exists "admins_manage_ad_leads" on public.ad_leads;
create policy "admins_manage_ad_leads" on public.ad_leads for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists ad_leads_created_idx on public.ad_leads (created_at desc);

-- ── 3. self-serve purchases (Stripe) ────────────────────────────────────────
create table if not exists public.ad_orders (
  id                     uuid primary key default gen_random_uuid(),
  slot                   text,
  label                  text,
  mode                   text,                       -- 'subscription' | 'payment'
  amount                 numeric,                    -- EUR major units, captured at checkout
  currency               text not null default 'eur',
  customer_name          text,
  customer_email         text,
  company                text,
  locale                 text not null default 'en',
  status                 text not null default 'pending', -- pending | paid | active | canceled | failed
  stripe_session_id      text unique,
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_payment_intent  text,
  org_id                 uuid references public.crm_orgs(id) on delete set null, -- CRM account this sale belongs to
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
-- Self-heal (see note on ad_leads above): ensure org_id exists even if 0035 ran first.
alter table public.ad_orders add column if not exists org_id uuid references public.crm_orgs(id) on delete set null;
alter table public.ad_orders enable row level security;
drop policy if exists "admins_manage_ad_orders" on public.ad_orders;
create policy "admins_manage_ad_orders" on public.ad_orders for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists ad_orders_created_idx on public.ad_orders (created_at desc);
create index if not exists ad_orders_status_idx  on public.ad_orders (status);

-- report: row counts, and a confirmation that org_id landed on both tables.
select 'self_serve items' as k, count(*)::text as n from public.ad_pricing where self_serve
union all select 'ad_leads (rows)',  count(*)::text from public.ad_leads
union all select 'ad_orders (rows)', count(*)::text from public.ad_orders
union all select 'ad_leads.org_id present',
  (to_regclass('public.ad_leads')  is not null and exists(select 1 from information_schema.columns
     where table_schema='public' and table_name='ad_leads'  and column_name='org_id'))::text
union all select 'ad_orders.org_id present',
  (to_regclass('public.ad_orders') is not null and exists(select 1 from information_schema.columns
     where table_schema='public' and table_name='ad_orders' and column_name='org_id'))::text;
