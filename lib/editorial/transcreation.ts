// lib/editorial/transcreation.ts
// ============================================================================
// Which franchises are RE-REPORTED into the other six editions as a native staff
// writer (transcreation, Sonnet) rather than faithfully translated (Haiku).
//
// We roll transcreation out franchise by franchise. It starts with the long-form
// INTERVIEW franchise, where native rhythm matters most and the piece count is
// low — so the extra model cost is contained while we compare it head-to-head
// against the humanised translation (see the /api/editorial/translate `?compare=1`
// mode). Add more keys here to widen the rollout.
//
// Pure (no I/O) so it is unit-tested and shared by the translate route.
// ============================================================================

// Franchise keys (see lib/editorial/pipeline.ts FRANCHISES) that default to
// transcreation. 'tastemakers' is the long-form profile interview.
export const TRANSCREATE_FRANCHISES: ReadonlySet<string> = new Set<string>([
  'tastemakers',
]);

/** Parse the `?transcreate=` override: '1' → force on, '0' → force off, else null. */
export function parseTranscreateFlag(v: string | null | undefined): boolean | null {
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return null;
}

/**
 * Decide whether a piece should be transcreated.
 * An explicit override (from the query flag) always wins; otherwise the piece's
 * franchise decides.
 */
export function shouldTranscreate(franchise: string | null | undefined, explicit: boolean | null): boolean {
  if (explicit === true || explicit === false) return explicit;
  return TRANSCREATE_FRANCHISES.has(String(franchise || ''));
}
