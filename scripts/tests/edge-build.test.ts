// The edge function that is pasted into the Supabase dashboard is a GENERATED file. These checks make sure that what ships is what the
// source says, that it loads and answers, and that slimming the voice data for the bundle did not change a single verdict.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildEdgeFunction, slimVoiceData, FUNCTIONS } from '../lib/edge-build.mjs';
import { urlStubs } from './_stubs/url-stubs.mjs';
import { FIXTURES, HUMAN_EDGE } from './fixtures/antiAi-langs';
import { eq, ok, report } from './_harness';

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;
const root = process.cwd();
const cache = join(root, 'node_modules', '.cache', 'cl-edge-build');
mkdirSync(cache, { recursive: true });

async function load(name: string, code: string) {
  const file = join(cache, `${name}.mjs`);
  writeFileSync(file, code);
  return import(`${pathToFileURL(file).href}?t=${Date.now()}`);
}
async function judge(name: string, plugins: any[]) {
  const r = await build({ stdin: { contents: "export { assessEdition } from '@/lib/journalism/assess';", resolveDir: root, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', tsconfig: join(root, 'tsconfig.json'), plugins, charset: 'utf8', logLevel: 'silent' });
  return load(name, r.outputFiles[0].text);
}

// What each generated function must export for the tests (and for anyone reading the file).
const EXPORTS: Record<string, string[]> = {
  'process-scraped-article': ['handle', 'processOne', 'budgetDeny', 'requireAdmin'],
  'ai-editorial': ['handle', 'budgetDeny', 'scrubModelNames'],
};

async function main() {
  g.Deno = { env: { get: (k: string) => ({ SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key', OPENAI_API_KEY: 'sk-x' } as Record<string, string>)[k] } };
  g.__fakeSupabase = () => ({ from: () => ({}), rpc: async () => ({}), auth: {} });
  ok('the build knows both generated functions', FUNCTIONS.map((f: { name: string }) => f.name).join() === 'process-scraped-article,ai-editorial');

  for (const fn of FUNCTIONS as Array<{ name: string; src: string; out: string }>) {
    // ── the committed file is what the source produces ──────────────────────────────────────────────────────────────────
    const fresh = await buildEdgeFunction({ root, name: fn.name });
    const committed = readFileSync(join(root, fn.out), 'utf8');
    ok(`${fn.out} is up to date (run "node scripts/build-edge-journalism.mjs" after changing the source or lib/journalism, lib/voice)`, fresh === committed);
    ok(`${fn.name}: it starts with @ts-nocheck so Deno never type-checks generated code`, committed.startsWith('// @ts-nocheck'));
    ok(`${fn.name}: its banner says where it comes from`, committed.includes(`built from ${fn.src}`));
    ok(`${fn.name}: it keeps exactly two URL imports: Deno's server and supabase-js`, (committed.match(/^import .* from "https:\/\/[^"]+";$/gm) || []).length === 2);
    ok(`${fn.name}: it contains no Node-only calls`, !/\brequire\(|\bprocess\.|node:/.test(committed.replace(/\/\/.*$/gm, '')));
    ok(`${fn.name}: no model other than the allowed one can be reached: gpt-5.5 is only named in the block list`, (committed.match(/gpt-5\.5/g) || []).length <= 3 && !/"gpt-5\.5[^"]*":\s*\{/.test(committed));
    ok(`${fn.name}: no leftover of the earlier model vendors in the code paths (Claude, Gemini)`, !/api\.anthropic\.com|generativelanguage\.googleapis|CLAUDE_API_KEY|GEMINI_API_KEY|SONNET_MODEL/.test(committed));
    ok(`${fn.name}: no external AI-detector hook (the desk improves the journalism, it does not chase a detector)`, !/originality\.ai|gptzero|AI_DETECTOR/i.test(committed));

    if (fn.name === 'process-scraped-article') {
      ok(`${fn.name}: carries no voice engine (a Supabase edge function may use only 2 s of computing per call; the style check runs on the website)`, !/scoreVoice|compiledTells|dataTells|assessEdition/.test(committed));
      ok(`${fn.name}: stays small (${committed.length} characters; with the engine it was 556,000)`, committed.length < 320_000);
    }
    if (fn.name === 'ai-editorial') ok(`${fn.name}: stays below ${520_000} characters (it embeds the English judge only)`, committed.length < 520_000);

    // ── the generated file loads and answers ────────────────────────────────────────────────────────────────────────────
    g.__edgeHandler = undefined;
    const code = await buildEdgeFunction({ root, name: fn.name, plugins: [urlStubs], banner: false });
    const mod = await load(`edge-${fn.name}`, code);
    ok(`${fn.name}: the generated file registers its handler with the server`, typeof g.__edgeHandler === 'function');
    eq(`${fn.name}: and exports the pieces the tests use`, EXPORTS[fn.name].every((k) => typeof mod[k] === 'function'), true);
    const denied = await g.__edgeHandler(new Request('https://f.test/', { method: 'POST', body: '{}' }));
    eq(`${fn.name}: without a token or secret the generated function answers 401`, denied.status, 401);
  }

  // ── slimming the voice data changes no verdict ──────────────────────────────────────────────────────────────────────────
  const full = await judge('judge-full', []);
  const slim = await judge('judge-slim', [slimVoiceData(root)]);
  let compared = 0; let differing = 0;
  for (const l of ['en', 'de', 'pl', 'ro', 'ru', 'el', 'ar'] as const) {
    const texts = [...FIXTURES[l].ai, ...FIXTURES[l].human, HUMAN_EDGE[l]];
    for (const t of texts) {
      const html = t.split(/\n\s*\n/).map((p: string) => `<p>${p.trim()}</p>`).join('');
      const a = full.assessEdition(html, l, { title: 'Marina fees rise', category: 'cyprus', articleType: 'news' });
      const b = slim.assessEdition(html, l, { title: 'Marina fees rise', category: 'cyprus', articleType: 'news' });
      compared++; if (JSON.stringify(a) !== JSON.stringify(b)) differing++;
    }
  }
  eq(`the slim bundle judges ${compared} fixture texts in seven languages exactly like the full one`, differing, 0);
  report('edge-build');
}
main().catch((e) => { console.error(e); process.exit(1); });
