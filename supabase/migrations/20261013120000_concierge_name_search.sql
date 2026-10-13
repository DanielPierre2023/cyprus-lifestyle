-- 20261013120000_concierge_name_search.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- Concierge name search v2 (plan item S1).
--
-- Why: match_directory_name() only searched status = 'published' (3,076 rows) and only answered "is the QUESTION a fragment of
-- a NAME?". 14,671 imported businesses (status = 'listed') were invisible to it, and a whole sentence such as "Do you have a
-- phone number for A and M Solomou Signs in Kato Polemidia?" never matched, because the sentence is much longer than the name.
--
-- What changes:
--   • published AND listed businesses are searched;
--   • the NAME may stand inside the question (word_similarity(name, question)), as well as the question inside the name;
--   • the app sends distinctive word groups ("grams", stop words and generic words already removed) so candidates come from the
--     existing trigram indexes (directory_name_*_trgm) instead of scanning 17.7k rows (a full scan costs ~0.6-1.4 s per turn);
--   • names that are only a generic word ("Tavern", "Hotel", "Cyprus") never match a sentence;
--   • legal suffixes ("Ltd", "Limited", "- Cyprus") and punctuation are ignored when names are compared.
-- Backwards compatible: the old call match_directory_name(q, match_count) still works (grams are then derived from q).
-- Same permissions as before (service role only; see 20261005120000_hotfix_revoke_public_rpc_and_invoker_views.sql).
-- Safe to re-run. No data is changed.
-- ---------------------------------------------------------------------------------------------------------------------

-- A name with legal suffixes and punctuation removed, lower-case: "A. & M. Christofi Ltd" -> "a m christofi".
create or replace function public.cl_name_key(s text)
returns text
language sql
immutable
parallel safe
set search_path to 'public', 'pg_temp'
as $$
  select trim(regexp_replace(
    regexp_replace(lower(coalesce(s, '')), '(\s*-\s*cyprus\s*$)|(\m(ltd|limited|llc|inc|co|company|plc)\M\.?)', ' ', 'g'),
    '[^[:alnum:]]+', ' ', 'g'))
$$;

-- True for a name that is only an everyday word (a business literally called "Tavern" must not match every sentence that says
-- "tavern"), or too short to be distinctive.
create or replace function public.cl_name_is_generic(nn text)
returns boolean
language sql
immutable
parallel safe
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(length(nn), 0) < 3 or nn = any (array[
    'hotel','hotels','restaurant','restaurants','cafe','cafes','coffee','bar','bars','pub','pubs','tavern','taverna','pizza','pizzeria',
    'beach','club','shop','shops','store','market','supermarket','pharmacy','clinic','hospital','dentist','doctor','lawyer','bank',
    'apartment','apartments','villa','villas','resort','studio','salon','spa','gym','school','bakery','grill','kebab','souvlaki',
    'cyprus','limassol','larnaca','paphos','nicosia','famagusta','ayia napa','protaras','kyrenia','troodos','akamas',
    'the','and','best','good','new','old','royal','grand','golden','blue','green','white','black'
  ])
$$;

drop function if exists public.match_directory_name(text, integer);

create or replace function public.match_directory_name(q text, match_count integer default 12, grams text[] default null)
returns table(slug text, score real)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with params as (
    select
      public.cl_name_key(q) as qn,
      coalesce(array_length(regexp_split_to_array(nullif(public.cl_name_key(q), ''), '\s+'), 1), 0) as qwords
  ),
  -- Candidate word groups. The app sends them; without them (old callers) we use the whole question and each word of 4+ letters.
  g as (
    select distinct t, (t ~ '[^\x01-\x7F]') as nonlatin
    from (
      select trim(regexp_replace(lower(x), '[^[:alnum:]]+', ' ', 'g')) as t from unnest(coalesce(grams, '{}'::text[])) x
      union all
      select qn from params where grams is null
      union all
      select w from params, regexp_split_to_table(params.qn, '\s+') w where grams is null and length(w) >= 4
    ) s
    where length(t) between 3 and 80
    limit 24
  ),
  -- Index-driven candidates: a group that appears inside a stored name (trigram word-similarity, GIN index per column).
  pairs as (
    select l.slug, g.t
    from g join public.directory_listings l on g.t <% l.name_en
    where l.status in ('published', 'listed')
    union
    select l.slug, g.t
    from g join public.directory_listings l
      on (g.t <% l.name_el or g.t <% l.name_ru or g.t <% l.name_ar or g.t <% l.name_ro or g.t <% l.name_de or g.t <% l.name_pl)
    where g.nonlatin and l.status in ('published', 'listed')
    limit 800
  ),
  scored as (
    select p.slug,
      -- the NAME stands inside the question ("... about Solymaris Beach Bar in Protaras")
      max(case when not public.cl_name_is_generic(n.nn) then word_similarity(n.nn, par.qn) else 0 end) as s_in,
      -- the QUESTION is (a fragment of) the name ("Zya" -> "Zya Cafe"); only for short questions
      max(case when par.qwords between 1 and 4 and not public.cl_name_is_generic(n.nn) then word_similarity(par.qn, n.nn) else 0 end) as s_frag,
      -- the guest's wording of the name is a near-copy (a typo: "Solimaris Beach Bar")
      max(case when not public.cl_name_is_generic(n.nn) then similarity(p.t, n.nn) else 0 end) as s_typo
    from pairs p
    join public.directory_listings l on l.slug = p.slug
    cross join params par
    cross join lateral (
      select public.cl_name_key(v.raw) as nn
      from (values (l.name_en), (l.name_el), (l.name_ru), (l.name_ar), (l.name_ro), (l.name_de), (l.name_pl)) v(raw)
    ) n
    group by p.slug
  )
  select s.slug, (case
      when s.s_in >= 0.9 then s.s_in
      when s.s_frag >= 0.6 then s.s_frag
      when s.s_typo >= 0.75 then s.s_typo
    end)::real as score
  from scored s
  join public.directory_listings l on l.slug = s.slug
  where s.s_in >= 0.9 or s.s_frag >= 0.6 or s.s_typo >= 0.75
  order by 2 desc, coalesce(l.commercial_rank, 0) desc, (l.status = 'published') desc, coalesce(l.rating, 0) desc
  limit greatest(1, match_count);
$$;

revoke all on function public.match_directory_name(text, integer, text[]) from public, anon, authenticated;
grant execute on function public.match_directory_name(text, integer, text[]) to service_role;
revoke all on function public.cl_name_key(text) from public, anon, authenticated;
grant execute on function public.cl_name_key(text) to service_role;
revoke all on function public.cl_name_is_generic(text) from public, anon, authenticated;
grant execute on function public.cl_name_is_generic(text) to service_role;

-- Quick checks (run by hand after applying; each should return the named business at the top):
-- select * from public.match_directory_name('Do you have a phone number for A and M Solomou Signs in Kato Polemidia?', 5, array['solomou signs','kato polemidia']);
-- select * from public.match_directory_name('Zya', 3);                                    -- Zya Cafe
-- select * from public.match_directory_name('what is the best italian restaurant in limassol', 5, array['italian','limassol']);  -- no rows
