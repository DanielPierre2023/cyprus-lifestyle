-- 0077_mail_assist.sql
-- Draft-on-arrival + opt-in auto-acknowledgement for the backend mailroom.
-- • suggested_reply / suggested_at — the AI reply drafted the moment mail lands,
--   pre-filled in Admin → Mail so working the inbox is a glance and a click.
-- • auto_sent — true when a narrow, guarded acknowledgement was sent automatically
--   (the substantive reply still awaits a human; the thread stays open).
-- • automation_settings.mail_autoack_enabled — the opt-in master switch, OFF by
--   default, that gates auto-acknowledgement. Additive & idempotent.

alter table public.inbound_emails add column if not exists suggested_reply text;
alter table public.inbound_emails add column if not exists suggested_at   timestamptz;
alter table public.inbound_emails add column if not exists auto_sent      boolean not null default false;

alter table public.automation_settings add column if not exists mail_autoack_enabled boolean not null default false;

-- report
select 'inbound_emails cols' as check,
       (select count(*) from information_schema.columns
         where table_schema='public' and table_name='inbound_emails'
           and column_name in ('suggested_reply','suggested_at','auto_sent')) as added,
       (select mail_autoack_enabled from public.automation_settings where id = 1) as autoack;
