-- 0098_dsar_erasure.sql
-- Roadmap item 15: EXECUTABLE GDPR erasure. Item 12 gave us the DSAR intake + the
-- ROPA; this makes an erasure request actually erasable in one audited call, instead
-- of a manual hunt across a dozen tables. erase_personal_data(email) purges the
-- data subject's personal data everywhere it lives — keyed by email, and cascaded to
-- the anonymous concierge tables via the cid recorded on their membership — while
-- doing the two things the law requires us to KEEP: it retains (and reinforces) the
-- opt-out suppression record so we can never contact them again, and it anonymises
-- rather than deletes the accounting records we must keep for tax. Every run writes
-- an audit row proving what was erased, for whom (as a hash, not plaintext), by whom.
-- Additive & idempotent. NOTE: this is a destructive capability — only the admin
-- route (an authenticated admin fulfilling an approved request) ever calls it.

-- ── Audit trail — proof of erasure without re-storing the identifier in plaintext.
create table if not exists public.dsar_erasure_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  request_id   uuid references public.dsar_requests(id) on delete set null,
  email_sha256 text not null,                 -- who: one-way hash, so the log itself holds no PII
  email_masked text,                          -- human-readable, e.g. d***@example.com
  actor        text,                          -- which admin ran it
  counts       jsonb not null default '{}'::jsonb,  -- rows affected per table
  total        integer not null default 0
);
create index if not exists dsar_erasure_log_created_idx on public.dsar_erasure_log (created_at desc);
create index if not exists dsar_erasure_log_hash_idx    on public.dsar_erasure_log (email_sha256);

alter table public.dsar_erasure_log enable row level security;
drop policy if exists "dsar_erasure_log admin" on public.dsar_erasure_log;
create policy "dsar_erasure_log admin" on public.dsar_erasure_log for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ── The erasure itself. Returns a JSON summary { email_masked, total, counts }.
create or replace function public.erase_personal_data(
  p_email text,
  p_actor text default 'admin',
  p_request_id uuid default null
) returns jsonb language plpgsql as $$
declare
  e         text := lower(trim(coalesce(p_email, '')));
  counts    jsonb := '{}'::jsonb;
  total     int := 0;
  c         int;
  cids      text[];
  ib_ids    uuid[];
  masked    text;
begin
  if e = '' or position('@' in e) = 0 then
    raise exception 'erase_personal_data: a valid email is required';
  end if;

  -- Link the anonymous concierge data (keyed by cid) to this person via their
  -- membership, so a "delete my data" also clears their saved trips, memory and turns.
  select array_agg(distinct cid) into cids
    from public.concierge_members where lower(email) = e and cid is not null;
  select array_agg(id) into ib_ids
    from public.inbound_emails where lower(from_email) = e;

  -- Derived KB rows built from this person's inbound mail (their question text).
  if ib_ids is not null and array_length(ib_ids, 1) > 0 then
    with d as (delete from public.kb_candidates where source_email_id = any(ib_ids) returning 1)
      select count(*) into c from d;
    counts := counts || jsonb_build_object('kb_candidates', c); total := total + c;
  end if;

  -- Straight deletes — the person's own records, keyed by their email.
  with d as (delete from public.contacts               where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('contacts', c); total := total + c;
  with d as (delete from public.newsletter_subscribers where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('newsletter_subscribers', c); total := total + c;
  with d as (delete from public.contact_messages       where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('contact_messages', c); total := total + c;
  with d as (delete from public.blog_comments          where lower(author_email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('blog_comments', c); total := total + c;
  with d as (delete from public.crm_contacts           where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('crm_contacts', c); total := total + c;
  with d as (delete from public.ad_leads               where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('ad_leads', c); total := total + c;
  with d as (delete from public.directory_leads        where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('directory_leads', c); total := total + c;
  with d as (delete from public.concierge_requests     where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('concierge_requests', c); total := total + c;
  with d as (delete from public.concierge_members      where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('concierge_members', c); total := total + c;
  with d as (delete from public.inbound_emails         where lower(from_email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('inbound_emails', c); total := total + c;

  -- Anonymise (do NOT delete) the accounting records we must retain for tax law:
  -- strip the personal identifiers, keep the financial row + Stripe references.
  with u as (
    update public.ad_orders
       set customer_email = null, customer_name = null, company = null
     where lower(customer_email) = e returning 1
  ) select count(*) into c from u;
  counts := counts || jsonb_build_object('ad_orders_anonymised', c); total := total + c;

  -- Cascade to the anonymous concierge tables via the linked cid(s).
  if cids is not null and array_length(cids, 1) > 0 then
    with d as (delete from public.concierge_events where cid = any(cids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('concierge_events', c); total := total + c;
    with d as (delete from public.saved_items      where cid = any(cids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('saved_items', c); total := total + c;
    with d as (delete from public.concierge_memory where cid = any(cids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('concierge_memory', c); total := total + c;
  end if;

  -- KEEP them opted-out forever: reinforce the suppression record (legal basis to
  -- retain, so an erasure can never accidentally re-open the door to contact them).
  if not exists (select 1 from public.crm_suppression where lower(email) = e) then
    insert into public.crm_suppression (email, reason) values (e, 'erasure');
    counts := counts || jsonb_build_object('crm_suppression_added', 1);
  else
    counts := counts || jsonb_build_object('crm_suppression_added', 0);
  end if;

  -- Human-readable mask + one-way hash for the audit row (no plaintext identifier).
  masked := left(e, 1) || '***@' || split_part(e, '@', 2);
  insert into public.dsar_erasure_log (request_id, email_sha256, email_masked, actor, counts, total)
    values (p_request_id, encode(sha256(convert_to(e, 'UTF8')), 'hex'), masked, p_actor, counts, total);

  return jsonb_build_object('email_masked', masked, 'total', total, 'counts', counts);
end;
$$;

-- report
select 'dsar_erasure' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='dsar_erasure_log') as tbl,
       (select count(*) from information_schema.routines where routine_schema='public' and routine_name='erase_personal_data') as fn;
