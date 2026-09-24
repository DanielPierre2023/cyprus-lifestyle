// lib/editorial/gate.ts
// ============================================================================
// Shared helpers for the key-gated editorial pipeline routes.
//   • denyReason — the EXACT ENRICH_SECRET key-gate used by the concierge
//     enrichment routes (app/api/concierge/*), so all pipeline jobs authorise
//     the same way: ?key=<ENRICH_SECRET>.
//   • subjectFromListing — pure mapper from a directory_listings row to the
//     PipelineSubject the generate layer grounds on.
// ============================================================================
import type { NextRequest } from 'next/server';
import type { PipelineSubject } from '@/lib/editorial/pipeline';

// A clear reason instead of a bare "unauthorized", so the cause is obvious.
export function denyReason(req: NextRequest): string | null {
  if (!process.env.ENRICH_SECRET) {
    return 'ENRICH_SECRET is not set on the server. Add it in Vercel → Settings → Environment Variables, redeploy, then call this URL with ?key=<that same value>.';
  }
  if ((req.nextUrl.searchParams.get('key') || '') !== process.env.ENRICH_SECRET) {
    return 'Unauthorized — the ?key= value does not match ENRICH_SECRET set on the server.';
  }
  return null;
}

// Pure: build the subject the pipeline reasons about from a directory listing row.
// Tolerant of the columns actually present (the directory has grown many over time).
export function subjectFromListing(row: Record<string, unknown> | null | undefined): PipelineSubject | null {
  if (!row) return null;
  const s = (k: string) => (row[k] == null ? '' : String(row[k]).trim());
  const name = s('name_en') || s('name_el') || s('name_ro') || s('slug');
  if (!name) return null;
  const category = s('canonical_category') || s('category_group') || s('subtype') || s('type') || null;
  const summary = s('source_description') || s('summary_en') || s('summary_el') || null;
  const tags = Array.isArray(row.tags) ? (row.tags as unknown[]).map(String).filter(Boolean) : null;
  return {
    name,
    category,
    district: s('district') || null,
    summary,
    website: s('url') || null,
    tags: tags && tags.length ? tags : null,
  };
}
