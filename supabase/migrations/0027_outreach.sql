-- ============================================================================
-- Cyprus Lifestyle — 0027 · Outreach engine (automation + client management)
--   crm_settings · crm_templates · crm_hooks · crm_enrollments
--   + unsub_token on crm_contacts, and a safety-net create of crm_activities /
--     crm_suppression so this runs even if 0023 was never applied.
--
--   SENDING IS OFF BY DEFAULT. Nothing is ever emailed until you set a from-
--   address and switch crm_settings.sending_enabled on (from the Sponsors tab).
--   Until then the engine runs in preview only. Admin-only throughout.
--   Self-contained & idempotent — safe to run once, or again.
-- ============================================================================

-- ── safety net: these come from 0023; create if absent so 0027 stands alone ──
create table if not exists public.crm_activities (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.crm_orgs(id) on delete cascade,
  deal_id     uuid,
  contact_id  uuid references public.crm_contacts(id) on delete set null,
  type        text not null,
  sequence_id text,
  subject     text,
  body        text,
  opened_at   timestamptz,
  clicked_at  timestamptz,
  replied_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists crm_activities_org_idx on public.crm_activities (org_id, created_at desc);

create table if not exists public.crm_suppression (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  domain     text,
  reason     text not null default 'opt-out',
  created_at timestamptz not null default now()
);
create unique index if not exists crm_suppression_email_uidx on public.crm_suppression (lower(email)) where email is not null;
create index if not exists crm_suppression_domain_idx on public.crm_suppression (lower(domain));

-- ── crm_settings — one row (id=1). The on-switch + sender identity ────────────
create table if not exists public.crm_settings (
  id              int primary key default 1,
  sending_enabled boolean not null default false,   -- the master send switch
  from_name       text,                              -- e.g. "Cyprus Lifestyle — Partnerships"
  from_email      text,                              -- set once you choose the domain
  reply_to        text,
  daily_cap       int not null default 40,           -- max emails per run (be gentle)
  gap_days        jsonb not null default '[4,4,6]',  -- days between steps 1→2, 2→3, 3→4
  updated_at      timestamptz not null default now(),
  constraint crm_settings_singleton check (id = 1)
);
insert into public.crm_settings (id) values (1) on conflict (id) do nothing;

-- ── crm_templates — editable email copy, one per cadence step ─────────────────
create table if not exists public.crm_templates (
  id         uuid primary key default gen_random_uuid(),
  step       int not null,                            -- 1..4
  name       text not null,
  subject    text not null,
  body       text not null,                           -- inner HTML; {{merge}} fields
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);
create unique index if not exists crm_templates_step_uidx on public.crm_templates (step);

-- ── crm_hooks — one tailored opening line per vertical ────────────────────────
create table if not exists public.crm_hooks (
  category   text primary key,
  hook       text not null,
  updated_at timestamptz not null default now()
);

-- ── crm_enrollments — a business moving through the cadence ───────────────────
create table if not exists public.crm_enrollments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.crm_orgs(id) on delete cascade,
  sequence     text not null default 'default',
  step         int not null default 0,                -- emails sent so far (0..4)
  status       text not null default 'active',        -- active|paused|replied|done|unsubscribed|bounced
  next_send_at timestamptz not null default now(),
  last_send_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists crm_enrollments_org_uidx on public.crm_enrollments (org_id);
create index if not exists crm_enrollments_due_idx on public.crm_enrollments (status, next_send_at);

-- ── unsub_token on contacts (drives the one-click opt-out link) ───────────────
alter table public.crm_contacts add column if not exists unsub_token uuid not null default gen_random_uuid();

-- ── updated_at triggers (safe: update_updated_at() exists in this DB) ─────────
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    execute 'drop trigger if exists set_updated_at_crm_settings on public.crm_settings';
    execute 'create trigger set_updated_at_crm_settings before update on public.crm_settings for each row execute function public.update_updated_at()';
    execute 'drop trigger if exists set_updated_at_crm_templates on public.crm_templates';
    execute 'create trigger set_updated_at_crm_templates before update on public.crm_templates for each row execute function public.update_updated_at()';
    execute 'drop trigger if exists set_updated_at_crm_enrollments on public.crm_enrollments';
    execute 'create trigger set_updated_at_crm_enrollments before update on public.crm_enrollments for each row execute function public.update_updated_at()';
  end if;
end $$;

-- ── admin-only RLS (fails closed) ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['crm_settings','crm_templates','crm_hooks','crm_enrollments','crm_activities','crm_suppression']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "crm admin all" on public.%I;', t);
    execute format($p$create policy "crm admin all" on public.%I for all to authenticated
      using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));$p$, t);
  end loop;
end $$;

