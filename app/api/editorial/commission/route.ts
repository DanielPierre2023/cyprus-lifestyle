// POST /api/editorial/commission?key=<ENRICH_SECRET>
// Open a new pipeline piece. Body (JSON, all optional):
//   { subjectListingId?, franchise?, kind?, angle?, workingTitle?, sourceLang? }
// If a subjectListingId is given, the subject is read from the directory and the
// commissioning suggester (pure) proposes the franchise/kind/angle/title; anything
// you pass in the body overrides the suggestion. Creates a blog_posts row in
// pipeline_status 'commissioned' with status 'draft' (invisible to the public until
// publish). Key-gated exactly like the concierge enrichment routes.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/util';
import { denyReason, subjectFromListing } from '@/lib/editorial/gate';
import {
  suggestCommission, isFranchise, isPieceKind, isLocale, getFranchise,
  type PipelineSubject,
} from '@/lib/editorial/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* empty body is fine */ }

  const subjectListingId = typeof body.subjectListingId === 'string' ? body.subjectListingId : null;

  // Ground the suggestion on the directory subject, if one was named.
  let subject: PipelineSubject | null = null;
  if (subjectListingId) {
    const { data, error } = await sb.from('directory_listings').select('*').eq('id', subjectListingId).maybeSingle();
    if (error) return { ok: false, error: `Could not load subject listing: ${error.message}` };
    if (!data) return { ok: false, error: 'subjectListingId does not match any directory listing.' };
    subject = subjectFromListing(data as Record<string, unknown>);
  }

  const suggestion = suggestCommission({
    subjectName: subject?.name ?? (typeof body.subjectName === 'string' ? body.subjectName : null),
    category: subject?.category ?? null,
    district: subject?.district ?? null,
    franchise: typeof body.franchise === 'string' ? body.franchise : null,
  });

  // Body overrides the suggestion, but only with valid values.
  const franchise = typeof body.franchise === 'string' && isFranchise(body.franchise) ? body.franchise : suggestion.franchise;
  const kind = typeof body.kind === 'string' && isPieceKind(body.kind) ? body.kind : suggestion.kind;
  const angle = typeof body.angle === 'string' && body.angle.trim() ? body.angle.trim() : suggestion.angle;
  const workingTitle = typeof body.workingTitle === 'string' && body.workingTitle.trim() ? body.workingTitle.trim() : suggestion.workingTitle;
  const sourceLang = typeof body.sourceLang === 'string' && isLocale(body.sourceLang) ? body.sourceLang : 'en';

  const slug = uniqueSlug(workingTitle);
  const insert: Record<string, unknown> = {
    slug,
    kind,
    franchise,
    angle,
    source_lang: sourceLang,
    pipeline_status: 'commissioned',
    status: 'draft',
    subject_listing_id: subjectListingId,
    author_name: 'The Cyprus Lifestyle Desk',
    [`title_${sourceLang}`]: workingTitle,
  };

  const { data, error } = await sb.from('blog_posts').insert(insert).select('id, slug').single();
  if (error) return { ok: false, error: `Could not create the piece: ${error.message}` };

  return {
    ok: true,
    id: (data as { id: string }).id,
    slug: (data as { slug: string }).slug,
    franchise,
    franchiseName: getFranchise(franchise)?.name ?? franchise,
    kind,
    angle,
    workingTitle,
    sourceLang,
    pipeline_status: 'commissioned',
    note: 'Piece commissioned. Next: POST /api/editorial/dossier?id=' + (data as { id: string }).id,
  };
}

export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
