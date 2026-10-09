// Every strict JSON schema the desk sends to OpenAI follows the strict-mode rules (all fields required, additionalProperties false, no unsupported
// keywords), and the checker that says so is itself checked on bad and good examples. The live API answers a schema that breaks a rule with a 400,
// and the desk would then fall back to plain JSON mode: working, but without the guarantee that made the strict schema worth having.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EDITORIAL_SCHEMA, FIELDS_SCHEMA } from '@/lib/journalism/editorial';
import { FACT_CHECK_SCHEMA, REPAIR_SCHEMA } from '@/lib/journalism/factCheck';
import { FACT_CORE_SCHEMA } from '@/lib/journalism/factCore';
import { COMPOSE_SCHEMA } from '@/lib/journalism/prompts';
import { buildRequestBody } from '@/lib/journalism/openai';
import { strictSchemaProblems, requestProblem, JSON_WORD_MESSAGE } from './_openaiRules';
import { eq, ok, report } from './_harness';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── our schemas ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const OURS: Record<string, unknown> = {
  EDITORIAL_SCHEMA, FIELDS_SCHEMA, FACT_CHECK_SCHEMA, REPAIR_SCHEMA, FACT_CORE_SCHEMA, COMPOSE_SCHEMA,
  title: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false },
};
for (const [name, schema] of Object.entries(OURS)) eq(`${name}: accepted by the strict rules`, strictSchemaProblems(schema), []);

// ── the checker itself ───────────────────────────────────────────────────────────────────────────────────────────────────
const good = { type: 'object', properties: { a: { type: 'string' }, b: { type: ['string', 'null'] }, c: { type: 'array', items: { type: 'object', properties: { d: { type: 'number' } }, required: ['d'], additionalProperties: false } }, e: { type: 'string', enum: ['x', 'y'] } }, required: ['a', 'b', 'c', 'e'], additionalProperties: false };
eq('a correct schema has no problems', strictSchemaProblems(good), []);
ok('a missing additionalProperties:false is found', strictSchemaProblems({ type: 'object', properties: { a: { type: 'string' } }, required: ['a'] }).some((p) => /additionalProperties/.test(p)));
ok('a property that is not required is found', strictSchemaProblems({ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a'], additionalProperties: false }).some((p) => /Missing 'b'/.test(p)));
ok('a required name that is not a property is found', strictSchemaProblems({ type: 'object', properties: { a: { type: 'string' } }, required: ['a', 'z'], additionalProperties: false }).some((p) => /'z'/.test(p)));
ok('a nested object is checked too', strictSchemaProblems({ type: 'object', properties: { n: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] } }, required: ['n'], additionalProperties: false }).some((p) => /\.n/.test(p)));
ok('an array item object is checked too', strictSchemaProblems({ type: 'object', properties: { l: { type: 'array', items: { type: 'object', properties: { a: { type: 'string' } }, required: [] } } }, required: ['l'], additionalProperties: false }).length >= 2);
for (const kw of ['minLength', 'maxLength', 'oneOf', 'allOf', 'uniqueItems']) ok(`${kw} is found`, strictSchemaProblems({ type: 'object', properties: { a: { type: 'string', [kw]: kw === 'oneOf' || kw === 'allOf' ? [] : 1 } }, required: ['a'], additionalProperties: false }).some((p) => p.includes(kw)));
ok('a root that is not an object is found', strictSchemaProblems({ type: 'array', items: { type: 'string' } }).some((p) => /root/.test(p)));
ok('anyOf at the root is found', strictSchemaProblems({ anyOf: [{ type: 'object', properties: {}, required: [], additionalProperties: false }] }).some((p) => /root/.test(p)));
ok('anyOf below the root is fine', strictSchemaProblems({ type: 'object', properties: { a: { anyOf: [{ type: 'string' }, { type: 'null' }] } }, required: ['a'], additionalProperties: false }).length === 0);
ok('pattern and format on strings, min/max on numbers and arrays are fine', strictSchemaProblems({ type: 'object', properties: { s: { type: 'string', pattern: '^a', format: 'email' }, n: { type: 'number', minimum: 0, maximum: 5 }, l: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 } }, required: ['s', 'n', 'l'], additionalProperties: false }).length === 0);
ok('more than ten levels of nesting is found', (() => { let s: any = { type: 'string' }; for (let i = 0; i < 11; i++) s = { type: 'object', properties: { x: s }, required: ['x'], additionalProperties: false }; return strictSchemaProblems(s).some((p) => /deeper than 10/.test(p)); })());

