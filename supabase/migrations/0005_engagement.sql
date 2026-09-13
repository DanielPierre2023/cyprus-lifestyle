-- ============================================================================
-- Cyprus Lifestyle — 0005 · Audience & engagement
--   contacts · newsletter_subscribers (+sync) · newsletter_campaigns
--   contact_messages (Inbox) · social_posts
-- Faithful port. Language defaults widened to the 4-language set where relevant.
-- ============================================================================

-- ── contacts (CRM) ───────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id                   uuid primary key default gen_random_uuid(),
  email                text unique not null,
  name                 text,
  source               text default 'manual',
  notes                text,
  language             text default 'en',       -- en | el | ro | ar
  tags                 text[] default '{}',
  newsletter_subscribed boolean default false,
  phone                text,
  company              text,
  contact_type         text default 'general',
  last_email_sent_at   timestamptz,
  last_email_type      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.contacts enable row level security;
drop policy if exists "Admins manage contacts table" on public.contacts;
create policy "Admins manage contacts table" on public.contacts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.contacts;
create trigger set_updated_at before update on public.contacts
  for each row execute function public.update_updated_at();

-- ── newsletter_subscribers ───────────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique not null,
  name                text,
  is_active           boolean not null default true,
  confirmed           boolean not null default false,
  language            text default 'en',        -- edition the subscriber wants
  confirmation_token  text,
  confirmation_sent_at timestamptz,
  confirmed_at        timestamptz,
  unsubscribed_at     timestamptz,
  county              text,                      -- Cyprus district (optional)
  weather_alerts      boolean default false,     -- carried for parity; unused in Cyprus
  created_at          timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe"        on public.newsletter_subscribers for insert to anon, authenticated with check (true);
drop policy if exists "Admins manage subscribers" on public.newsletter_subscribers;
create policy "Admins manage subscribers"   on public.newsletter_subscribers for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Mirror every new subscriber into contacts — verbatim from TT.
create or replace function public.sync_subscriber_to_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contacts (email, name, source)
  values (new.email, split_part(new.email, '@', 1), 'newsletter')
  on conflict (email) do nothing;
  return new;
end;
$$;

drop trigger if exists on_subscriber_created on public.newsletter_subscribers;
create trigger on_subscriber_created
  after insert on public.newsletter_subscribers
  for each row execute function public.sync_subscriber_to_contacts();

-- ── newsletter_campaigns ─────────────────────────────────────────────────────
create table if not exists public.newsletter_campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  content         text,
  status          text not null default 'draft',
  target_language text default 'all',            -- all | en | el | ro | ar
  sent_at         timestamptz,
  recipient_count integer default 0,
  created_at      timestamptz not null default now()
);
alter table public.newsletter_campaigns enable row level security;
drop policy if exists "Admins manage campaigns" on public.newsletter_campaigns;
create policy "Admins manage campaigns" on public.newsletter_campaigns for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ── contact_messages (Inbox) ─────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  status      text not null default 'unread',    -- unread | read | replied
  admin_reply text,
  created_at  timestamptz not null default now(),
  replied_at  timestamptz
);
alter table public.contact_messages enable row level security;
drop policy if exists "Anyone can submit contact" on public.contact_messages;
create policy "Anyone can submit contact" on public.contact_messages for insert to anon, authenticated with check (true);
drop policy if exists "Admins manage contacts" on public.contact_messages;
create policy "Admins manage contacts"    on public.contact_messages for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── social_posts (publishing ledger) ─────────────────────────────────────────
create table if not exists public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references public.blog_posts(id) on delete cascade,
  platform    text,                              -- facebook | instagram | x | linkedin | youtube
  lang        text default 'en',                 -- language of the post copy
  format      text,
  status      text default 'published',
  external_id text,
  permalink   text,
  campaign    text,
  variant     text,
  image_url   text,
  error       text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.social_posts enable row level security;
-- Live used an inline EXISTS(user_roles) test; has_role() is the equivalent.
drop policy if exists "social_posts_admin_all" on public.social_posts;
create policy "social_posts_admin_all" on public.social_posts for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
