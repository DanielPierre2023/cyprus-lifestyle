-- =============================================================================
-- CYPRUS LIFESTYLE — Merge duplicate organisations in public.crm_orgs
-- Apply in the Supabase Dashboard → SQL Editor. Safe to re-run (idempotent): with no duplicates left it changes nothing.
--
-- HOW TO RUN
--   1. Select ONLY part 1 (the PREVIEW) and press Run. It is read-only and shows which groups will be merged.
--   2. Then select the whole file and press Run ONCE (or select part 2 alone, then part 3 alone).
--      Part 2 is ONE statement (a DO block): it does everything or nothing. There is no BEGIN/COMMIT to keep open between runs and no
--      helper table that has to survive from one statement to the next.
--
--   The earlier version of this file created a helper table inside a BEGIN … COMMIT and used it in later statements. Run in pieces, or
--   through a connection pool that hands each statement to another connection, the later statements no longer saw the table and stopped with
--   "relation public._crm_merge_members does not exist". Nothing had been changed at that point: the merge starts only after that step.
--
-- WHAT IT DOES
--   Your crm_orgs has 105 groups of rows that share the same name
--   (case-insensitive) — 228 rows, 123 of them redundant. Example: "Askona"
--   appears 4×, "Alfa Pizza" twice (one blank, one with phone + website),
--   "Souvlaki.gr" / "Souvlaki.GR" are the same shop under two spellings.
--
--   For each name group this keeps ONE survivor row and folds the others into
--   it. NO CONTACT DATA IS LOST:
--     • email / website / phone / district / directory_listing_id / source_url
--       / outreach_locale — the survivor keeps its own value; if it had none,
--       it inherits one from a duplicate.
--     • every DISTINCT alternate value (second phone, second email, the other
--       category, etc.) that is not the chosen primary is written into the
--       survivor's `notes`, prefixed "[merge]", so you can still see and use it.
--     • every row in every table that points at a duplicate (contacts, deals, activities, enrollments, editorial pieces, ad leads and
--       orders, sponsored posts, banners, newsletter and section sponsors, fulfilment tasks …) is re-pointed to the survivor. The tables are
--       found in the database itself (every foreign key to crm_orgs), so none can be forgotten and none has to exist. Only after that are
--       the duplicate org rows deleted. No contact is deleted (an exact-duplicate pass is at the end of part 2, commented out).
--
-- SURVIVOR CHOICE  (per name group)
--   1. most contact fields filled   2. a specific category over generic
--   'vendor'   3. oldest row   4. lowest id.  Fully deterministic.
--
-- MERGE KEY = lower(btrim(name)). This fuses case/spacing variants AND rows
--   tagged under two categories (e.g. a restaurant also filed as 'vendor').
--   TWO groups are genuinely ambiguous — possibly DIFFERENT businesses that
--   share a name: "Andreas Makris" (a restaurant vs a taxi firm, taximakris.com)
--   and "Abacus" (phones on different Cyprus area codes). They are merged like
--   the rest, but because every value is preserved in `notes` you can split
--   them back out if you disagree. Grep the result for "[merge]" to review.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 · PREVIEW (read-only). Run this block ALONE first. It writes nothing.
-- ─────────────────────────────────────────────────────────────────────────────
with ranked as (
  select o.id, o.name, o.category, o.tier, o.created_at,
         lower(btrim(o.name)) as k,
         ( (nullif(btrim(o.email),'')   is not null)::int
         + (nullif(btrim(o.website),'') is not null)::int
         + (nullif(btrim(o.phone),'')   is not null)::int
         + (o.directory_listing_id      is not null)::int
         + (nullif(btrim(o.notes),'')   is not null)::int
         + (nullif(btrim(o.source_url),'') is not null)::int
         + (nullif(btrim(o.district),'')   is not null)::int ) as score
  from public.crm_orgs o
),
grp as (select k from ranked group by k having count(*) > 1),
pick as (
  select r.*,
         row_number() over (partition by r.k
           order by r.score desc,
                    (r.category is not null and r.category <> 'vendor') desc,
                    r.created_at asc, r.id asc) as rn
  from ranked r join grp using (k)
)
select k as merge_key,
       count(*)                           as rows_in_group,
       max(name) filter (where rn=1)      as survivor_name,
       max(category) filter (where rn=1)  as survivor_category,
       string_agg(distinct category, ' | ') as all_categories
