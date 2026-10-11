-- Switches the automatic gate (voice engine) ON again, AFTER the fix (lib/ai.ts, lib/aiReply.ts, lib/voice/work.ts, lib/voice/runner.ts) is deployed.
-- It starts with a small daily limit (40 editions) so the first results can be checked before the limit is raised. The voice worker now runs on
-- OpenAI (gpt-6-luna); an estimate is about 1 US dollar or less for 40 editions, the real figure appears in the AI spend log after the first day.
-- Run it only after the AI health check (Admin -> AI -> "Run AI health check") has passed.
-- The four attempts that failed because of the too-small token budget are cleared so those editions get a fresh start.
-- Pause at any time:  update site_settings set value = jsonb_set(value, '{enabled}', 'false'::jsonb) where key = 'voice_engine';
update site_settings
set value = jsonb_set(jsonb_set(jsonb_set(jsonb_set(value, '{enabled}', 'true'::jsonb), '{dailyCap}', '40'::jsonb), '{attempts}', '{}'::jsonb), '{idleUntil}', '""'::jsonb),
    updated_at = now()
where key = 'voice_engine';

-- Check: select value->>'enabled' enabled, value->>'dailyCap' cap, value->>'usedToday' used from site_settings where key = 'voice_engine';
