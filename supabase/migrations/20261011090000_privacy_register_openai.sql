-- 20261011090000_privacy_register_openai.sql
-- The Record of Processing Activities (data_processing_register, created in 0092) names the processors of each activity. The AI model provider
-- changed: every text job now runs on OpenAI (the concierge on the website, WhatsApp and Telegram, the mail assistant, the article desk),
-- and no other model vendor receives any data. This brings the register in line with the privacy policy (lib/legal/docs/privacy.*.ts).
--
-- Facts behind the wording (OpenAI's documentation on API data, checked October 2026): data sent to the API is not used to train OpenAI's models
-- unless the customer opts in; abuse-monitoring logs are kept for up to 30 days by default. Our text requests ask OpenAI not to store the responses (store = false).
--
-- Additive and idempotent: it only updates two rows by id, in ONE statement (a DO block), and does nothing when the register table or a row is
-- missing. Safe to run more than once.

do $reg$
begin
  if to_regclass('public.data_processing_register') is null then
    return; -- migration 0092 was never applied: there is no register to update
  end if;

  update public.data_processing_register
     set recipients = 'OpenAI (model inference; under the provider''s standard API terms the data is not used for training), Supabase',
         retention  = 'Turn logs anonymised; contact details kept only to fulfil the request; the model provider keeps API data for up to 30 days for abuse monitoring',
         updated_at = now()
   where id = 'concierge';

  update public.data_processing_register
     set recipients = 'Resend (email), OpenAI (model inference: a suggested reply that a person reviews before anything is sent), Supabase',
         updated_at = now()
   where id = 'mailroom';
end
$reg$;

-- report (read-only; works whether or not the register exists)
select case when to_regclass('public.data_processing_register') is null
            then 'register table missing (migration 0092 was never run): nothing changed'
            else 'privacy register is up to date' end as result;
