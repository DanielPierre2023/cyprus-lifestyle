-- 0064_publish_service_drafts.sql
-- Make already-researched SERVICE listings visible to the concierge and the
-- directory. Several real businesses were sitting in status='draft' — most
-- importantly the Larnaca broker "Lextrus Real Estate" — so the concierge could
-- not see them and wrongly told guests "no listings for Larnaca". The concierge
-- only ever queries status='published'.
--
-- Scope is deliberately narrow and reversible: only service-group drafts
-- (real estate, professional, mobility, services, health) that have English
-- content and are NOT in the occupied north. Article drafts and content-type
-- drafts (restaurants/hotels/…) are untouched. Idempotent. Read the report.

-- ── report BEFORE: service drafts by group ───────────────────────────────────
select 'draft service listings (before)' as check, coalesce(category_group,'(null group)') as grp, count(*)::text as n
from public.directory_listings
where status = 'draft'
  and (category_group in ('realestate','professional','services','mobility','health') or slug = 'lextrus-real-estate')
group by category_group order by 3 desc;

-- ── Lextrus: publish explicitly and give it a group/subtype if missing ────────
update public.directory_listings
set status = 'published',
    category_group = coalesce(category_group, 'realestate'),
    subtype = coalesce(subtype, 'agency')
where slug = 'lextrus-real-estate' and status <> 'published';

-- ── publish the other genuine service-group drafts (south only, with content) ──
update public.directory_listings
set status = 'published'
where status = 'draft'
  and category_group in ('realestate','professional','services','mobility','health')
  and name_en is not null and coalesce(summary_en,'') <> ''
  and lower(coalesce(district,'')) <> 'kyrenia';

-- ── report AFTER ─────────────────────────────────────────────────────────────
select 'Lextrus status (expect published)' as check, status as n
from public.directory_listings where slug = 'lextrus-real-estate'
union all
select 'published service listings (after)', count(*)::text
from public.directory_listings
where status = 'published'
  and category_group in ('realestate','professional','services','mobility','health');
