// POST /api/editorial/dossier?id=<pieceId>&key=<ENRICH_SECRET>
// Generate the interview dossier (briefing + tailored questions) for a commissioned
// piece, grounded in its subject listing and the knowledge base. Persists dossier +
// questions and advances pipeline_status to 'dossier'. Key-gated like the concierge routes.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { denyReason, subjectFromListing } from '@/lib/editorial/gate';
import { generateDossier } from '@/lib/editorial/generate';
import type { PipelineSubject } from '@/lib/editorial/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest): Promise<Record<string, unknown>> {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return { ok: false, error: 'Missing ?id= (the piece id from commission).' };
  const sb = supabaseAdmin();

  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: `Could not load the piece: ${error.message}` };
  if (!piece) return { ok: false, error: 'No piece with that id.' };
  const p = piece as Record<string, unknown>;

  // Build the subject: from the linked directory listing if any, else from the piece itself.
  const sourceLang = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  let subject: PipelineSubject | null = null;
  if (p.subject_listing_id) {
    const { data: listing } = await sb.from('directory_listings').select('*').eq('id', p.subject_listing_id).maybeSingle();
    subject = subjectFromListing(listing as Record<string, unknown> | null);
  }
  if (!subject) {
    const title = (p[`title_${sourceLang}`] as string) || (p.title_en as string) || '';
    if (!title) return { ok: false, error: 'The piece has no subject listing and no working title to brief from.' };
    subject = { name: title, summary: (p.angle as string) || null };
  }

  const res = await generateDossier(subject);
  if (res.error) return { ok: false, error: res.error };

  const { error: ue } = await sb.from('blog_posts').update({
    dossier: { briefing: res.briefing, subject, generated_at: new Date().toISOString() },
    questions: res.questions,
    pipeline_status: 'dossier',
  }).eq('id', id);
  if (ue) return { ok: false, error: `Generated the dossier but could not save it: ${ue.message}` };

  return {
    ok: true,
    id,
    subject: subject.name,
    questions: res.questions.length,
    pipeline_status: 'dossier',
    note: `Dossier ready with ${res.questions.length} questions. Next: POST /api/editorial/draft?id=${id}`,
  };
}

export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
