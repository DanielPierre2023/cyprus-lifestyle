// Error-log fingerprinting — groups repeated failures despite volatile ids/numbers
// (roadmap item 03).
import { fingerprint } from '@/lib/monitor.server';
import { eq, ok, report } from './_harness';

// Same problem, different numbers/ids → same fingerprint (so they group).
const a = fingerprint('cron-tick', 'fetch failed after 3 retries (ETIMEDOUT) id=1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d');
const b = fingerprint('cron-tick', 'fetch failed after 12 retries (ETIMEDOUT) id=9f8e7d6c-5b4a-3c2d-1e0f-a1b2c3d4e5f6');
eq('numbers + uuids collapse to the same key', a, b);

// Different source → different fingerprint.
ok('source is part of the key', fingerprint('mail-inbound', 'x') !== fingerprint('concierge-chat', 'x'));

// Quoted values collapse.
eq('quoted values collapse',
  fingerprint('scrape', 'no selector matched "https://a.example/page-1"'),
  fingerprint('scrape', 'no selector matched "https://b.example/page-2"'));

// Prefix is the source; key is bounded in length.
ok('key starts with source', fingerprint('cron-tick', 'anything').startsWith('cron-tick:'));
ok('key is length-bounded', fingerprint('s', 'y'.repeat(500)).length <= 160);

report('monitor.fingerprint');
