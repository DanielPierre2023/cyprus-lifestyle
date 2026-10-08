// esbuild plugin for the tests: the Supabase edge function imports Deno's http server and supabase-js by URL; in Node they are stubs.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// When this module is itself bundled into a test, import.meta.url points at the bundle: fall back to the repository layout.
const guess = dirname(fileURLToPath(import.meta.url));
const here = existsSync(join(guess, 'deno-serve.js')) ? guess : join(process.cwd(), 'scripts', 'tests', '_stubs');
const MAP = {
  'https://deno.land/std@0.168.0/http/server.ts': join(here, 'deno-serve.js'),
  'https://esm.sh/@supabase/supabase-js@2': join(here, 'supabase-js-esm.js'),
};
export const urlStubs = {
  name: 'url-stubs',
  setup(b) {
    b.onResolve({ filter: /^https:\/\// }, (args) => (MAP[args.path] ? { path: MAP[args.path] } : { errors: [{ text: `no test stub for ${args.path}` }] }));
  },
};
