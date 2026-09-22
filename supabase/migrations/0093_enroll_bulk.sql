-- 0093_enroll_bulk.sql
-- One-click bulk enrolment for outreach. Enrols every CRM account matching the admin's
-- current filter (vertical / tier / stage / search) into the first-contact sequence
-- (step 0, active, due now), but ONLY accounts that: have an emailable contact, are not
-- opted-out/unsubscribed, are not on the suppression list, and aren't already enrolled.
-- This only QUEUES them — sending stays gated by crm_settings.sending_enabled and the
-- daily cap, so a bulk enrol can never blast mail. Additive & idempotent.

create or replace function public.enroll_prospects_bulk(
  p_category text default null,
  p_tier     text default null,
  p_stage    text default null,
  p_q        text default null
) returns integer language plpgsql as $$
declare n integer;
begin
  with ins as (
    insert into public.crm_enrollments (org_id, status, step, next_send_at)
    select o.id, 'active', 0, now()
    from public.crm_orgs o
    where (p_category is null or p_category = 'all' or o.category = p_category)
      and (p_tier     is null or p_tier = 'all'     or o.tier = p_tier)
      and (p_stage    is null or p_stage = 'all'    or o.status = p_stage)
      and (p_q is null or p_q = '' or o.name ilike '%' || p_q || '%' or o.district ilike '%' || p_q || '%')
      and exists (
        select 1 from public.crm_contacts c
        where c.org_id = o.id and c.email is not null
          and coalesce(c.consent_status, '') not in ('opted_out', 'unsubscribed')
          and not exists (
            select 1 from public.crm_suppression s
            where s.email = c.email or s.domain = split_part(c.email, '@', 2))
      )
      and not exists (select 1 from public.crm_enrollments e where e.org_id = o.id)
    on conflict (org_id) do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- report
select 'enroll_bulk' as check,
       (select count(*) from information_schema.routines where routine_schema='public' and routine_name='enroll_prospects_bulk') as fn;
