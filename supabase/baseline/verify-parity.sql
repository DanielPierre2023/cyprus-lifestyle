-- supabase/baseline/verify-parity.sql
-- READ-ONLY. Fingerprint of the `public` schema, used to prove that a database rebuilt from
-- 0000_live_schema_baseline.sql (e.g. a staging project) is identical to production.
--
-- Run it in BOTH databases (Supabase → SQL Editor) and compare the two result sets line by line.
-- Every row must match. Extension-owned objects (pgvector, pg_trgm) are excluded, so they never
-- cause false differences. `*_digest` rows are md5 fingerprints of the object definitions:
-- if a digest differs while the count matches, an object differs in content — diff it.
--
-- Nothing here reads table data (only catalogs), so it is safe on production.

with
tbl as (
  select c.oid, c.relname::text as relname, c.relrowsecurity
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
),
fn as (
  select p.oid, p.proname::text as proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
vw as (
  select c.oid, c.relname::text as relname, coalesce(array_to_string(c.reloptions, ','), '') as opts
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
),
cols as (
  select t.relname::text as relname, a.attname::text as attname, format_type(a.atttypid, a.atttypmod) as typ, a.attnotnull::text as nn,
         coalesce(pg_get_expr(d.adbin, d.adrelid), '') as dflt, a.attidentity::text as ident, a.attgenerated::text as gen
  from tbl t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
),
cons as (
  select conrelid::regclass::text as rel, contype::text as contype, conname::text as conname, pg_get_constraintdef(oid) as def
  from pg_constraint where connamespace = 'public'::regnamespace
),
idx as (
  select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'
),
pol as (
  select tablename, policyname, cmd, array_to_string(roles, '/') as roles,
         coalesce(qual, '') as qual, coalesce(with_check, '') as wc
  from pg_policies where schemaname = 'public'
),
trg as (
  select c.relname::text as relname, t.tgname::text as tgname, pg_get_triggerdef(t.oid) as def
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal and c.relnamespace = 'public'::regnamespace
),
fnacl as (
  select proname, args,
         has_function_privilege('anon', oid, 'EXECUTE')::text          as anon_x,
         has_function_privilege('authenticated', oid, 'EXECUTE')::text as auth_x,
         has_function_privilege('service_role', oid, 'EXECUTE')::text  as svc_x
  from fn
),
tacl as (
  select t.relname,
         has_table_privilege('anon', t.oid, 'SELECT')::text          as a_s,
         has_table_privilege('anon', t.oid, 'INSERT')::text          as a_i,
         has_table_privilege('authenticated', t.oid, 'SELECT')::text as u_s,
         has_table_privilege('authenticated', t.oid, 'INSERT')::text as u_i,
         has_table_privilege('service_role', t.oid, 'SELECT')::text  as s_s
  from tbl t
)
select k, v from (
  select  1 as o, 'tables'              as k, (select count(*) from tbl)::text                                         as v
  union all select  2, 'tables_with_rls',     (select count(*) from tbl where relrowsecurity)::text
  union all select  3, 'columns',             (select count(*) from cols)::text
  union all select  4, 'primary_keys',        (select count(*) from cons where contype = 'p')::text
  union all select  5, 'unique_constraints',  (select count(*) from cons where contype = 'u')::text
  union all select  6, 'check_constraints',   (select count(*) from cons where contype = 'c')::text
  union all select  7, 'foreign_keys',        (select count(*) from cons where contype = 'f')::text
  union all select  8, 'indexes',             (select count(*) from idx)::text
  union all select  9, 'functions',           (select count(*) from fn)::text
  union all select 10, 'views',               (select count(*) from vw)::text
  union all select 11, 'triggers',            (select count(*) from trg)::text
  union all select 12, 'policies',            (select count(*) from pol)::text
  union all select 13, 'enum_types',          (select count(*) from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype = 'e')::text
  union all select 20, 'columns_digest',      md5(coalesce((select string_agg(relname||'.'||attname||':'||typ||':'||nn||':'||dflt||':'||ident||':'||gen, '|' order by relname, attname) from cols), ''))
  union all select 21, 'constraints_digest',  md5(coalesce((select string_agg(rel||':'||contype||':'||conname||':'||def, '|' order by rel, conname) from cons), ''))
  union all select 22, 'indexes_digest',      md5(coalesce((select string_agg(tablename||':'||indexname||':'||indexdef, '|' order by tablename, indexname) from idx), ''))
  union all select 23, 'policies_digest',     md5(coalesce((select string_agg(tablename||':'||policyname||':'||cmd||':'||roles||':'||qual||':'||wc, '|' order by tablename, policyname) from pol), ''))
  union all select 24, 'triggers_digest',     md5(coalesce((select string_agg(relname||':'||tgname||':'||def, '|' order by relname, tgname) from trg), ''))
  union all select 25, 'view_options_digest', md5(coalesce((select string_agg(relname||':'||opts, '|' order by relname) from vw), ''))
  union all select 26, 'functions_acl_digest',md5(coalesce((select string_agg(proname||'('||args||'):'||anon_x||auth_x||svc_x, '|' order by proname, args) from fnacl), ''))
  union all select 27, 'tables_acl_digest',   md5(coalesce((select string_agg(relname||':'||a_s||a_i||u_s||u_i||s_s, '|' order by relname) from tacl), ''))
  union all select 28, 'security_definer_fns',(select count(*) from fn where prosecdef)::text
) x
order by o;
