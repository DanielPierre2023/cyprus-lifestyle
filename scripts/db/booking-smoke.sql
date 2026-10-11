-- scripts/db/booking-smoke.sql
-- Behaviour test for the booking engine tables (migration 20261006100000_booking_engine.sql). Drill database only; rolls back.
begin;

do $bk$
declare
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a501';
  req uuid; req2 uuid; b uuid := gen_random_uuid(); b2 uuid := gen_random_uuid(); p uuid := gen_random_uuid(); l uuid := gen_random_uuid();
  n bigint; t text; mem uuid;
begin
  insert into auth.users (id, email) values (admin_id, 'admin@bk.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');
  insert into public.concierge_requests (query, email, status) values ('boat trip', 'guest@bk.invalid', 'new') returning id into req;
  insert into public.concierge_requests (query, email, status) values ('villa', 'guest2@bk.invalid', 'new') returning id into req2;

  insert into public.bookings (id, ref, concierge_request_id, locale, guest_email, query, lane, first_response_due_at, sla_target_minutes, status_token_hash)
    values (b, 'CL-AAAAAA', req, 'en', 'guest@bk.invalid', 'boat trip', 'member', now() + interval '4 hours', 240, 'h-guest-1');

  -- uniqueness: one booking per request, one reference, one token hash
  begin insert into public.bookings (id, ref, concierge_request_id, guest_email, query, first_response_due_at, sla_target_minutes, status_token_hash)
    values (gen_random_uuid(), 'CL-BBBBBB', req, 'x@bk.invalid', 'dup', now(), 60, 'h-2'); raise exception 'BOOKING FAIL: two bookings for one request';
  exception when unique_violation then null; end;
  begin insert into public.bookings (id, ref, concierge_request_id, guest_email, query, first_response_due_at, sla_target_minutes, status_token_hash)
    values (gen_random_uuid(), 'CL-AAAAAA', req2, 'x@bk.invalid', 'dup', now(), 60, 'h-3'); raise exception 'BOOKING FAIL: duplicate reference accepted';
  exception when unique_violation then null; end;

  -- value rules
  begin update public.bookings set lane = 'vip' where id = b; raise exception 'BOOKING FAIL: unknown lane accepted'; exception when check_violation then null; end;
  begin update public.bookings set status = 'maybe' where id = b; raise exception 'BOOKING FAIL: unknown status accepted'; exception when check_violation then null; end;
  begin update public.bookings set guest_email = null, guest_phone = null where id = b; raise exception 'BOOKING FAIL: booking without any contact accepted'; exception when check_violation then null; end;

  insert into public.booking_partner_requests (id, booking_id, partner_name, token_hash, expires_at, status, quote_amount_cents)
    values (p, b, 'Blue Wave Boats', 'h-partner-1', now() + interval '14 days', 'quoted', 12000);
  begin update public.booking_partner_requests set quote_amount_cents = 0 where id = p; raise exception 'BOOKING FAIL: zero quote accepted'; exception when check_violation then null; end;
  begin insert into public.booking_partner_requests (booking_id, partner_name, token_hash, expires_at) values (b, 'X', 'h-partner-1', now()); raise exception 'BOOKING FAIL: duplicate partner token accepted';
  exception when unique_violation then null; end;
  insert into public.booking_events (booking_id, actor, kind, detail) values (b, 'system', 'created', '{}'::jsonb);

  -- ledger: the number must be the half-up rounding of gross x rate
  insert into public.commission_ledger (id, booking_ref, partner_request_id, booking_id, partner_name, gross_cents, rate_bps, commission_cents)
    values (l, 'CL-AAAAAA', p, b, 'Blue Wave Boats', 12050, 1250, 1506);      -- 12050 x 12.5 % = 1506.25 -> 1506
  begin insert into public.commission_ledger (id, booking_ref, partner_name, gross_cents, rate_bps, commission_cents) values (gen_random_uuid(), 'CL-AAAAAA', 'X', 1000, 1000, 101);
    raise exception 'BOOKING FAIL: wrong commission arithmetic accepted'; exception when check_violation then null; end;
  insert into public.commission_ledger (id, booking_ref, partner_name, gross_cents, rate_bps, commission_cents) values (gen_random_uuid(), 'CL-AAAAAA', 'Half', 1050, 1000, 105);   -- 105.0
  insert into public.commission_ledger (id, booking_ref, partner_name, gross_cents, rate_bps, commission_cents) values (gen_random_uuid(), 'CL-AAAAAA', 'Round', 5, 1000, 1);        -- 0.5 -> 1 (half up)
  begin insert into public.commission_ledger (id, booking_ref, partner_request_id, partner_name, gross_cents, rate_bps, commission_cents)
    values (gen_random_uuid(), 'CL-AAAAAA', p, 'Blue Wave Boats', 100, 1000, 10); raise exception 'BOOKING FAIL: two live ledger entries for one partner request';
  exception when unique_violation then null; end;
  begin update public.commission_ledger set rate_bps = 2000, commission_cents = 2410 where id = l; raise exception 'BOOKING FAIL: ledger amounts were edited'; exception when raise_exception then
    if sqlerrm not like '%immutable%' then raise; end if; end;
  begin delete from public.commission_ledger where id = l; raise exception 'BOOKING FAIL: ledger row deleted'; exception when raise_exception then
    if sqlerrm not like '%never deleted%' then raise; end if; end;
  begin update public.commission_ledger set status = 'void' where id = l; raise exception 'BOOKING FAIL: void without a reason accepted'; exception when check_violation then null; end;
  update public.commission_ledger set status = 'confirmed' where id = l;
  update public.commission_ledger set status = 'void', voided_at = now(), voided_by = 'admin:x', void_reason = 'wrong rate' where id = l;
  begin update public.commission_ledger set status = 'expected' where id = l; raise exception 'BOOKING FAIL: void entry reopened'; exception when raise_exception then
    if sqlerrm not like '%cannot be reopened%' then raise; end if; end;
  -- after a void, the partner request may carry a new live entry
  insert into public.commission_ledger (id, booking_ref, partner_request_id, booking_id, partner_name, gross_cents, rate_bps, commission_cents)
    values (gen_random_uuid(), 'CL-AAAAAA', p, b, 'Blue Wave Boats', 12000, 1000, 1200);

  -- nobody but the server can touch the tables (visitors, signed-in users, even administrators)
  for t in select unnest(array['bookings', 'booking_partner_requests', 'booking_events', 'commission_ledger']) loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then raise exception 'BOOKING FAIL: % has no row level security', t; end if;
    execute 'set local role anon';
    begin execute format('select count(*) from public.%I', t); raise exception 'BOOKING FAIL: a visitor can read %', t; exception when insufficient_privilege then null; end;
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', admin_id::text, true);
    execute 'set local role authenticated';
    begin execute format('select count(*) from public.%I', t); raise exception 'BOOKING FAIL: a signed-in user can read %', t; exception when insufficient_privilege then null; end;
    execute 'reset role';
  end loop;
  set local role authenticated;
  begin insert into public.commission_ledger (id, booking_ref, partner_name, gross_cents, rate_bps, commission_cents) values (gen_random_uuid(), 'x', 'x', 100, 0, 0); raise exception 'BOOKING FAIL: a signed-in user wrote to the ledger'; exception when insufficient_privilege then null; end;
  reset role;

  -- GDPR: erasing the concierge request removes the booking, partner replies and events; the ledger row stays, without the booking link
  delete from public.concierge_requests where id = req;
  select count(*) into n from public.bookings where id = b;                                  if n <> 0 then raise exception 'BOOKING FAIL: booking survived its request'; end if;
  select count(*) into n from public.booking_partner_requests where booking_id = b;          if n <> 0 then raise exception 'BOOKING FAIL: partner replies survived'; end if;
  select count(*) into n from public.booking_events where booking_id = b;                    if n <> 0 then raise exception 'BOOKING FAIL: events survived'; end if;
  select count(*) into n from public.commission_ledger where booking_ref = 'CL-AAAAAA' and booking_id is null;
  if n < 3 then raise exception 'BOOKING FAIL: ledger rows lost or still linked after erasure (found %)', n; end if;

  -- membership rows may disappear without taking the booking
  insert into public.concierge_members (email, status) values ('mem@bk.invalid', 'active') returning id into mem;
  insert into public.bookings (id, ref, concierge_request_id, guest_email, query, lane, first_response_due_at, sla_target_minutes, status_token_hash, member_id)
    values (b2, 'CL-CCCCCC', req2, 'guest2@bk.invalid', 'villa', 'member', now(), 240, 'h-guest-9', mem);
  delete from public.concierge_members where id = mem;
  select count(*), max(member_id::text) into n, t from public.bookings where id = b2;
  if n <> 1 or t is not null then raise exception 'BOOKING FAIL: deleting a member must keep the booking and clear member_id'; end if;
  raise warning 'booking smoke: all checks hold';
end
$bk$;

rollback;
