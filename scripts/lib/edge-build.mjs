// scripts/lib/edge-build.mjs — bundles the sources in scripts/edge/*.src.ts into the text of the edge functions.
// The command line is scripts/build-edge-journalism.mjs; the tests (scripts/tests/edge-build.test.ts) call buildEdgeFunction directly.
import { build } from 'esbuild';
import { join } from 'node:path';

/** The generated edge functions: what each is built from, where it goes and what its banner says about secrets. */
export const FUNCTIONS = [
  {
    name: 'process-scraped-article',
    src: 'scripts/edge/process-scraped-article.src.ts',
    out: 'supabase/functions/process-scraped-article/index.ts',
    secrets: 'OPENAI_API_KEY (required), UNSPLASH_ACCESS_KEY (cover pictures, optional).',
  },
  {
    name: 'ai-editorial',
    src: 'scripts/edge/ai-editorial.src.ts',
    out: 'supabase/functions/ai-editorial/index.ts',
    secrets: 'OPENAI_API_KEY (required).',
  },
];
export const SRC = FUNCTIONS[0].src;
export const OUT = FUNCTIONS[0].out;
const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

/** Keeps only what lib/voice/tells.ts and structure.ts read from a language's voice data; one detector per line. */
/** @param {string} root */
export function slimVoiceData(root) {
  return {
    name: 'slim-voice-data',
    setup(b) {
      b.onLoad({ filter: new RegExp(`[\\\\/]lib[\\\\/]voice[\\\\/]data[\\\\/](?:${LANGS.join('|')})\\.ts$`) }, async (args) => {
        const r = await build({ entryPoints: [args.path], bundle: true, write: false, format: 'cjs', platform: 'node', tsconfig: join(root, 'tsconfig.json'), logLevel: 'silent' });
        const m = { exports: {} };
        new Function('module', 'exports', r.outputFiles[0].text)(m, m.exports);
        const d = m.exports.default || m.exports;
        const lines = (d.tells || []).map((t) => `    ${JSON.stringify(t)}`).join(',\n');
        const contents = `export default {\n  lang: ${JSON.stringify(d.lang)},\n  tells: [\n${lines}\n  ],\n  banned: [], sheet: [], pairs: [], desks: {},\n  closers: ${JSON.stringify(d.closers || [])},\n  openers: ${JSON.stringify(d.openers || [])},\n};\n`;
        return { contents, loader: 'js' };
      });
    },
  };
}

/**
 * Bundles one source into the text of its edge function. `plugins` lets the tests replace the two URL imports with stubs.
 * @param {{ root: string, plugins?: any[], banner?: boolean, name?: string }} o
 * @returns {Promise<string>}
 */
export async function buildEdgeFunction({ root, plugins = [], banner = true, name = FUNCTIONS[0].name }) {
  const fn = FUNCTIONS.find((f) => f.name === name);
  if (!fn) throw new Error(`unknown edge function "${name}"`);
  const r = await build({
    entryPoints: [join(root, fn.src)], bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2022',
    mainFields: ['module', 'main'], tsconfig: join(root, 'tsconfig.json'), charset: 'utf8', legalComments: 'none',
    external: plugins.length ? [] : ['https://*'], plugins: [slimVoiceData(root), ...plugins], logLevel: 'silent',
  });
  const code = r.outputFiles[0].text;
  if (!banner) return code;
  return `// @ts-nocheck
// ${fn.out}
//
// GENERATED FILE. Do not edit it by hand: it is built from ${fn.src} and the shared modules in
// lib/journalism and lib/voice by \`node scripts/build-edge-journalism.mjs\` (a test fails when this file is out of date).
// To change what the function does, change the source and rebuild. To deploy: paste this whole file into the function in the Supabase
// dashboard (or \`supabase functions deploy ${fn.name}\`).
//
// What it does: see the header of the source. Secrets: ${fn.secrets}
${code}`;
}