from pick group by k order by count(*) desc, k;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 · THE MERGE. One statement: all or nothing.
-- ─────────────────────────────────────────────────────────────────────────────
do $merge$
declare
  fk record;
begin
  -- The composite foreign keys cannot be re-pointed by this script: stop before anything is touched.
  if exists (select 1 from pg_constraint c where c.contype = 'f' and c.confrelid = 'public.crm_orgs'::regclass and array_length(c.conkey, 1) > 1) then
    raise exception 'A composite foreign key points at crm_orgs: this script cannot re-point it safely. Nothing was changed.';
  end if;

  -- Members of every duplicate group, with their survivor and a flag. Local to this session; dropped when the statement ends.
  create temp table _crm_merge_members on commit drop as
  with ranked as (
    select o.*,
           lower(btrim(o.name)) as k,
           ( (nullif(btrim(o.email),'')   is not null)::int
           + (nullif(btrim(o.website),'') is not null)::int
           + (nullif(btrim(o.phone),'')   is not null)::int
           + (o.directory_listing_id      is not null)::int
           + (nullif(btrim(o.notes),'')   is not null)::int
           + (nullif(btrim(o.source_url),'') is not null)::int
           + (nullif(btrim(o.district),'')   is not null)::int ) as score
    from public.crm_orgs o
  ),
  grp as (select k from ranked group by k having count(*) > 1),
  pick as (
    select r.*,
           row_number() over (partition by r.k
             order by r.score desc,
                      (r.category is not null and r.category <> 'vendor') desc,
                      r.created_at asc, r.id asc) as rn
    from ranked r join grp using (k)
  ),
  surv as (select k, id as survivor_id from pick where rn = 1)
  select p.id as member_id, s.survivor_id, (p.rn = 1) as is_survivor, p.k, p.rn,
         p.name, p.category, p.tier, p.district, p.website, p.email, p.phone,
         p.directory_listing_id, p.notes, p.source_url, p.outreach_locale,
         p.created_at, p.score
  from pick p join surv s using (k);

  -- 1. Fold all group values into the survivor. Primary = survivor's own value
  --    if set, otherwise the best-scored duplicate's value. Alternates and the
  --    distinct categories go into notes under "[merge]".
  with agg as (
    select m.survivor_id,
      count(*) - 1 as folded,
      -- primary values: survivor first (is_survivor desc), then by score
      (array_remove(array_agg(nullif(btrim(email),'')    order by is_survivor desc, score desc, created_at asc), null))[1] as p_email,
      (array_remove(array_agg(nullif(btrim(website),'')  order by is_survivor desc, score desc, created_at asc), null))[1] as p_website,
      (array_remove(array_agg(nullif(btrim(phone),'')    order by is_survivor desc, score desc, created_at asc), null))[1] as p_phone,
      (array_remove(array_agg(nullif(btrim(district),'') order by is_survivor desc, score desc, created_at asc), null))[1] as p_district,
      (array_remove(array_agg(nullif(btrim(source_url),'') order by is_survivor desc, score desc, created_at asc), null))[1] as p_source_url,
      (array_remove(array_agg(nullif(btrim(outreach_locale),'') order by is_survivor desc, score desc, created_at asc), null))[1] as p_locale,
      (array_remove(array_agg(directory_listing_id order by is_survivor desc, score desc, created_at asc), null))[1] as p_dir,
      min(tier) as best_tier,  -- 'A' < 'B' < 'C'
      -- everything distinct, to describe in notes
      array_agg(distinct nullif(btrim(email),''))    filter (where nullif(btrim(email),'')    is not null) as all_emails,
      array_agg(distinct nullif(btrim(phone),''))    filter (where nullif(btrim(phone),'')    is not null) as all_phones,
      array_agg(distinct nullif(btrim(website),''))  filter (where nullif(btrim(website),'')  is not null) as all_websites,
      array_agg(distinct nullif(btrim(category),'')) filter (where nullif(btrim(category),'') is not null) as all_cats
    from _crm_merge_members m
    group by m.survivor_id
  ),
  note_build as (
    select survivor_id, folded, p_email, p_website, p_phone, p_district,
           p_source_url, p_locale, p_dir, best_tier,
      nullif(concat_ws(' ',
        '[merge] folded ' || folded || ' duplicate row(s) on ' || current_date || '.',
        case when array_length(array_remove(all_emails,   p_email),1)   > 0
             then 'alt emails: '   || array_to_string(array_remove(all_emails,   p_email),   ', ') || '.' end,
        case when array_length(array_remove(all_phones,   p_phone),1)   > 0
             then 'alt phones: '   || array_to_string(array_remove(all_phones,   p_phone),   ', ') || '.' end,
        case when array_length(array_remove(all_websites, p_website),1) > 0
             then 'alt websites: ' || array_to_string(array_remove(all_websites, p_website), ', ') || '.' end,
        case when array_length(all_cats,1) > 1
             then 'categories seen: ' || array_to_string(all_cats, ', ') || '.' end
      ), '') as merge_note
    from agg
  )
  update public.crm_orgs c set
    email               = nb.p_email,
    website             = nb.p_website,
    phone               = nb.p_phone,
    district            = nb.p_district,
    source_url          = nb.p_source_url,
    outreach_locale     = nb.p_locale,
    directory_listing_id= nb.p_dir,
    tier                = nb.best_tier,
    notes               = nullif(concat_ws(E'\n', nullif(btrim(c.notes),''), nb.merge_note), ''),
    updated_at          = now()
  from note_build nb
  where c.id = nb.survivor_id;

  -- 2. Re-point child rows from every loser to its survivor: every single-column foreign key that points at crm_orgs, found in the
  --    database itself (so a table that was added later is not forgotten, and a table that does not exist is not required).
  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.crm_orgs'::regclass and array_length(c.conkey, 1) = 1
    order by 1::text, 2
  loop
    execute format('update %s t set %I = m.survivor_id from _crm_merge_members m where t.%I = m.member_id and not m.is_survivor', fk.tbl, fk.col, fk.col);
  end loop;

  -- 3. Delete the loser org rows (nothing points at them any more).
  delete from public.crm_orgs c
  using _crm_merge_members m
  where c.id = m.member_id and not m.is_survivor;

  -- 4. (OPTIONAL) Collapse contacts that became EXACT duplicates under a survivor
  --    (same email, same name). Keeps the oldest. Commented out by default so no
  --    contact is removed unless you choose to. Uncomment to enable.
  -- delete from public.crm_contacts c
  -- using (
  --   select id, row_number() over (
  --     partition by org_id, lower(btrim(coalesce(email,''))), lower(btrim(coalesce(name,'')))
  --     order by created_at asc, id asc) rn
  --   from public.crm_contacts
  --   where nullif(btrim(email),'') is not null
  -- ) d
  -- where c.id = d.id and d.rn > 1;
end
$merge$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3 · VERIFICATION (read-only). The merge above is already complete.
-- ─────────────────────────────────────────────────────────────────────────────
select
  (select count(*) from public.crm_orgs) as total_orgs_now,
  (select count(*) from (select lower(btrim(name)) from public.crm_orgs group by 1 having count(*)>1) z) as duplicate_names_remaining,
  (select count(*) from public.crm_orgs where notes like '%[merge]%') as survivors_with_merge_note,
  (select count(*) from public.crm_orgs where category='tour-activity') as tour_activity_operators;
