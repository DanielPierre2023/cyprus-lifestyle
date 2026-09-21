-- 0092_privacy_register.sql
-- Roadmap item 12: GDPR/privacy register + subject-request flow. Two tables:
--   • dsar_requests            — data-subject requests (access/erasure/correction/objection),
--                                with the 1-month GDPR response deadline tracked.
--   • data_processing_register — the Record of Processing Activities (ROPA): what we
--                                process, why, the lawful basis, and retention. Seeded with
--                                the platform's real activities so it's accurate from day one.
-- The public data-sourcing statement lives in the app (/sourcing). Additive & idempotent.

create table if not exists public.dsar_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  kind        text not null default 'access',   -- access | erasure | correction | objection | portability
  name        text,
  email       text not null,
  details     text,
  locale      text,
  status      text not null default 'new',       -- new | in_progress | resolved | rejected
  due_at      timestamptz not null default (now() + interval '30 days'),  -- GDPR: reply within 1 month
  handled_by  text,
  handled_at  timestamptz
);
create index if not exists dsar_requests_status_idx on public.dsar_requests (status, created_at desc);
create index if not exists dsar_requests_due_idx    on public.dsar_requests (due_at) where status in ('new', 'in_progress');

alter table public.dsar_requests enable row level security;
drop policy if exists "dsar_requests admin" on public.dsar_requests;
create policy "dsar_requests admin" on public.dsar_requests for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (the public form writes via the service role in the API)

-- Record of Processing Activities.
create table if not exists public.data_processing_register (
  id            text primary key,
  activity      text not null,
  purpose       text not null,
  lawful_basis  text not null,
  data_categories text not null,
  subjects      text not null,
  recipients    text not null,
  retention     text not null,
  updated_at    timestamptz not null default now()
);
alter table public.data_processing_register enable row level security;
drop policy if exists "dpr read all" on public.data_processing_register;
create policy "dpr read all" on public.data_processing_register for select to anon, authenticated using (true);
drop policy if exists "dpr admin write" on public.data_processing_register;
create policy "dpr admin write" on public.data_processing_register for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into public.data_processing_register (id, activity, purpose, lawful_basis, data_categories, subjects, recipients, retention) values
 ('directory',  'Business directory', 'Maintain a public guide of businesses in the Republic of Cyprus', 'Legitimate interests (public-interest information about businesses; business contact data)', 'Business name, address, public contact details, category, coordinates, publicly available descriptions', 'Businesses (and their public representatives)', 'Public (website), Supabase (hosting)', 'Until removal is requested or the business closes; corrections on request'),
 ('concierge',  'AI concierge', 'Answer visitor questions and route requests', 'Legitimate interests / consent (for optional memory)', 'Questions asked, anonymous browser id, optional saved items, optional contact details a guest provides', 'Website visitors', 'Anthropic (model inference, no training), Supabase', 'Turn logs anonymised; contact details kept only to fulfil the request'),
 ('mailroom',   'Inbound email handling', 'Receive and reply to enquiries', 'Legitimate interests', 'Sender name, email, message content', 'People who email us', 'Resend (email), Supabase', 'Kept while the enquiry is active; then archived'),
 ('outreach',   'B2B partnership outreach', 'Contact businesses about listing/advertising', 'Legitimate interests (B2B), with opt-out', 'Business contact name, role email, company', 'Business representatives', 'Resend, Supabase', 'Until opt-out or engagement ends; suppression list retained to honour opt-outs'),
 ('newsletter', 'The Saturday Letter', 'Send the opted-in editorial newsletter', 'Consent', 'Email address, language', 'Subscribers', 'Resend, Supabase', 'Until unsubscribe'),
 ('membership', 'Concierge membership & advertising payments', 'Process paid subscriptions and placements', 'Contract', 'Name, email, billing identifiers (via Stripe)', 'Members and advertisers', 'Stripe (payments), Supabase', 'As required for accounting/tax, then deleted'),
 ('analytics',  'Privacy-first analytics', 'Understand site usage', 'Consent (analytics cookies)', 'Page paths, coarse device/country, anonymous session id', 'Website visitors', 'Vercel Analytics/Speed Insights', 'Aggregated; short retention')
on conflict (id) do update set
  activity=excluded.activity, purpose=excluded.purpose, lawful_basis=excluded.lawful_basis,
  data_categories=excluded.data_categories, subjects=excluded.subjects, recipients=excluded.recipients,
  retention=excluded.retention, updated_at=now();

-- report
select 'privacy_register' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name in ('dsar_requests','data_processing_register')) as tbls,
       (select count(*) from public.data_processing_register) as ropa_rows;
