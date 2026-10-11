-- scripts/db/member-card-smoke.sql
-- Behaviour test for the member card, partner offers and redemption log (migration 20261008100000_member_card_offers.sql).
-- Drill database only; rolls back.
begin;

do $mc$
declare
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b802';
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a801';
  m uuid; m2 uuid; o uuid; o2 uuid; n bigint; d date;
begin
  -- default state: NO offers exist (the card must not imply any)
  select count(*) into n from public.member_offers;
  if n <> 0 then raise exception 'CARD FAIL: offers exist on a fresh database (%)', n; end if;

  insert into auth.users (id, email) values (user_id, 'user@mc.invalid'), (admin_id, 'admin@mc.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');
  insert into public.concierge_members (email, status) values ('m@mc.invalid', 'active') returning id into m;
  insert into public.concierge_members (email, status) values ('m2@mc.invalid', 'active') returning id into m2;

  -- the lifecycle stamps exist and start empty
  perform grace_notice_at, lapsed_notice_at from public.concierge_members where id = m;

  -- cards: one per member, token hash unique, name limited
  insert into public.member_cards (member_id, token_hash) values (m, 'hash-a');
  begin insert into public.member_cards (member_id, token_hash) values (m, 'hash-b'); raise exception 'CARD FAIL: two cards for one member'; exception when unique_violation then null; end;
  begin insert into public.member_cards (member_id, token_hash) values (m2, 'hash-a'); raise exception 'CARD FAIL: duplicate token hash accepted'; exception when unique_violation then null; end;
  begin update public.member_cards set display_name = repeat('x', 25) where member_id = m; raise exception 'CARD FAIL: 25-character name accepted'; exception when check_violation then null; end;
  begin update public.member_cards set display_name = '' where member_id = m; raise exception 'CARD FAIL: empty name accepted'; exception when check_violation then null; end;
  begin update public.member_cards set version = 0 where member_id = m; raise exception 'CARD FAIL: version 0 accepted'; exception when check_violation then null; end;
  update public.member_cards set display_name = 'Maria', version = 2, token_hash = 'hash-a2', rotated_at = now() where member_id = m;

  -- offers: value rules (continued in the next block)
  insert into public.member_offers (partner_name, offer_en) values ('Taverna Mylos', 'A glass of wine') returning id into o;
end
$mc$;

do $mc2$
declare
  m uuid; m2 uuid; o uuid; o2 uuid; n bigint; d date; a boolean;
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a801';
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b802';
begin
  select id into m  from public.concierge_members where email = 'm@mc.invalid';
  select id into m2 from public.concierge_members where email = 'm2@mc.invalid';
  select id, active into o, a from public.member_offers where partner_name = 'Taverna Mylos';
  if a is not true then raise exception 'CARD FAIL: a new offer is not active by default'; end if;

  begin insert into public.member_offers (partner_name, offer_en) values ('', 'x'); raise exception 'CARD FAIL: empty partner accepted'; exception when check_violation then null; end;
  begin insert into public.member_offers (partner_name, offer_en) values ('P', ''); raise exception 'CARD FAIL: empty offer accepted'; exception when check_violation then null; end;
  begin insert into public.member_offers (partner_name, offer_en) values ('P', repeat('x', 301)); raise exception 'CARD FAIL: 301-character offer accepted'; exception when check_violation then null; end;
  begin insert into public.member_offers (partner_name, offer_en, translations) values ('P', 'x', '["a"]'::jsonb); raise exception 'CARD FAIL: non-object translations accepted'; exception when check_violation then null; end;
  begin insert into public.member_offers (partner_name, offer_en, valid_from, valid_to) values ('P', 'x', date '2026-12-01', date '2026-11-01'); raise exception 'CARD FAIL: reversed validity window accepted'; exception when check_violation then null; end;
  insert into public.member_offers (partner_name, offer_en, translations, valid_from, valid_to, active) values ('Zeta', 'x', '{"el":"y"}', date '2026-11-01', date '2026-12-01', false) returning id into o2;

  -- redemptions: one per member per offer per Cyprus day; default day = the Cyprus calendar day
  insert into public.member_redemptions (offer_id, member_id) values (o, m);
  select redeemed_day into d from public.member_redemptions where offer_id = o and member_id = m;
  if d <> (now() at time zone 'Europe/Nicosia')::date then raise exception 'CARD FAIL: default redemption day is not the Cyprus day (%)', d; end if;
  begin insert into public.member_redemptions (offer_id, member_id) values (o, m); raise exception 'CARD FAIL: second redemption the same day accepted'; exception when unique_violation then null; end;
  insert into public.member_redemptions (offer_id, member_id) values (o, m2);                                        -- another member: fine
  insert into public.member_redemptions (offer_id, member_id, redeemed_day) values (o, m, d - 1);                    -- another day: fine
  insert into public.member_redemptions (offer_id, member_id) values (o2, m);                                        -- another offer: fine
  begin insert into public.member_redemptions (offer_id, member_id) values (gen_random_uuid(), m); raise exception 'CARD FAIL: redemption of an unknown offer accepted'; exception when foreign_key_violation then null; end;

  -- the log holds nothing personal: exactly these columns
  select count(*) into n from information_schema.columns where table_schema = 'public' and table_name = 'member_redemptions'
    and column_name not in ('id', 'offer_id', 'member_id', 'redeemed_at', 'redeemed_day');
  if n <> 0 then raise exception 'CARD FAIL: member_redemptions has columns beyond offer, member id and time'; end if;

  -- nobody but the server can read or write any of the three tables (not visitors, not signed-in users, not administrators)
  set local role anon;
  begin perform count(*) from public.member_cards; raise exception 'CARD FAIL: a visitor can read cards'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.member_offers; raise exception 'CARD FAIL: a visitor can read offers'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.member_redemptions; raise exception 'CARD FAIL: a visitor can read redemptions'; exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  begin perform count(*) from public.member_cards; raise exception 'CARD FAIL: a signed-in user can read cards'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.member_offers; raise exception 'CARD FAIL: a signed-in user can read offers'; exception when insufficient_privilege then null; end;
  begin insert into public.member_offers (partner_name, offer_en) values ('Forged', 'x'); raise exception 'CARD FAIL: a signed-in user created an offer'; exception when insufficient_privilege then null; end;
  begin insert into public.member_redemptions (offer_id, member_id) values (o, m); raise exception 'CARD FAIL: a signed-in user logged a redemption'; exception when insufficient_privilege then null; end;
  reset role;

  -- deleting an offer removes its redemptions; deleting a member removes the card and the member's redemptions
  delete from public.member_offers where id = o2;
  select count(*) into n from public.member_redemptions where offer_id = o2;
  if n <> 0 then raise exception 'CARD FAIL: redemptions survived their offer'; end if;
  delete from public.concierge_members where id = m;
  select count(*) into n from public.member_cards where member_id = m;
  if n <> 0 then raise exception 'CARD FAIL: the card survived its member'; end if;
  select count(*) into n from public.member_redemptions where member_id = m;
  if n <> 0 then raise exception 'CARD FAIL: redemptions survived their member'; end if;
  select count(*) into n from public.member_redemptions where member_id = m2;
  if n <> 1 then raise exception 'CARD FAIL: another member''s redemption was removed'; end if;

  raise warning 'member card smoke: all checks hold';
end
$mc2$;

rollback;