-- ── seed the 11 vertical hooks (idempotent) ──────────────────────────────────
insert into public.crm_hooks (category, hook) values
 ('law-relocation',      'Cyprus''s appeal to relocators and international companies is one of our readers'' most-asked-about topics — and the firms guiding that move are exactly who they look for.'),
 ('car-rental-prestige', 'Our readers plan the drives, the arrivals and the occasions where the car is part of the experience — and yours is the fleet that fits.'),
 ('beauty-spa',          'Where our readers go to look and feel their best is a section they return to often — and your name comes up.'),
 ('luxury-retail',       'The boutiques worth a special trip are exactly what our style-minded readers want mapped out — and yours is one of them.'),
 ('fine-dining',         'Where to eat well in Cyprus is the question our readers ask most, and your table is firmly on the list worth telling them about.'),
 ('luxury-realestate',   'The homes and developments shaping how Cyprus lives are a constant fascination for our relocating and investing readers.'),
 ('interior-design',     'Our readers are building and reshaping homes across the island, and the studios behind the best of them are who they want to discover.'),
 ('yacht-marine',        'Life on the water is a chapter of Cyprus living our readers dream about — and your name is part of that story.'),
 ('art-culture',         'The cultural life of the island is close to our readers'' hearts, and the spaces showing the work that matters deserve a wider audience.'),
 ('private-health',      'For residents and relocators alike, knowing where to find excellent private care is genuinely reassuring — and your reputation precedes you.'),
 ('gourmet',             'The makers and merchants behind a good table are a quiet obsession for our readers, and yours is one worth introducing.')
on conflict (category) do update set hook = excluded.hook, updated_at = now();

-- ── seed the 4 cadence templates (idempotent by step) ────────────────────────
-- Body is inner HTML wrapped by brandedEmail() at send time (which adds the
-- header, footer and one-click unsubscribe). Merge fields: {{first_name}},
-- {{business}}, {{vertical_label}}, {{hook}}, {{followup_angle}}, {{sender_name}}.
insert into public.crm_templates (step, name, subject, body) values
 (1, 'Feature invitation',
     '{{business}} — a feature in Cyprus Lifestyle?',
     '<p>Dear {{first_name}},</p><p>I''m writing from <em>Cyprus Lifestyle</em>, a new multilingual magazine about the best of living in Cyprus — read in English, Greek, Romanian and Arabic by residents, relocators and visitors who take real interest in where they eat, stay, buy and spend their time here.</p><p>{{hook}}</p><p>We''d love to feature {{business}} — a short interview or a written profile, at no cost to you. It''s simply the kind of place our readers should know about.</p><p>Would you be open to a brief conversation this week or next? I can send a few questions by email, or call at a time that suits you.</p><p>Warm regards,<br>{{sender_name}}<br>Editorial &amp; Partnerships · Cyprus Lifestyle</p>'),
 (2, 'Partnership introduction',
     '{{business}} × Cyprus Lifestyle',
     '<p>Dear {{first_name}},</p><p>Following my note about featuring {{business}} — I wanted to share how a few brands like yours are choosing to work with us more closely.</p><p>Alongside editorial, Cyprus Lifestyle offers a small number of partner placements: a presence in the relevant section of our directory and map, a banner on the pages your customers actually read, and inclusion in our newsletter — all in the four languages our audience speaks.</p><p>We keep the number of partners per category deliberately low, so each one stands out. {{business}} would be a natural fit for the {{vertical_label}} category.</p><p>May I send our media kit and current rates? No commitment — just so you can see whether it''s worth a short call.</p><p>Warm regards,<br>{{sender_name}}<br>Cyprus Lifestyle</p>'),
 (3, 'Follow-up',
     'Re: {{business}} × Cyprus Lifestyle',
     '<p>Dear {{first_name}},</p><p>I know how full the days get, so just a short follow-up. {{followup_angle}}</p><p>If it''s useful, I''m happy to send the media kit so it''s there when the timing is right — or to point you to a couple of features we''ve already run so you can see the tone.</p><p>Either way, thank you for your time.</p><p>{{sender_name}}<br>Cyprus Lifestyle</p>'),
 (4, 'Graceful close',
     'Shall I close the loop, {{first_name}}?',
     '<p>Dear {{first_name}},</p><p>I don''t want to crowd your inbox, so this is my last note for now. If featuring {{business}} or partnering with us is something for later in the year, just reply and I''ll pick it up then — the door stays open.</p><p>Wishing you and the team a great season.</p><p>{{sender_name}}<br>Cyprus Lifestyle</p>')
on conflict (step) do nothing;

-- ── report ───────────────────────────────────────────────────────────────────
select
  (select count(*) from public.crm_templates) as templates,
  (select count(*) from public.crm_hooks)     as hooks,
  (select count(*) from public.crm_orgs)      as orgs_in_book,
  (select sending_enabled from public.crm_settings where id=1) as sending_enabled;
