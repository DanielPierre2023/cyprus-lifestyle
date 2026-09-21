-- supabase/ci/prelude.sql
-- Minimal Supabase-compatible bootstrap so the migration set can be applied and
-- smoke-tested on a vanilla Postgres in CI (and locally). This recreates just
-- enough of what Supabase provides at runtime — roles, the auth & storage
-- schemas, auth.uid(), and stub auth.users / storage.* tables — for the DDL in
-- supabase/migrations/*.sql to apply cleanly. It is NOT a substitute for Supabase
-- and is never run against production. Idempotent.

-- Extensions the migrations rely on (also created inside the migrations with
-- `if not exists`, but harmless to ensure here). Requires an image with pgvector.
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Supabase runtime roles.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon')          then create role anon;          end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role')  then create role service_role;  end if;
end $$;

-- auth schema + the current-user helper + a stub users table (FK target + triggers).
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb,
  created_at         timestamptz not null default now()
);

-- storage schema + stub buckets/objects tables so 0010 (bucket + object policies)
-- applies. RLS enabled on objects to mirror Supabase.
create schema if not exists storage;
create table if not exists storage.buckets (
  id                 text primary key,
  name               text,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);
create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id),
  name       text,
  owner      uuid,
  metadata   jsonb,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

select 'ci prelude ready' as status;
