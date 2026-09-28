-- 0121_contact_request_class.sql
-- Enquiry routing. The public contact form now captures a request CLASS
-- (concierge | feature | advertising | event | press) plus optional phone, district
-- and the submitter's locale, so each enquiry can be routed to the right desk
-- (concierge → desk, feature → editorial, advertising/partnership → CRM). All
-- additive; existing rows are unaffected and the insert degrades gracefully if this
-- has not been applied yet.
alter table public.contact_messages add column if not exists request_class text;
alter table public.contact_messages add column if not exists phone         text;
alter table public.contact_messages add column if not exists district      text;
alter table public.contact_messages add column if not exists locale        text;

create index if not exists contact_messages_request_class_idx
  on public.contact_messages (request_class, created_at desc);
