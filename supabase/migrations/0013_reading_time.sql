-- ============================================================================
-- Accurate read-time. Previously reading_time_min was seed/default data (e.g. a
-- ~140-word piece showing "3 min read"). This computes it from the English body
-- at ~220 words/min, on every insert/update, and backfills existing rows.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

create or replace function public.set_reading_time()
returns trigger
language plpgsql
as $$
declare
  stripped text;
  w int;
begin
  stripped := btrim(regexp_replace(coalesce(new.content_en, ''), '<[^>]+>', ' ', 'g'));
  if stripped = '' then
    return new; -- no body yet: leave whatever is there
  end if;
  w := coalesce(array_length(regexp_split_to_array(stripped, '\s+'), 1), 0);
  if w > 0 then
    new.reading_time_min := greatest(1, ceil(w / 220.0));
  end if;
  return new;
end
$$;

drop trigger if exists trg_set_reading_time on public.blog_posts;
create trigger trg_set_reading_time
  before insert or update of content_en on public.blog_posts
  for each row execute function public.set_reading_time();

-- Backfill every existing article from its actual English word count.
update public.blog_posts
set reading_time_min = greatest(1, ceil(
  coalesce(array_length(regexp_split_to_array(
    btrim(regexp_replace(coalesce(content_en, ''), '<[^>]+>', ' ', 'g')), '\s+'), 1), 0) / 220.0))
where btrim(regexp_replace(coalesce(content_en, ''), '<[^>]+>', ' ', 'g')) <> '';
