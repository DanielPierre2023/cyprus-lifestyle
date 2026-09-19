-- 0048_concierge_memory.sql
-- Cross-session memory for the concierge. One row per anonymous guest id (cid,
-- generated in the browser). Stores only what the guest volunteers about their
-- trip/preferences — visible and clearable from the concierge's "memory drawer".
-- Written only by the service role (the concierge API routes); RLS on, no public
-- policies.

create table if not exists public.concierge_memory (
  cid         text primary key,
  profile     jsonb not null default '{}'::jsonb,  -- {name,language,interests[],base,party,dates,dietary,status,notes}
  turns       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists concierge_memory_updated_idx
  on public.concierge_memory (updated_at desc);

alter table public.concierge_memory enable row level security;
-- No policies: only the service role (concierge routes) reads/writes this table.
