-- Publish gate: the one place every writer (AI editor, scraper edge function, desk pipeline, manual edit) must pass.
-- When an article is about to GO LIVE (insert as published, or a change of status to published), it is checked:
--   • all seven editions have a title and a body,
--   • no edition is the English text served in another language's place,
--   • no edition is far shorter than the others (after allowing for how long each language normally runs).
-- If it fails, the article is saved as a DRAFT instead, and the reasons are written to admin_audit_log (action 'publish.held').
-- Nothing already published is touched: only the moment of going live is checked.
-- Switch off at any time: update site_settings set value = '{"enabled": false}' where key = 'publish_gate';

create or replace function public.cl_words(t text) returns int
language sql immutable as $$
  select coalesce(array_length(regexp_split_to_array(nullif(btrim(regexp_replace(coalesce(t, ''), '<[^>]+>', ' ', 'g')), ''), '\s+'), 1), 0)
$$;

create or replace function public.blog_publish_gate() returns trigger
language plpgsql as $$
declare
  langs text[] := array['en','el','ro','ar','de','pl','ru'];
  factor numeric[] := array[1, 0.94, 1.03, 0.84, 0.95, 0.87, 0.85];
  w int[];
  bodies text[];
  titles text[];
  reasons text[] := '{}';
  i int;
  mn numeric;
  mx numeric;
  v numeric;
  on_off boolean;
begin
  if NEW.status is distinct from 'published' then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.status = 'published' then return NEW; end if;

  select (value ->> 'enabled')::boolean into on_off from public.site_settings where key = 'publish_gate';
  if on_off is false then return NEW; end if;

  bodies := array[NEW.content_en, NEW.content_el, NEW.content_ro, NEW.content_ar, NEW.content_de, NEW.content_pl, NEW.content_ru];
  titles := array[NEW.title_en, NEW.title_el, NEW.title_ro, NEW.title_ar, NEW.title_de, NEW.title_pl, NEW.title_ru];
  w := array[]::int[];
  for i in 1..7 loop
    w := w || public.cl_words(bodies[i]);
    if w[i] = 0 then reasons := reasons || (langs[i] || ': no text'); end if;
    if btrim(coalesce(titles[i], '')) = '' then reasons := reasons || (langs[i] || ': no title'); end if;
    if i > 1 and w[i] > 0 and btrim(bodies[i]) = btrim(coalesce(bodies[1], '')) then reasons := reasons || (langs[i] || ': still the English text'); end if;
  end loop;

  if array_position(w, 0) is null then
    mn := null; mx := null;
    for i in 1..7 loop
      v := w[i] / factor[i];
      if mn is null or v < mn then mn := v; end if;
      if mx is null or v > mx then mx := v; end if;
    end loop;
    if mn < 0.55 * mx then reasons := reasons || ('length differs too much between editions (shortest ' || round(mn) || ' vs longest ' || round(mx) || ' words, language-adjusted)'); end if;
  end if;

  if cardinality(reasons) > 0 then
    NEW.status := 'draft';
    NEW.published_at := null;
    insert into public.admin_audit_log (source, action, table_name, row_id, summary, changes)
    values ('gate', 'publish.held', 'blog_posts', NEW.id::text, coalesce(NEW.slug, '') || ' held back from publishing', jsonb_build_object('reasons', to_jsonb(reasons)));
  end if;
  return NEW;
end;
$$;

drop trigger if exists blog_posts_publish_gate on public.blog_posts;
create trigger blog_posts_publish_gate
  before insert or update on public.blog_posts
  for each row execute function public.blog_publish_gate();
