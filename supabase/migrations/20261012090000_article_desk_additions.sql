-- Article desk, October 2026 additions.
--
-- 1. style_exemplars: MODEL PIECES, finished articles that the editor-in-chief approved as the standard of a desk. The edge function
--    process-scraped-article shows the active pieces of a story's desk (and language) to the writers. A piece is only used while
--    "active" is true, so nothing reaches a writer that a human has not switched on. Managed in /admin/exemplars.
-- 2. recent_article_openings(): how our latest published pieces BEGAN, per language, so that the writers can avoid beginning alike.
--    Returns only the first 200 characters of what is already public; callable by the service role (the edge function) only.
--
-- Safe to run more than once. Nothing here changes or deletes an existing row.

-- ── 1. model pieces ─────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.style_exemplars (
  id             uuid primary key default gen_random_uuid(),
  -- the desk: a magazine category (cyprus, business, property, relocation, culture, escapes, table, agenda, people, world) or '*' for every desk
  desk           text not null,
  lang           text not null check (lang in ('en', 'el', 'ro', 'ar', 'de', 'pl', 'ru')),
  title          text not null,
  -- plain text, paragraphs separated by a blank line (HTML is accepted and stripped when the piece is shown to a writer)
  body           text not null check (length(body) >= 200),
  article_type   text,
  note           text,
  -- the published article this piece was taken from, if any
  source_post_id uuid references public.blog_posts (id) on delete set null,
  -- only an active piece reaches the writers: the editor-in-chief switches it on after reading it
  active         boolean not null default false,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists style_exemplars_active_idx on public.style_exemplars (desk, lang) where active;

alter table public.style_exemplars enable row level security;

drop policy if exists "admins manage model pieces" on public.style_exemplars;
create policy "admins manage model pieces" on public.style_exemplars
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.style_exemplars;
create trigger set_updated_at before update on public.style_exemplars
  for each row execute function public.update_updated_at();

-- A proposal, switched OFF: the Eurostat brief written the way the desk should write a brief. Read it, then switch it on in /admin/exemplars
-- (or leave it off and add pieces of your own; three to five per desk is the aim).
insert into public.style_exemplars (desk, lang, title, body, article_type, note, active, created_by)
select 'cyprus', 'en', 'Cyprus has fewer daily drinkers than the EU, and slightly more monthly ones',
$body$Fewer than two in 100 people in Cyprus drink alcohol every day. Across the EU it is nearly five in 100.

Weekly drinking is also rarer in Cyprus: 16.1% against 19.2%. Monthly drinking is not: 22.1% against 21.8%. The figures cover people aged 16 and over in 2025.

Within the EU, daily drinking ranges from 0.8% among 16- to 24-year-olds to 8.9% among those aged 65 and over. Among people at risk of poverty or social exclusion, 47.5% had never drunk alcohol or had not drunk in the survey period, against 29.9% of everyone else.$body$,
'news', 'Proposal. The lead is the news plus the number; every figure stands with its comparison; the length of each paragraph follows its content; the piece ends on a hard fact. Off until you switch it on.', false, 'proposal'
where not exists (select 1 from public.style_exemplars where title = 'Cyprus has fewer daily drinkers than the EU, and slightly more monthly ones');

-- ── 2. how the latest pieces began ──────────────────────────────────────────────────────────────────────────────────────
create or replace function public.recent_article_openings(p_limit int default 14)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with latest as (
    select content_en, content_el, content_ro, content_ar, content_de, content_pl, content_ru,
           row_number() over (order by published_at desc nulls last, created_at desc) as rn
    from public.blog_posts
    where status = 'published'
    order by published_at desc nulls last, created_at desc
    limit greatest(1, least(coalesce(p_limit, 14), 40))
  ),
  flat as (
    select rn, 'en' as lang, content_en as c from latest union all select rn, 'el', content_el from latest union all select rn, 'ro', content_ro from latest
    union all select rn, 'ar', content_ar from latest union all select rn, 'de', content_de from latest union all select rn, 'pl', content_pl from latest
    union all select rn, 'ru', content_ru from latest
  ),
  opening as (
    select lang, rn, left(btrim(regexp_replace(regexp_replace(c, '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g')), 200) as x
    from flat where c is not null and c <> ''
  )
  select coalesce(jsonb_object_agg(lang, openings), '{}'::jsonb)
  from (select lang, jsonb_agg(x order by rn) as openings from opening where x <> '' group by lang) t;
$$;

revoke all on function public.recent_article_openings(int) from public, anon, authenticated;
grant execute on function public.recent_article_openings(int) to service_role;
