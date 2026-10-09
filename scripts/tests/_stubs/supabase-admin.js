// Test stub: a no-op Supabase admin client. Pure-logic tests never hit the DB;
// this exists only so modules that import supabaseAdmin can be bundled & loaded.
const builder = () => {
  const b = {
    select: () => b, insert: async () => ({ data: null, error: null }),
    update: () => b, delete: () => b, upsert: async () => ({ data: null, error: null }),
    eq: () => b, gte: () => b, lte: () => b, ilike: () => b, or: () => b,
    order: () => b, limit: () => b, maybeSingle: async () => ({ data: null, error: null }),
    then: (r) => r({ data: [], error: null }),
  };
  return b;
};
// A test that needs to see what was written can set globalThis.__testSupabase = () => client; every other test gets the no-op client.
export const supabaseAdmin = () => (globalThis.__testSupabase ? globalThis.__testSupabase() : { from: () => builder(), rpc: async () => ({ data: null, error: null }) });
