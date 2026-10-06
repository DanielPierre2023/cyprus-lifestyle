-- 20261007100000_privacy_erase_bookings.sql
-- Increment 2.2b — the privacy erasure (public.erase_personal_data) now covers the booking engine and REPORTS it.
-- Before: bookings, partner replies and booking history were removed only as a silent side effect of deleting concierge_requests
-- (ON DELETE CASCADE) and never appeared in the erase report. Now the report (the jsonb returned to the admin and stored in
-- dsar_erasure_log.counts) lists: bookings, booking_partner_requests, booking_events (including the e-mail correspondence kept in
-- them), commission_ledger_anonymised, booking_partner_emails_anonymised, booking_mail_events — and they count towards `total`.
-- Everything the function did before is unchanged (same tables, same order, same suppression + audit row); only the booking block
-- is new. Idempotent (create or replace); changes no table and no data. SECURITY: still SECURITY INVOKER with a pinned search_path;
-- execute is limited to the server (service_role) — it was callable by any role before, which had no legitimate use.
-- Run in: Supabase → SQL Editor. Order: after 20261006100000_booking_engine.sql.

create or replace function public.erase_personal_data(p_email text, p_actor text default 'admin', p_request_id uuid default null)
 returns jsonb
 language plpgsql
 set search_path = public, pg_temp
as $function$
declare
  e         text := lower(trim(coalesce(p_email, '')));
  counts    jsonb := '{}'::jsonb;
  total     int := 0;
  c         int;
  cids      text[];
  ib_ids    uuid[];
  masked    text;
  bk_ids    uuid[];
  c2        int;
  c3        int;
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
  -- ── Bookings (increment 2.2): the booking engine's copy of the person's request, with its partner replies, its history and the
  -- e-mail correspondence kept in it. Reported explicitly (these rows used to vanish silently through the ON DELETE CASCADE of
  -- concierge_requests). Commission-ledger rows are ACCOUNTING records: they stay (reference, partner, amounts) but lose their
  -- free-text note, which may name the guest; the foreign key to the booking is then cleared by the cascade.
  select array_agg(id) into bk_ids from public.bookings
   where lower(guest_email) = e
      or concierge_request_id in (select id from public.concierge_requests where lower(email) = e);
  if bk_ids is not null and array_length(bk_ids, 1) > 0 then
    with u as (update public.commission_ledger set note = null where booking_id = any(bk_ids) and note is not null returning 1)
      select count(*) into c from u;
    counts := counts || jsonb_build_object('commission_ledger_anonymised', c); total := total + c;
    select count(*) into c2 from public.booking_partner_requests where booking_id = any(bk_ids);
    select count(*) into c3 from public.booking_events where booking_id = any(bk_ids);
    with d as (delete from public.bookings where id = any(bk_ids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('bookings', c, 'booking_partner_requests', c2, 'booking_events', c3);
    total := total + c + c2 + c3;
  else
    counts := counts || jsonb_build_object('commission_ledger_anonymised', 0, 'bookings', 0, 'booking_partner_requests', 0, 'booking_events', 0);
  end if;
  -- The person as a PARTNER or as a correspondent of OTHER bookings: their address is blanked on partner requests, and the e-mails
  -- sent to / received from them are removed from those bookings' histories.
  with u as (update public.booking_partner_requests set partner_email = null where lower(partner_email) = e returning 1)
    select count(*) into c from u;
  counts := counts || jsonb_build_object('booking_partner_emails_anonymised', c); total := total + c;
  with d as (delete from public.booking_events
              where kind in ('mail_out', 'mail_in') and (lower(detail ->> 'to') = e or lower(detail ->> 'from') = e) returning 1)
    select count(*) into c from d;
  counts := counts || jsonb_build_object('booking_mail_events', c); total := total + c;

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
$function$;

revoke all on function public.erase_personal_data(text, text, uuid) from public, anon, authenticated;
grant execute on function public.erase_personal_data(text, text, uuid) to service_role;

-- VERIFY:  select pg_get_functiondef('public.erase_personal_data(text,text,uuid)'::regprocedure) like '%booking_partner_requests%';   -- true
