-- 0087_mailroom_tickets.sql
-- Roadmap item 06: turn the mailroom into a lightweight ticketing system so nothing
-- falls through the cracks — every inbound email gets a desk, a priority, an SLA
-- (first-response deadline), an optional owner, thread grouping, and a resolution.
-- Plus kb_candidates: a resolved Q/A can be promoted (after review) into the concierge
-- knowledge base, so the mailroom teaches the concierge over time. Additive & idempotent.

alter table public.inbound_emails add column if not exists desk               text;
alter table public.inbound_emails add column if not exists assignee           text;
alter table public.inbound_emails add column if not exists priority           text not null default 'normal'; -- low|normal|high|urgent
alter table public.inbound_emails add column if not exists sla_due            timestamptz;                     -- first-response deadline
alter table public.inbound_emails add column if not exists first_response_at  timestamptz;
alter table public.inbound_emails add column if not exists resolved_at        timestamptz;
alter table public.inbound_emails add column if not exists thread_key         text;                            -- groups a conversation
alter table public.inbound_emails add column if not exists tags               text[] not null default '{}';

-- Expanded safe auto-send (item 06) — a SECOND opt-in switch, separate from the
-- receipt-only auto-acknowledge (0077). OFF by default. When on, a genuine reply is
-- auto-sent ONLY for a narrow whitelist of purely informational FAQs (see
-- lib/mail/tickets.ts isSafeAutoAnswer) that also pass the strict auto-ack guardrails
-- and are fully grounded — never advice, prices, bookings or anything high/urgent.
alter table public.automation_settings add column if not exists mail_autoanswer_enabled boolean not null default false;

create index if not exists inbound_emails_thread_idx   on public.inbound_emails (thread_key, created_at);
create index if not exists inbound_emails_open_idx     on public.inbound_emails (sla_due) where resolved_at is null;
create index if not exists inbound_emails_assignee_idx on public.inbound_emails (assignee) where resolved_at is null;

-- Backfill sensible values for rows that predate ticketing.
update public.inbound_emails
   set sla_due = coalesce(received_at, created_at) + interval '24 hours'
 where sla_due is null;
update public.inbound_emails
   set first_response_at = handled_at
 where first_response_at is null and status = 'replied' and handled_at is not null;
update public.inbound_emails
   set resolved_at = handled_at
 where resolved_at is null and status = 'archived' and handled_at is not null;

-- Mailroom health for the admin panel.
create or replace view public.mailroom_stats as
select
  count(*) filter (where resolved_at is null and status <> 'archived')                              as open,
  count(*) filter (where resolved_at is null and status <> 'archived'
                    and first_response_at is null and sla_due < now())                              as breached,
  count(*) filter (where resolved_at is null and status <> 'archived'
                    and first_response_at is null and sla_due >= now() and sla_due < now() + interval '4 hours') as due_soon,
  count(*) filter (where resolved_at >= now() - interval '7 days')                                  as resolved_7d,
  count(*) filter (where first_response_at is not null and created_at >= now() - interval '30 days') as responded_30d,
  (percentile_cont(0.5) within group (
     order by extract(epoch from (first_response_at - created_at)) / 3600.0)
   filter (where first_response_at is not null and created_at >= now() - interval '30 days'))::numeric(10,1) as median_first_response_h
from public.inbound_emails;

-- Open tickets with a computed SLA state, worst first.
create or replace view public.mailroom_tickets as
select id, created_at, from_email, from_name, to_email, subject, desk, assignee, priority,
       sla_due, first_response_at, thread_key, status,
       case
         when first_response_at is not null then 'responded'
         when sla_due < now()               then 'breached'
         when sla_due < now() + interval '4 hours' then 'due_soon'
         else 'on_track'
       end as sla_state
from public.inbound_emails
where resolved_at is null and status <> 'archived'
order by (case priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end), sla_due;

-- Resolved Q/A promoted (after review) into the concierge KB.
create table if not exists public.kb_candidates (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  source         text not null default 'mailroom',   -- mailroom | manual | concierge_gap
  source_email_id uuid references public.inbound_emails(id) on delete set null,
  locale         text,
  question       text not null,
  answer         text not null,
  category       text,
  status         text not null default 'pending',     -- pending | approved | rejected | published
  reviewed_by    text,
  reviewed_at    timestamptz
);
create index if not exists kb_candidates_status_idx on public.kb_candidates (status, created_at desc);

alter table public.kb_candidates enable row level security;
drop policy if exists "kb_candidates admin" on public.kb_candidates;
create policy "kb_candidates admin" on public.kb_candidates for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- report
select 'mailroom_tickets' as check,
       (select count(*) from information_schema.columns where table_name='inbound_emails'
          and column_name in ('desk','assignee','priority','sla_due','first_response_at','resolved_at','thread_key','tags')) as cols,
       (select count(*) from information_schema.views where table_schema='public'
          and table_name in ('mailroom_stats','mailroom_tickets')) as views,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='kb_candidates') as kb;
