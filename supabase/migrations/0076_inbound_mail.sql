-- 0076_inbound_mail.sql
-- Backend mailroom: store inbound email received via Resend so the whole of
-- @cypruslifestyle.eu is administered from the admin panel (read + reply), with
-- sending already handled by Resend. Resend receives mail (root MX), parses it,
-- and POSTs it to /api/email/inbound, which inserts a row here. Admin RLS mirrors
-- concierge_requests (0063): server role writes, admins read + update. Additive,
-- idempotent.

create table if not exists public.inbound_emails (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  received_at  timestamptz,                 -- Date header from the message
  message_id   text,                        -- RFC Message-ID, used for idempotency
  in_reply_to  text,                        -- threading (References/In-Reply-To)
  from_email   text not null,
  from_name    text,
  to_email     text,                        -- which of our addresses it hit (hello@, privacy@, …)
  cc           text,
  subject      text,
  text_body    text,
  html_body    text,
  headers      jsonb,
  attachments  jsonb,                        -- [{filename, contentType, size, url?}]
  spam_score   numeric,
  status       text not null default 'new',  -- new | read | replied | archived
  handled_by   text,
  handled_at   timestamptz
);

-- one row per delivered message (safe re-delivery from the webhook)
create unique index if not exists inbound_emails_message_id_uidx
  on public.inbound_emails (message_id) where message_id is not null;
create index if not exists inbound_emails_created_idx on public.inbound_emails (created_at desc);
create index if not exists inbound_emails_status_idx  on public.inbound_emails (status);
create index if not exists inbound_emails_to_idx      on public.inbound_emails (to_email);

alter table public.inbound_emails enable row level security;

drop policy if exists "inbound_emails admin read" on public.inbound_emails;
create policy "inbound_emails admin read" on public.inbound_emails
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "inbound_emails admin update" on public.inbound_emails;
create policy "inbound_emails admin update" on public.inbound_emails
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- report
select status, count(*) from public.inbound_emails group by status order by 2 desc;
