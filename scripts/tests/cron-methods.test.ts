// Every website route that the Supabase scheduler calls (supabase/pg_cron/install-jobs.sql → ops.cron_post sends POST)
// must accept POST, and keep GET for Vercel's own cron and manual checks. A route with only GET answers 405 and the job
// would silently never work (found on 2026-10-06: cl-process and cl-booking-sla).
import { readFileSync, existsSync } from 'node:fs';
import { eq, ok, report } from './_harness';

const sql = readFileSync('supabase/pg_cron/install-jobs.sql', 'utf8');
const paths = [...sql.matchAll(/ops\.cron_post\('site',\s*'(\/api\/[^'?]+)/g)].map((m) => m[1]);
ok('the installer schedules at least 4 website routes', paths.length >= 4);
eq('no route is listed twice by mistake', new Set(paths).size, paths.length - (paths.length - new Set(paths).size));

for (const p of paths) {
  const file = `app${p}/route.ts`;
  ok(`${p}: route file exists`, existsSync(file));
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  const has = (m: string) => new RegExp(`export\\s+(async\\s+function\\s+${m}\\b|const\\s+${m}\\s*=)`).test(src);
  ok(`${p}: accepts POST (the scheduler sends POST)`, has('POST'));
  ok(`${p}: still accepts GET`, has('GET'));
}
report('cron-methods');
