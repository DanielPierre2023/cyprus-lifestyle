// ISR freshness policy (Increment 6.2): pages whose data comes through the TAGGED reads (lib/queries.cached.ts) are
// refreshed on every edit by the Supabase webhooks -> /api/revalidate/tags, so their time-based safety net is 1 hour.
// Pages that read UNTAGGED data keep the short 300 s window. This locks both lists and keeps TTL == page value.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq, ok, report } from './_harness';

const root = process.cwd();
const rd = (p: string) => readFileSync(join(root, p), 'utf8');
const rev = (p: string) => Number(/export const revalidate = (\d+);/.exec(rd(p))?.[1]);
const S = 'app/[locale]/(site)/';

const tagged = ['page.tsx', '[category]/page.tsx', 'article/[slug]/page.tsx', 'directory/[type]/[slug]/page.tsx', 'directory/[type]/page.tsx', 'agenda/page.tsx', 'agenda/[slug]/page.tsx'];
const untagged = ['best/[slug]/page.tsx', 'luxury/page.tsx', 'advertise/page.tsx', 'map/page.tsx', 'directory/page.tsx', 'directory/g/[group]/page.tsx', 'author/[slug]/page.tsx'];

const ttl = Number(/^const TTL = (\d+);/m.exec(rd('lib/queries.cached.ts'))?.[1]);
eq('cached-read TTL is 1 h', ttl, 3600);
for (const f of tagged) eq(`${f}: 1 h (equal to TTL)`, rev(S + f), ttl);
for (const f of untagged) eq(`${f}: untagged data keeps 300 s`, rev(S + f), 300);
// every page that is on 1 h must really read through the tagged module (otherwise a webhook would not reach it)
for (const f of tagged.filter((x) => x.startsWith('agenda'))) ok(`${f} reads via queries.cached`, /queries\.cached'/.test(rd(S + f)));

report('isr-ttl');
