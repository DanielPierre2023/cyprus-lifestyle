// lib/journalism/hash.ts — a cheap stable string hash shared by the prompt builders. Pure, no imports.

/** Cheap stable hash (FNV-1a with a final mix, base 36): same input, same output, in the app and in the edge function. */
export function stableHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return (h >>> 0).toString(36);
}
