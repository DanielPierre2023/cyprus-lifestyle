-- ============================================================================
-- Cyprus Lifestyle — 0115 · Editorial ideas (the commissioning backlog)
-- ----------------------------------------------------------------------------
-- The output of the AI Editorial Planner and the intake for editor-originated
-- pieces. Every idea is a planned article: which section it fills, its angle, the
-- "why now" rationale, a concrete subject (a directory business where apt), an
-- accurate research brief, and a redundancy guard (a normalised title hash + a
-- pgvector embedding, so the planner can reject near-duplicates of what is already
-- published or already queued). Approved ideas flow into the existing pipeline
-- (0112): an idea becomes a blog_posts row via /api/editorial/commission.
--
-- Requires pgvector (already enabled in 0049/0051). Admin/service writes only.
-- Additive & idempotent.
-- ============================================================================

create extension if not exists vector;

create table if not exists public.editorial_ideas (
  id                 uuid primary key default gen_random_uuid(),
  section_key        text references public.editorial_sections(key) on delete set null,   -- department
  subcategory_key    text references public.editorial_sections(key) on delete set null,   -- the precise slot
  working_title      text not null,
  angle              text,
  rationale          text,                       -- the "why now"
  status             text not null default 'suggested'
    check (status in ('suggested','approved','assigned','drafting','scheduled','published','rejected')),
  source             text not null default 'ai-planner'
    check (source in ('ai-planner','editor','field-visit','interview','trend')),
  priority           int  not null default 0,
  target_month       date,                       -- first of the month this is planned for
  subject_listing_id uuid references public.directory_listings(id) on delete set null,
  research_brief     jsonb,                      -- outline, key points, what to verify, photos needed, word target
  signals            jsonb,                      -- what the planner saw (trends, demand, season) — for transparency
  dedup_hash         text,                       -- normalised-title hash (cheap exact-dup guard)
  embedding          vector(1536),               -- semantic dup guard (text-embedding-3-small)
  assigned_to        text,                       -- editor name or 'ai'
  blog_post_id       uuid references public.blog_posts(id) on delete set null,
  rejected_reason    text,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists editorial_ideas_status_idx    on public.editorial_ideas (status, target_month);
create index if not exists editorial_ideas_subcat_idx     on public.editorial_ideas (subcategory_key);
create index if not exists editorial_ideas_section_idx     on public.editorial_ideas (section_key);
create index if not exists editorial_ideas_dedup_idx       on public.editorial_ideas (dedup_hash) where dedup_hash is not null;
create index if not exists editorial_ideas_embedding_idx   on public.editorial_ideas using hnsw (embedding vector_cosine_ops);

alter table public.editorial_ideas enable row level security;
drop policy if exists "Admins manage ideas" on public.editorial_ideas;
create policy "Admins manage ideas" on public.editorial_ideas
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.editorial_ideas;
create trigger set_updated_at before update on public.editorial_ideas
  for each row execute function public.update_updated_at();

-- Nearest existing ideas to a candidate embedding (cosine) — the planner's semantic
-- redundancy guard. Excludes rejected ideas so a killed theme doesn't suppress a
-- fresh one. SECURITY DEFINER so the service-role planner can call it.
create or replace function public.match_editorial_ideas(query_embedding vector(1536), match_count int default 8)
returns table (id uuid, working_title text, status text, similarity float)
language sql stable security definer set search_path = public as $$
  select i.id, i.working_title, i.status, 1 - (i.embedding <=> query_embedding) as similarity
  from public.editorial_ideas i
  where i.embedding is not null and i.status <> 'rejected'
  order by i.embedding <=> query_embedding
  limit match_count
$$;

select 'editorial ideas ready' as status,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='editorial_ideas') as columns;
