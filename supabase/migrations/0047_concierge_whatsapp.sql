-- 0047_concierge_whatsapp.sql
-- Conversation memory for the WhatsApp concierge. One row per WhatsApp user
-- (wa_id = their phone number id from Meta). Written only by the service role
-- (the /api/whatsapp webhook); RLS on with no public policies.

create table if not exists public.concierge_wa_threads (
  wa_id        text primary key,
  locale       text,
  messages     jsonb not null default '[]'::jsonb,  -- [{role,content}], last ~12
  last_msg_id  text,                                 -- dedupe Meta webhook retries
  turns        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists concierge_wa_threads_updated_idx
  on public.concierge_wa_threads (updated_at desc);

alter table public.concierge_wa_threads enable row level security;
-- No policies: only the service role (webhook) reads/writes this table.
