// Every text job runs on OpenAI only (owner's instruction: "nothing from Claude any more, it is too expensive"): the article desk, the
// concierge, the mail assistant, the directory sorting. This is a ratchet over the source tree: a file that reaches for another model
// vendor fails the build. The list of jobs that had not been moved yet is empty now and is gone.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { eq, ok, report } from './_harness';

const ROOT = process.cwd();
const TOKENS = /callClaude|callGemini|CLAUDE_API_KEY|CLAUDE_HAIKU|CLAUDE_SONNET|api\.anthropic\.com|generativelanguage\.googleapis|GEMINI_API_KEY|SONNET_MODEL|HAIKU_MODEL/;

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
eq('no file reaches for another model vendor', offenders, []);

// ── the configuration names no other vendor either ───────────────────────────────────────────────────────────────────────
ok('.env.example asks for no key of another model vendor', !/CLAUDE|ANTHROPIC|GEMINI|SONNET|HAIKU/i.test(read('.env.example')));

// ── the concierge, the mail assistant and the sorting of the directory go through the one door (lib/ai.ts) ──────────────
for (const f of ['lib/concierge/chatModel.ts', 'lib/concierge/understand.ts', 'lib/concierge/rerank.ts', 'lib/concierge/memory.ts', 'lib/concierge/eval.ts', 'lib/mail/assist.ts', 'app/api/concierge/proactive/route.ts', 'app/api/concierge/normalize-directory/route.ts', 'app/api/concierge/selftest/route.ts']) {
  const t = read(f);
  ok(`${f} calls the model through lib/ai.ts`, /from '@\/lib\/ai'/.test(t) || /from '@\/lib\/concierge\/chatModel'/.test(t));
  ok(`${f} makes no direct request to a model API`, !/fetch\(\s*['"`]https?:\/\/api\./.test(t));
}

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