// ── the request rules ────────────────────────────────────────────────────────────────────────────────────────────────────
const base = { model: 'gpt-6-luna', instructions: 'Return JSON.', input: 'Return exactly {"ok":true}', store: false };
eq('plain JSON mode without the word in the input: refused (what the first live health check hit)', requestProblem({ ...base, text: { format: { type: 'json_object' } } }), JSON_WORD_MESSAGE);
eq('…the instructions do not count', requestProblem({ ...base, instructions: 'Output only the requested JSON.', text: { format: { type: 'json_object' } } }), JSON_WORD_MESSAGE);
eq('…with the word in the input: accepted', requestProblem({ ...base, input: 'Return exactly {"ok":true} as JSON', text: { format: { type: 'json_object' } } }), null);
eq('…with the word in an earlier message of a conversation: accepted', requestProblem({ ...base, input: [{ role: 'user', content: 'answer in JSON' }, { role: 'assistant', content: '{}' }, { role: 'user', content: 'again' }], text: { format: { type: 'json_object' } } }), null);
eq('a request without a format never needs the word', requestProblem({ ...base }), null);
ok('an invalid strict schema is refused with the schema message', /Invalid schema for response_format 'x'/.test(String(requestProblem({ ...base, text: { format: { type: 'json_schema', name: 'x', strict: true, schema: { type: 'object', properties: { a: { type: 'string' } } } } } }))));
ok('a bad format name is refused', /text\.format\.name/.test(String(requestProblem({ ...base, text: { format: { type: 'json_schema', name: 'not valid!', strict: true, schema: good } } }))));
ok('a cap below 16 tokens is refused', /max_output_tokens/.test(String(requestProblem({ ...base, max_output_tokens: 8 }))));
ok('an unknown effort is refused', /reasoning\.effort/.test(String(requestProblem({ ...base, reasoning: { effort: 'turbo' } }))));
ok('an unknown message role is refused', /Supported values are/.test(String(requestProblem({ ...base, input: [{ role: 'robot', content: 'x' }] }))));

// ── what the client builds passes the rules, in every mode ──────────────────────────────────────────────────────────────
const REQ = { model: 'gpt-6-luna', system: 'You are a connectivity test. Output only the requested JSON.', user: 'Return exactly {"ok":true} and nothing else.' };
eq('plain JSON mode as the health check sends it', requestProblem(buildRequestBody({ ...REQ, json: 'object' })), null);
eq('plain JSON mode with a conversation', requestProblem(buildRequestBody({ ...REQ, history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }], json: 'object' })), null);
eq('strict schema mode', requestProblem(buildRequestBody({ ...REQ, json: { name: 'selftest', schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } } })), null);
eq('a plain text request', requestProblem(buildRequestBody({ ...REQ, effort: 'low' })), null);
eq('with web search and no format', requestProblem(buildRequestBody({ ...REQ, webSearch: true, json: 'object' })), null);

// ── the callers that do not go through the shared client ────────────────────────────────────────────────────────────────
// The shared client (lib/journalism/openai.ts) adds the word JSON to the input by itself. Two callers talk to the API directly; each has to name JSON
// in its own input message. A NEW file that asks for plain JSON mode must be added here on purpose, with its input checked.
const ROOT = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(?:ts|tsx|mjs|js|py)$/.test(name)) out.push(relative(ROOT, p).replace(/\\/g, '/'));
  }
  return out;
}
const GENERATED = ['supabase/functions/process-scraped-article/index.ts', 'supabase/functions/ai-editorial/index.ts'];
const askers = ['app', 'lib', 'components', 'supabase/functions', 'tools', 'scripts/edge'].flatMap((d) => walk(join(ROOT, d)))
  .filter((f) => !GENERATED.includes(f) && readFileSync(join(ROOT, f), 'utf8').includes('json_object')).sort();
eq('the files that ask the API for plain JSON mode', askers, ['lib/journalism/openai.ts', 'supabase/functions/search-cover-photos/index.ts', 'tools/scraper/scrape.py']);
ok('search-cover-photos names JSON in its input message', /const user = `[^`]*JSON[^`]*`;/.test(readFileSync(join(ROOT, 'supabase/functions/search-cover-photos/index.ts'), 'utf8')));
ok('the Python scraper names JSON in its input message', /"input": f"[^"]*JSON[^"]*"/.test(readFileSync(join(ROOT, 'tools/scraper/scrape.py'), 'utf8')));

report('openai-schemas');
