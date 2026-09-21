-- 0090_saved_items.sql
-- Roadmap item 10: proactive + transactional concierge. Server-persisted saved items
-- and trip plan (keyed by the anonymous cid, so they survive across devices, unlike the
-- localStorage "recently viewed"). The concierge can then reference "your saved places",
-- build a trip plan, and — via the existing request capture — offer to arrange them.
-- Additive & idempotent.

create table if not exists public.saved_items (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cid        text not null,                     -- anonymous browser id
  slug       text not null,                     -- directory listing slug
  kind       text not null default 'saved',     -- saved | trip
  note       text
);
-- one entry per (cid, slug, kind)
create unique index if not exists saved_items_uidx on public.saved_items (cid, slug, kind);
create index if not exists saved_items_cid_idx on public.saved_items (cid, kind, created_at desc);

alter table public.saved_items enable row level security;
-- Writes/reads go through the service role in the API (scoped by cid there), mirroring
-- concierge_events; only admins get direct table access.
drop policy if exists "saved_items admin" on public.saved_items;
create policy "saved_items admin" on public.saved_items for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- report
select 'saved_items' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='saved_items') as tbl;
