-- Restores acronyms that an earlier version of the cleaner lowercased (GESY, GHS, IP Box, YKA, VAT).
-- The cleaner bug itself is fixed in lib/antiAi.ts. Run once in Supabase → SQL Editor. Old text is saved in admin_audit_log first.
begin;

insert into admin_audit_log (source, action, table_name, row_id, summary, changes)
select $q$sql$q$, $q$article.acronym.fix$q$, $q$blog_posts$q$, id::text, slug || $q$ acronyms restored$q$, jsonb_build_object($q$before$q$, jsonb_build_object($q$content_en$q$, content_en, $q$content_el$q$, content_el, $q$content_ro$q$, content_ro, $q$content_ar$q$, content_ar, $q$content_de$q$, content_de, $q$content_pl$q$, content_pl, $q$content_ru$q$, content_ru))
from blog_posts
where content_en ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_el ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_ro ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_ar ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_de ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_pl ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_ru ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_en ~ $q$\mvat\M$q$;

update blog_posts set
  content_en = regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_en, $q$\mgesy\M(?![.]org)$q$, $q$GESY$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$), $q$\mvat\M$q$, $q$VAT$q$, $q$g$q$),
  content_el = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_el, $q$\mgesy\M(?![.]org)$q$, $q$ΓεΣΥ$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$),
  content_ro = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_ro, $q$\mgesy\M(?![.]org)$q$, $q$GESY$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$),
  content_ar = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_ar, $q$\mgesy\M(?![.]org)$q$, $q$GESY$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$),
  content_de = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_de, $q$\mgesy\M(?![.]org)$q$, $q$GESY$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$),
  content_pl = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_pl, $q$\mgesy\M(?![.]org)$q$, $q$GESY$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$),
  content_ru = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content_ru, $q$\mgesy\M(?![.]org)$q$, $q$GESY$q$, $q$g$q$), $q$\mghs\M$q$, $q$GHS$q$, $q$g$q$), $q$\mip Box$q$, $q$IP Box$q$, $q$g$q$), $q$\myka\M(?= [0-9])$q$, $q$YKA$q$, $q$g$q$),
  updated_at = now()
where content_en ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_el ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_ro ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_ar ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_de ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_pl ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_ru ~ $q$\m(gesy\M(?![.]org)|ghs\M|ip Box|yka\M(?= [0-9]))$q$
   or content_en ~ $q$\mvat\M$q$;

commit;

-- Check (should return no rows): select slug from blog_posts where content_en ~ $q$\mgesy\M(?![.]org)$q$;
