-- 20261005130000_vat_evidence.sql
-- Phase 1 · Increment 1.4a — VAT evidence on advertising orders. Idempotent; adds nullable columns only (no data changes).
-- Run in: Supabase → SQL Editor. Safe to run before or after the code is deployed (the checkout falls back and logs if the
-- columns are missing).
--
-- Why: for every order we keep (1) what the buyer declared, (2) the proof that their EU VAT number was checked against the
-- EU's VIES register (and the VIES consultation number, when the seller's own VAT number is configured), (3) what we EXPECTED
-- Stripe Tax to do, and (4) what Stripe actually charged — so a mis-configured Stripe account is flagged on the first live
-- order (vat_alert) and the VAT return can be reconciled from the database.

alter table public.ad_orders
  add column if not exists buyer_country     text,            -- ISO country chosen by the buyer
  add column if not exists buyer_vat_id      text,            -- only a VIES-VERIFIED EU VAT number is ever stored here
  add column if not exists vat_status        text,            -- none | valid | invalid | unavailable (VIES result at checkout)
  add column if not exists vies_request_id   text,            -- VIES consultation number (audit evidence)
  add column if not exists vies_checked_at   timestamptz,
  add column if not exists vat_expectation   text,            -- reverse_charge | domestic_vat | vat_charged_eu | outside_eu
  add column if not exists amount_subtotal   numeric(12,2),   -- EUR, as charged by Stripe
  add column if not exists amount_tax        numeric(12,2),
  add column if not exists amount_total      numeric(12,2),
  add column if not exists billing_country   text,            -- billing country the buyer finally entered on Stripe's page
  add column if not exists vat_alert         text,            -- set when Stripe's result differs from the expectation
  add column if not exists stripe_invoice_id text;

create index if not exists ad_orders_vat_alert_idx on public.ad_orders (created_at desc) where vat_alert is not null;

-- Verify (expect 12 rows):
--   select column_name from information_schema.columns where table_schema = 'public' and table_name = 'ad_orders'
--     and column_name in ('buyer_country','buyer_vat_id','vat_status','vies_request_id','vies_checked_at','vat_expectation',
--                         'amount_subtotal','amount_tax','amount_total','billing_country','vat_alert','stripe_invoice_id');
