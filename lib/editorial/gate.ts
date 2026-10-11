// lib/editorial/gate.ts
// ============================================================================
// Shared helpers for the key-gated editorial pipeline routes.
//   • denyReason — the shared ENRICH_SECRET key-gate (lib/auth/keyGate.ts) used by the
//     concierge enrichment routes and the pipeline jobs, so they all authorise the same way.
//   • subjectFromListing — pure mapper from a directory_listings row to the
//     PipelineSubject the generate layer grounds on.
// ============================================================================
import type { NextRequest } from 'next/server';
import type { PipelineSubject } from '@/lib/editorial/pipeline';
import { keyGateDeny } from '@/lib/auth/keyGate';

// Shared key-gate (see lib/auth/keyGate.ts): ENRICH_SECRET via header / Bearer / legacy
// ?key=, or a signed-in admin session. Async — callers must `await` it.
export async function denyReason(req: NextRequest): Promise<string | null> {
  return keyGateDeny(req);
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
