-- 0120_concierge_telegram.sql
-- Conversation memory for the Telegram concierge. One row per Telegram chat
-- (chat_id = the chat id from the Bot API update). Written only by the service role
-- (the /api/telegram webhook); RLS on with no public policies.

create table if not exists public.concierge_tg_threads (
  chat_id    text primary key,
  messages   jsonb not null default '[]'::jsonb,  -- [{role,content}], last ~10
  locale     text,
  updated_at timestamptz default now()
);

create index if not exists concierge_tg_threads_updated_idx
  on public.concierge_tg_threads (updated_at desc);

alter table public.concierge_tg_threads enable row level security;
-- No policies: only the service role (webhook) reads/writes this table.
