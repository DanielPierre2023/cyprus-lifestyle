// Stand-in for https://esm.sh/@supabase/supabase-js in the tests: the test installs globalThis.__fakeSupabase(url, key, options).
export function createClient(url, key, options) {
  if (typeof globalThis.__fakeSupabase !== 'function') throw new Error('no fake Supabase installed');
  return globalThis.__fakeSupabase(url, key, options);
}
