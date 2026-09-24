-- ============================================================================
-- Cyprus Lifestyle — 0116 · Editorial field notes (the editor's raw material)
-- ----------------------------------------------------------------------------
-- The human half of the engine: an editor visits a restaurant, bar, hotel,
-- boutique or shop, or meets someone with a story, and records what they saw,
-- tasted and heard. The AI editor then redacts a high-level journalistic piece
-- from these grounded notes (fed to lib/editorial/generate.draftPiece), which
-- flows into the pipeline → edit → translate ×7 → publish → elevate the subject's
-- listing. A field note may stand alone or attach to a planned idea.
--
-- Admin/service writes only. Additive & idempotent.
-- ============================================================================

create table if not exists public.editorial_field_notes (
  id                 uuid primary key default gen_random_uuid(),
  idea_id            uuid references public.editorial_ideas(id) on delete set null,
  kind               text not null default 'visit' check (kind in ('visit','interview','story')),
  subject_listing_id uuid references public.directory_listings(id) on delete set null,
  subject_name       text,                       -- free text when the subject isn't a directory listing
  place              text,
  visited_on         date,
  rating             int check (rating is null or (rating between 1 and 5)),
  notes              text not null,              -- what they saw / tasted / experienced
  quotes             text,                       -- verbatim quotes to preserve
  media              text[] not null default '{}', -- photo URLs / storage paths
  author             text,
  status             text not null default 'captured' check (status in ('captured','drafted','published')),
  blog_post_id       uuid references public.blog_posts(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists editorial_field_notes_idea_idx    on public.editorial_field_notes (idea_id) where idea_id is not null;
create index if not exists editorial_field_notes_subject_idx  on public.editorial_field_notes (subject_listing_id) where subject_listing_id is not null;
create index if not exists editorial_field_notes_status_idx    on public.editorial_field_notes (status, created_at desc);

alter table public.editorial_field_notes enable row level security;
drop policy if exists "Admins manage field notes" on public.editorial_field_notes;
create policy "Admins manage field notes" on public.editorial_field_notes
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.editorial_field_notes;
create trigger set_updated_at before update on public.editorial_field_notes
  for each row execute function public.update_updated_at();

select 'editorial field notes ready' as status,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='editorial_field_notes') as columns;
