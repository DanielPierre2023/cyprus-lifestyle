// The text desk runs on OpenAI only (owner's instruction: "nothing from Claude any more, it is too expensive"). This is a ratchet over
// the source tree: a file that reaches for another model vendor fails the build unless it is on the short list of jobs that have not
// been moved yet. The list only ever gets shorter; the delivery that moves the concierge and the mail assistant empties it.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { eq, ok, report } from './_harness';

const ROOT = process.cwd();
const TOKENS = /callClaude|callGemini|CLAUDE_API_KEY|CLAUDE_HAIKU|CLAUDE_SONNET|api\.anthropic\.com|generativelanguage\.googleapis|GEMINI_API_KEY|SONNET_MODEL|HAIKU_MODEL/;

/** Jobs that still use another vendor. Remove an entry when its file is moved over; never add one. */
const NOT_MOVED_YET = [
  'app/api/concierge/normalize-directory/route.ts', 'app/api/concierge/proactive/route.ts', 'app/api/concierge/route.ts', 'app/api/concierge/selftest/route.ts',
  'app/api/health/route.ts', 'lib/ai.ts',
  'lib/concierge/brain.ts', 'lib/concierge/eval.ts', 'lib/concierge/memory.ts', 'lib/concierge/rerank.ts', 'lib/concierge/understand.ts',
  'lib/mail/assist.ts', 'supabase/functions/concierge/index.ts',
];

const SCAN = ['app', 'lib', 'components', 'scripts', 'supabase/functions', 'tools'];
const EXT = /\.(?:ts|tsx|mjs|js|py|ya?ml)$/;
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (relative(ROOT, p).replace(/\\/g, '/') === 'scripts/tests') continue; walk(p, out); } else if (EXT.test(name)) out.push(p);
  }
  return out;
}
const files = SCAN.flatMap((d) => walk(join(ROOT, d))).map((p) => relative(ROOT, p).replace(/\\/g, '/'));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const offenders = files.filter((f) => TOKENS.test(read(f)));
const unexpected = offenders.filter((f) => !NOT_MOVED_YET.includes(f));
eq('no file outside the short list reaches for another model vendor', unexpected, []);
const stale = NOT_MOVED_YET.filter((f) => !offenders.includes(f));
eq('the short list names only files that still need it (remove a moved file from the list)', stale, []);

// ── the article desk and the studio call OpenAI and nothing else ─────────────────────────────────────────────────────────
for (const f of ['supabase/functions/process-scraped-article/index.ts', 'supabase/functions/ai-editorial/index.ts', 'supabase/functions/search-cover-photos/index.ts']) {
  const t = read(f);
  ok(`${f} talks to OpenAI`, /api\.openai\.com/.test(t) && /\/v1\/responses/.test(t));
  ok(`${f} knows no other vendor's endpoint`, !/api\.anthropic\.com|generativelanguage\.googleapis\.com|x-api-key|anthropic-version/i.test(t));
}

// ── the scheduler route only wakes the desk ──────────────────────────────────────────────────────────────────────────────
{
  const route = read('app/api/cron/process/route.ts');
  ok('cron/process wakes the edge function in the background', /functions\/v1\/process-scraped-article/.test(route) && /source:\s*'cron'/.test(route) && /background:\s*true/.test(route));
  ok('and no longer imports the retired desk queue or pipeline', !/lib\/desk\/(?:queue|pipeline)/.test(route));
  ok('the budget guard still stands in front of it', /aiBudgetDeny/.test(route));
}

// ── the retired desk modules are stubs, nothing in the app still builds on them ──────────────────────────────────────────
{
  const users = files.filter((f) => /^(?:app|lib|components)\//.test(f) && /from '@\/lib\/desk\/(?:queue|pipeline)'/.test(read(f)));
  eq('nothing imports the retired desk modules', users, []);
}

// ── gpt-5.5 is named nowhere except in the block list ────────────────────────────────────────────────────────────────────
{
  const named = files.filter((f) => /gpt-5\\?\.5/i.test(read(f))).sort();
  eq('gpt-5.5 appears only where it is blocked', named, ['lib/journalism/models.ts', 'supabase/functions/ai-editorial/index.ts', 'supabase/functions/process-scraped-article/index.ts', 'tools/scraper/scrape.py']);
}

report('openai-only');
