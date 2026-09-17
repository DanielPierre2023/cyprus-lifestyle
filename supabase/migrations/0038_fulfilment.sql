-- ============================================================================
-- Cyprus Lifestyle — 0038 · Fulfilment automation (v1)
--   Closes the gap between "payment recorded" and "placement live":
--     • fulfillment_tasks   — one auto-generated checklist per paid order
--     • fulfil_ad_order()    — provisioning called from the Stripe webhook
--     • makes sold things REAL: directory verified badge, sponsored-article
--       marker, event spotlight flag, newsletter sponsor schedule, banner↔order
--   Idempotent & non-destructive; safe to run once or again.
-- ============================================================================

-- ── 1. make the sold placements representable ───────────────────────────────
alter table public.directory_listings add column if not exists verified boolean not null default false;
alter table public.events            add column if not exists featured boolean not null default false;

alter table public.blog_posts add column if not exists sponsored     boolean not null default false;
alter table public.blog_posts add column if not exists sponsor_name  text;
alter table public.blog_posts add column if not exists sponsor_url   text;
alter table public.blog_posts add column if not exists sponsor_org_id uuid references public.crm_orgs(id) on delete set null;

-- link a banner to the account + the order that paid for it
alter table public.sponsor_banners add column if not exists org_id      uuid references public.crm_orgs(id) on delete set null;
do $$ begin
  if to_regclass('public.ad_orders') is not null then
    alter table public.sponsor_banners add column if not exists ad_order_id uuid references public.ad_orders(id) on delete set null;
  else
    alter table public.sponsor_banners add column if not exists ad_order_id uuid;
  end if;
end $$;

-- ── 2. newsletter sponsors (per-send sole sponsor) ──────────────────────────
create table if not exists public.newsletter_sponsors (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.crm_orgs(id) on delete set null,
  ad_order_id     uuid,
  advertiser_name text,
  headline        text,
  body            text,
  url             text,
  image           text,
  target_language text not null default 'all',            -- 'all' | a locale
  send_date       date,                                   -- the Saturday it runs
  status          text not null default 'pending',        -- pending | scheduled | sent | cancelled
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- one sole sponsor per scheduled send + language
create unique index if not exists newsletter_sponsors_send_uidx
  on public.newsletter_sponsors (send_date, target_language)
  where status = 'scheduled' and send_date is not null;

-- ── 3. fulfilment task queue ────────────────────────────────────────────────
create table if not exists public.fulfillment_tasks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.crm_orgs(id) on delete set null,
  ad_order_id  uuid,
  product_slot text,
  title        text not null,
  steps        jsonb not null default '[]'::jsonb,        -- [{label, done}]
  status       text not null default 'open',              -- open | in_progress | done | blocked
  due_at       timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists fulfillment_tasks_order_uidx
  on public.fulfillment_tasks (ad_order_id) where ad_order_id is not null;
create index if not exists fulfillment_tasks_status_idx on public.fulfillment_tasks (status, due_at);

-- updated_at triggers (reuse update_updated_at() if present)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    execute 'drop trigger if exists set_updated_at_fulfillment_tasks on public.fulfillment_tasks';
    execute 'create trigger set_updated_at_fulfillment_tasks before update on public.fulfillment_tasks for each row execute function public.update_updated_at()';
    execute 'drop trigger if exists set_updated_at_newsletter_sponsors on public.newsletter_sponsors';
    execute 'create trigger set_updated_at_newsletter_sponsors before update on public.newsletter_sponsors for each row execute function public.update_updated_at()';
  end if;
end $$;

-- admin-only RLS (fails closed; service_role bypasses RLS)
do $$
declare t text;
begin
  foreach t in array array['fulfillment_tasks','newsletter_sponsors']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "fulfil admin all" on public.%I;', t);
    execute format($p$create policy "fulfil admin all" on public.%I for all to authenticated
      using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));$p$, t);
  end loop;
end $$;

-- ── 4. provisioning function — called from the Stripe webhook on payment ─────
-- Given a paid ad_orders.id it raises the right checklist and auto-provisions
-- the mechanical parts (flip listing featured/verified, draft an inactive
-- banner, draft a flagged article, reserve a newsletter slot). Public-facing
-- "go live" stays a human step; nothing is auto-published or auto-activated.
create or replace function public.fulfil_ad_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o        record;
  v_org    uuid;
  v_listing uuid;
  v_adv    text;
  v_title  text;
  v_steps  jsonb;
  v_due    interval := interval '3 days';
