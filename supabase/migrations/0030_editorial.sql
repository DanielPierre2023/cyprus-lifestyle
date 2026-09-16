-- ============================================================================
-- Cyprus Lifestyle — 0030 · Editorial Studio storage
--   editorial_pieces — AI-drafted interview briefs, interview write-ups and
--   reviews, saved for review/editing before they become articles. Admin-only.
--   Self-contained & idempotent.
-- ============================================================================

create table if not exists public.editorial_pieces (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,                                   -- questions | interview | review
  org_id        uuid references public.crm_orgs(id) on delete set null,
  business_name text,
  category      text,
  title         text,
  result        jsonb not null default '{}'::jsonb,              -- the generated content
  status        text not null default 'draft',                  -- draft | approved | published
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists editorial_pieces_kind_idx on public.editorial_pieces (kind, created_at desc);
create index if not exists editorial_pieces_org_idx  on public.editorial_pieces (org_id);

do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    execute 'drop trigger if exists set_updated_at_editorial on public.editorial_pieces';
    execute 'create trigger set_updated_at_editorial before update on public.editorial_pieces for each row execute function public.update_updated_at()';
  end if;
end $$;

alter table public.editorial_pieces enable row level security;
drop policy if exists "editorial admin all" on public.editorial_pieces;
create policy "editorial admin all" on public.editorial_pieces for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

select 'editorial_pieces ready' as status;
