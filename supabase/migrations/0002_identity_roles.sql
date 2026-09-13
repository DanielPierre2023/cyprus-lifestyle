-- ============================================================================
-- Cyprus Lifestyle — 0002 · Identity, roles, shared trigger fns
-- Faithful port of TT: user_roles, has_role(), profiles, handle_new_user(),
-- update_updated_at(). No language changes needed here.
-- ============================================================================

-- ── user_roles ─────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security-definer role check — verbatim from TT (prevents RLS recursion).
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles"   on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles"     on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can update roles" on public.user_roles;
create policy "Admins can update roles"     on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can delete roles" on public.user_roles;
create policy "Admins can delete roles"     on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"     on public.user_roles for select to authenticated using (user_id = auth.uid());

-- ── profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"   on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Auto-create a profile row for every new auth user — verbatim from TT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at bumper — verbatim from TT.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
