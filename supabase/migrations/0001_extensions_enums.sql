-- ============================================================================
-- Cyprus Lifestyle — 0001 · Extensions & enums
-- Faithful port of Transilvania Times. Languages: EN · EL · RO · AR (ar = RTL).
-- ----------------------------------------------------------------------------
-- Adjustments vs TT: none here. app_role is copied verbatim.
-- The studio_version_state enum (video studio) is intentionally omitted —
-- the whole studio/anchor/flights/weather subsystem is out of scope.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- Role enum — verbatim from TT.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;
