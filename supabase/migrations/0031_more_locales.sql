-- 0031_more_locales.sql
-- Cyprus Lifestyle now ships seven editions. This migration adds the German (de),
-- Polish (pl) and Russian (ru) content columns.
--
-- Rather than list every table by hand, it finds every localized content column
-- — identified by an "<x>_en" base that also has an "<x>_el" sibling — and adds
-- matching "<x>_de", "<x>_pl", "<x>_ru" columns of the SAME type. That means no
-- localized column (name_, title_, summary_, body_, cta_, headline_, bio_, …) on
-- any table can be missed, now or later.
--
-- New columns are nullable with no default; empty editions fall back to _en in
-- the app queries (name_${locale} || name_en). Idempotent — safe to re-run.

do $$
declare
  r      record;
  loc    text;
  base   text;
  newcol text;
begin
  for r in
    select c.relname                              as tbl,
           a.attname                              as col,
           format_type(a.atttypid, a.atttypmod)  as coltype
    from pg_attribute a
    join pg_class     c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attnum  > 0
      and not a.attisdropped
      and a.attname like '%\_en'
      and exists (
        select 1
        from pg_attribute a2
        where a2.attrelid = a.attrelid
          and not a2.attisdropped
          and a2.attname = left(a.attname, length(a.attname) - 3) || '_el'
      )
  loop
    base := left(r.col, length(r.col) - 3);       -- strip the '_en' suffix
    foreach loc in array array['de', 'pl', 'ru'] loop
      newcol := base || '_' || loc;
      execute format(
        'alter table public.%I add column if not exists %I %s',
        r.tbl, newcol, r.coltype
      );
    end loop;
  end loop;
end $$;
