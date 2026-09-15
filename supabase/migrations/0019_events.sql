-- ============================================================================
-- Events / Agenda — structured, dated events for the /agenda calendar and Event
-- rich results. Managed from Admin → Agenda. Run once in the SQL editor.
-- ============================================================================

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  district    text,
  title_en text, title_el text, title_ro text, title_ar text,
  summary_en text, summary_el text, summary_ro text, summary_ar text,
  venue       text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  price       text,                     -- free text: "Free", "€20", "€15–€40"
  url         text,
  image       text,
  lat         double precision,
  lng         double precision,
  tags        text[] default '{}',
  status      text not null default 'published',   -- published | draft
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists events_when_idx     on public.events (status, starts_at);
create index if not exists events_district_idx on public.events (district);

drop trigger if exists set_updated_at_events on public.events;
create trigger set_updated_at_events before update on public.events
  for each row execute function public.update_updated_at();

alter table public.events enable row level security;
drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events
  for select to anon, authenticated using (status = 'published');
drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