begin
  select * into o from public.ad_orders where id = p_order_id;
  if not found then return; end if;

  -- idempotent: one fulfilment task per order (also guards duplicate webhooks)
  if exists (select 1 from public.fulfillment_tasks where ad_order_id = p_order_id) then
    return;
  end if;

  v_org := o.org_id;
  v_adv := coalesce(nullif(o.company,''), nullif(o.customer_name,''), 'New advertiser');
  if v_org is not null then
    select directory_listing_id into v_listing from public.crm_orgs where id = v_org;
  end if;

  if o.slot in ('tier-listed','premium-listing') then
    v_title := 'Onboard listing — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Confirm or create the directory listing','done',false),
      jsonb_build_object('label','Collect logo, photo, summary, website, phone','done',false),
      jsonb_build_object('label','Publish; confirm featured + verified','done',false),
      jsonb_build_object('label','QA the seven translations','done',false));
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, updated_at = now() where id = v_listing;
    end if;

  elsif o.slot = 'tier-featured' then
    v_title := 'Onboard Featured — ' || v_adv;
    v_due := interval '5 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Listing: publish, set featured + verified','done',false),
      jsonb_build_object('label','Banner: design + activate (draft created)','done',false),
      jsonb_build_object('label','Schedule the first quarterly sponsored feature','done',false),
      jsonb_build_object('label','Add to next newsletter mention block','done',false));
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, updated_at = now() where id = v_listing;
    end if;
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'sidebar-homepage', false, 1, v_org, p_order_id);

  elsif o.slot = 'sidebar-leaderboard' then
    v_title := 'Set up homepage banner — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Design/collect banner creative (7 languages)','done',false),
      jsonb_build_object('label','Fill headline, body, CTA, URL, image, colours','done',false),
      jsonb_build_object('label','Activate the banner','done',false));
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'sidebar-homepage', false, 1, v_org, p_order_id);

  elsif o.slot = 'section-sponsorship' then
    v_title := 'Set up section sponsorship — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree the section','done',false),
      jsonb_build_object('label','Design the "presented by" lockup + banner','done',false),
      jsonb_build_object('label','Map sponsor to the section + activate','done',false));
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'section-sponsorship', false, 1, v_org, p_order_id);

  elsif o.slot = 'sponsored-feature' then
    v_title := 'Produce sponsored feature — ' || v_adv;
    v_due := interval '10 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree angle; send interview questions / gather notes','done',false),
      jsonb_build_object('label','Draft in Editorial Studio','done',false),
      jsonb_build_object('label','Edit; confirm sponsored ("presented by")','done',false),
      jsonb_build_object('label','Translate to seven languages','done',false),
      jsonb_build_object('label','Publish + add to newsletter/social','done',false));
    insert into public.blog_posts (slug, title_en, status, sponsored, sponsor_name, sponsor_org_id)
    values ('sponsored-' || substr(p_order_id::text,1,8), '(Draft) Sponsored feature — ' || v_adv, 'draft', true, v_adv, v_org);

  elsif o.slot = 'newsletter-sole' then
    v_title := 'Schedule newsletter sponsor — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree the Saturday send date','done',false),
      jsonb_build_object('label','Collect headline, copy, image, URL','done',false),
      jsonb_build_object('label','Attach sponsor to that send','done',false));
    insert into public.newsletter_sponsors (org_id, ad_order_id, advertiser_name, target_language, status)
    values (v_org, p_order_id, v_adv, coalesce(nullif(o.locale,''),'all'), 'pending');

  elsif o.slot = 'directory-exclusive' then
    v_title := 'Set category exclusivity — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Confirm the category','done',false),
      jsonb_build_object('label','Mark account exclusive; remove competing promotion','done',false));

  elsif o.slot = 'agenda-event' then
    v_title := 'Spotlight event — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Collect event details + image','done',false),
      jsonb_build_object('label','Create the event; set featured','done',false),
      jsonb_build_object('label','Social push near the date','done',false));

  elsif o.slot = 'tier-partner' then
    v_title := 'Onboard Partner — ' || v_adv;
    v_due := interval '7 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree annual plan + exclusivity','done',false),
      jsonb_build_object('label','Build series calendar + placements','done',false),
      jsonb_build_object('label','Kick off first deliverables','done',false));

  else
    v_title := 'Fulfil order — ' || v_adv || ' (' || coalesce(o.slot,'?') || ')';
    v_steps := jsonb_build_array(jsonb_build_object('label','Review and fulfil this order','done',false));
  end if;

  insert into public.fulfillment_tasks (org_id, ad_order_id, product_slot, title, steps, status, due_at)
  values (v_org, p_order_id, o.slot, v_title, v_steps, 'open', now() + v_due);
end;
$$;

grant execute on function public.fulfil_ad_order(uuid) to service_role;

-- ── report ──────────────────────────────────────────────────────────────────
select
  (select count(*) from public.fulfillment_tasks)  as tasks,
  (select count(*) from public.newsletter_sponsors) as newsletter_sponsors,
  exists(select 1 from information_schema.columns where table_name='directory_listings' and column_name='verified') as dir_verified,
  exists(select 1 from information_schema.columns where table_name='blog_posts' and column_name='sponsored') as posts_sponsored,
  exists(select 1 from information_schema.columns where table_name='events' and column_name='featured') as events_featured;
