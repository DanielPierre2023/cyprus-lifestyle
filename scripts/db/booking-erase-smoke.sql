-- scripts/db/booking-erase-smoke.sql
-- Behaviour test for migration 20261007100000_privacy_erase_bookings.sql: public.erase_personal_data now removes AND reports the
-- booking engine's data. Drill database only; rolls back.
begin;

do $er$
declare
  req uuid; req_other uuid; b uuid := gen_random_uuid(); b_other uuid := gen_random_uuid(); p uuid := gen_random_uuid(); p_other uuid := gen_random_uuid();
  r jsonb; r2 jsonb; n bigint; t text;
begin
  insert into public.concierge_requests (query, email, status) values ('boat trip', 'erase-me@bk.invalid', 'new') returning id into req;
  insert into public.concierge_requests (query, email, status) values ('villa', 'someone-else@bk.invalid', 'new') returning id into req_other;
  insert into public.bookings (id, ref, concierge_request_id, guest_email, guest_name, query, first_response_due_at, sla_target_minutes, status_token_hash)
    values (b, 'CL-ERASE2', req, 'erase-me@bk.invalid', 'Erin Ase', 'boat trip', now(), 540, 'h-er-1');
  insert into public.bookings (id, ref, concierge_request_id, guest_email, query, first_response_due_at, sla_target_minutes, status_token_hash)
    values (b_other, 'CL-OTHER2', req_other, 'someone-else@bk.invalid', 'villa', now(), 540, 'h-er-2');
  insert into public.booking_partner_requests (id, booking_id, partner_name, partner_email, token_hash, expires_at)
    values (p, b, 'Blue Wave Boats', 'partner@bk.invalid', 'h-er-p1', now() + interval '1 day');
  -- the person is ALSO the partner contact on somebody else's booking
  insert into public.booking_partner_requests (id, booking_id, partner_name, partner_email, token_hash, expires_at)
    values (p_other, b_other, 'Erin Ase Charters', 'Erase-Me@bk.invalid', 'h-er-p2', now() + interval '1 day');
  insert into public.booking_events (booking_id, actor, kind, detail) values
    (b, 'system', 'created', '{}'::jsonb),
    (b, 'system', 'mail_out', '{"direction":"out","to":"erase-me@bk.invalid","subject":"ack","body":"hello"}'::jsonb),
    (b_other, 'system', 'mail_out', '{"direction":"out","to":"erase-me@bk.invalid","subject":"partner ask","body":"x"}'::jsonb),
    (b_other, 'system', 'mail_out', '{"direction":"out","to":"someone-else@bk.invalid","subject":"ack","body":"keep me"}'::jsonb);
  insert into public.commission_ledger (booking_ref, booking_id, partner_name, gross_cents, rate_bps, commission_cents, note)
    values ('CL-ERASE2', b, 'Blue Wave Boats', 10000, 1000, 1000, 'Erin Ase paid cash');

  r := public.erase_personal_data('  Erase-Me@bk.invalid ', 'smoke');
  if (r -> 'counts' ->> 'bookings')::int <> 1 then raise exception 'ERASE FAIL: bookings not reported: %', r; end if;
  if (r -> 'counts' ->> 'booking_partner_requests')::int <> 1 then raise exception 'ERASE FAIL: partner requests not reported: %', r; end if;
  if (r -> 'counts' ->> 'booking_events')::int <> 2 then raise exception 'ERASE FAIL: booking events not reported: %', r; end if;
  if (r -> 'counts' ->> 'commission_ledger_anonymised')::int <> 1 then raise exception 'ERASE FAIL: ledger note not anonymised: %', r; end if;
  if (r -> 'counts' ->> 'booking_partner_emails_anonymised')::int <> 1 then raise exception 'ERASE FAIL: partner address not blanked: %', r; end if;
  if (r -> 'counts' ->> 'booking_mail_events')::int <> 1 then raise exception 'ERASE FAIL: mail events of other bookings not removed: %', r; end if;
  if (r -> 'counts' ->> 'concierge_requests')::int <> 1 then raise exception 'ERASE FAIL: the existing concierge_requests count changed: %', r; end if;
  if (r ->> 'total')::int < 8 then raise exception 'ERASE FAIL: total does not include the booking rows: %', r; end if;

  select count(*) into n from public.bookings where id = b;                                          if n <> 0 then raise exception 'ERASE FAIL: booking survived'; end if;
  select count(*) into n from public.booking_events where booking_id = b;                            if n <> 0 then raise exception 'ERASE FAIL: history survived'; end if;
  select count(*) into n from public.bookings where id = b_other;                                    if n <> 1 then raise exception 'ERASE FAIL: somebody else''s booking was erased'; end if;
  select count(*) into n from public.booking_events where booking_id = b_other and detail ->> 'to' = 'someone-else@bk.invalid';
  if n <> 1 then raise exception 'ERASE FAIL: somebody else''s correspondence was erased'; end if;
  select partner_email into t from public.booking_partner_requests where id = p_other;               if t is not null then raise exception 'ERASE FAIL: partner address still present'; end if;
  select count(*) into n from public.commission_ledger where booking_ref = 'CL-ERASE2' and booking_id is null and note is null;
  if n <> 1 then raise exception 'ERASE FAIL: the ledger row must stay (unlinked, without note); found %', n; end if;
  select count(*) into n from public.crm_suppression where lower(email) = 'erase-me@bk.invalid';      if n < 1 then raise exception 'ERASE FAIL: suppression record missing'; end if;
  select count(*) into n from public.dsar_erasure_log where counts ? 'bookings';                      if n <> 1 then raise exception 'ERASE FAIL: audit row lacks the booking counts'; end if;

  -- idempotent: a second run succeeds and finds nothing
  r2 := public.erase_personal_data('erase-me@bk.invalid', 'smoke');
  if (r2 -> 'counts' ->> 'bookings')::int <> 0 or (r2 -> 'counts' ->> 'booking_events')::int <> 0 then raise exception 'ERASE FAIL: second run not idempotent: %', r2; end if;

  -- only the server may run it
  set local role anon;
  begin perform public.erase_personal_data('x@bk.invalid'); raise exception 'ERASE FAIL: a visitor can run the erasure'; exception when insufficient_privilege then null; end;
  reset role;
  set local role authenticated;
  begin perform public.erase_personal_data('x@bk.invalid'); raise exception 'ERASE FAIL: a signed-in user can run the erasure'; exception when insufficient_privilege then null; end;
  reset role;
  raise warning 'booking erase smoke: all checks hold';
end
$er$;

rollback;
