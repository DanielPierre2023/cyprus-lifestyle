-- ============================================================================
-- Backend fields for the directory & events: contact details and data
-- provenance. These support future outreach and the planned chatbot; they are
-- NOT rendered on the public site. Run once in the SQL editor BEFORE the seed
-- migrations (0021, 0022). Idempotent — safe to re-run.
--
-- GDPR NOTE: email / contact_person / contact_role hold business contact data
-- gathered from public sources. A lawful basis (consent, or legitimate interest
-- with a balancing test + opt-out) is required before any marketing outreach,
-- and named individuals may exercise data-subject rights. Keep source_url as the
-- provenance record.
-- ============================================================================

alter table public.directory_listings
  add column if not exists email           text,
  add column if not exists contact_person  text,
  add column if not exists contact_role    text,
  add column if not exists source_url      text,
  add column if not exists coords_precision text default 'exact',   -- exact | town
  add column if not exists notes           text;                    -- internal/backend only

alter table public.events
  add column if not exists source_url       text,
  add column if not exists organizer        text,
  add column if not exists organizer_email  text,
  add column if not exists coords_precision text default 'exact',   -- exact | town
  add column if not exists recurrence       text default 'one-off', -- annual | one-off
  add column if not exists date_confidence  text default 'confirmed', -- confirmed | approximate
  add column if not exists notes            text;
