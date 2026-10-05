// Secret scanner — high-precision patterns, no false alarms on placeholders / expiring links.
import { scanText } from '../lib/secrets.mjs';
import { ok, eq, report } from './_harness';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims: object) => `eyJ${b64({ alg: 'HS256', typ: 'JWT' }).slice(3)}.${b64(claims)}.${'s'.repeat(30)}`;
const hits = (t: string) => scanText(t).length;

// real-looking secrets are caught
ok('Supabase service_role key', hits(`KEY=${jwt({ role: 'service_role', iss: 'supabase', ref: 'abc' })}`) === 1);
ok('Supabase anon key', hits(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${jwt({ role: 'anon' })}`) === 1);
ok('Stripe live secret key', hits('sk_live_' + 'a1B2c3D4e5F6g7H8i9J0') === 1);
ok('Stripe webhook secret', hits('whsec_' + 'a1B2c3D4e5F6g7H8i9J0k1L2') === 1);
ok('Anthropic key', hits('sk-ant-' + 'api03-abcdefghijklmnopqrstuv') === 1);
ok('OpenAI key', hits('sk-' + 'abcdefghijklmnopqrstuvwxyz0123456789') === 1);
ok('private key block', hits('-----BEGIN PRIVATE KEY-----') === 1);
ok('secret pasted into a URL (the incident that happened)', hits('https://example.com/api/x?key=enrich-live-3f9c7a2b') === 1);
ok('secret in URL with &', hits('https://example.com/x?a=1&secret=Zk39sd8f7sd9f87sd') === 1);

// placeholders and non-credentials are not
eq('placeholder <ENRICH_SECRET>', hits('https://x.eu/api/embed?key=<ENRICH_SECRET>'), 0);
eq('shell variable', hits('curl "https://x.eu/api?key=$ENRICH_SECRET"'), 0);
eq('PASTE_YOUR placeholder', hits('/api/editorial/polish?key=PASTE_YOUR_ENRICH_SECRET&id=1'), 0);
eq('template placeholder', hits('?key={{secret}}'), 0);
eq('short example value', hits('?key=SECRET&dryRun=1'), 0);
eq('JWT without role (expiring export link) ignored', hits(`url?token=${jwt({ exp: 1791114814 })}`), 0);
eq('ordinary prose', hits('The key to a good concierge is listening. sk is not a key.'), 0);
eq('env example with empty value', hits('ENRICH_SECRET=\nWHATSAPP_APP_SECRET='), 0);
eq('line with the ignore marker is skipped', hits('?key=Zk39sd8f7sd9f87sd // secret-scan:ignore'), 0);
eq('very long line is skipped (data blob)', hits('?key=' + 'a'.repeat(5000)), 0);

report('secret-scan');
