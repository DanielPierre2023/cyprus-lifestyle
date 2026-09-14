-- Cyprus Lifestyle — grant the 'admin' role to a specific user.
-- Run in Supabase → SQL Editor (runs as service role; bypasses RLS).
--
-- PREREQUISITE: the person must already exist in Supabase Auth.
--   Create the account first: Dashboard → Authentication → Users → "Add user"
--   (email below, set a password and tick "Auto confirm user"), OR have them
--   sign in once. Then run this script. It is safe to run more than once.

do $$
declare
  v_email text := 'daniel.dobos@add-individual-solutions.com';
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception
      'No auth user found for %. Create the account first (Authentication → Users → Add user), then re-run this script.',
      v_email;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'admin')
  on conflict (user_id, role) do nothing;

  raise notice 'Admin role ensured for % (user_id = %).', v_email, v_uid;
end $$;

-- Verify the grant:
select u.email, r.role
from public.user_roles r
join auth.users u on u.id = r.user_id
where lower(u.email) = lower('daniel.dobos@add-individual-solutions.com');
