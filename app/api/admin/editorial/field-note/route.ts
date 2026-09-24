// POST /api/admin/editorial/field-note   (admin session-gated)
// Log an editor's VISIT / INTERVIEW / STORY and, optionally, have the AI editor
// redact a high-level journalistic piece from the notes on the spot.
// Body: { kind, subjectListingId?, subjectName?, place?, visitedOn?, rating?, notes,
//         quotes?, media?[], sectionKey?, subcategoryKey?, franchise?, autoDraft? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/util';
import { subjectFromListing } from '@/lib/editorial/gate';
import { suggestCommission, isFranchise, mdToHtml, type PieceKind, type PipelineSubject } from '@/lib/editorial/pipeline';
import { draftPiece } from '@/lib/editorial/generate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const KIND_TO_PIECE: Record<string, PieceKind> = { visit: 'feature', interview: 'interview', story: 'profile' };

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).trim() : '');

  const kind = ['visit', 'interview', 'story'].includes(s('kind')) ? s('kind') : 'visit';
  const notes = s('notes');
  if (!notes) return NextResponse.json({ ok: false, error: 'Field notes (what you saw / tasted / heard) are required.' }, { status: 400 });
  const subjectListingId = s('subjectListingId') || null;
  const media = Array.isArray(b.media) ? (b.media as unknown[]).map(String).filter(Boolean) : [];
  const ratingNum = Number(b.rating);
  const rating = Number.isFinite(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? Math.round(ratingNum) : null;

  const sb = supabaseAdmin();
  const { data: note, error } = await sb.from('editorial_field_notes').insert({
    kind,
    subject_listing_id: subjectListingId,
    subject_name: s('subjectName') || null,
    place: s('place') || null,
    visited_on: s('visitedOn') || null,
    rating,
    notes,
    quotes: s('quotes') || null,
    media,
    author: s('author') || 'Editor',
    status: 'captured',
  }).select('id').single();
  if (error) return NextResponse.json({ ok: false, error: `Could not save the field note: ${error.message}` }, { status: 500 });
  const noteId = (note as { id: string }).id;

  if (b.autoDraft !== true) {
    return NextResponse.json({ ok: true, id: noteId, drafted: false, note: 'Field note saved.' });
  }

  // Auto-draft: the AI editor turns the notes into a house-voice article.
  let subject: PipelineSubject | null = null;
  if (subjectListingId) {
    const { data } = await sb.from('directory_listings').select('*').eq('id', subjectListingId).maybeSingle();
    subject = subjectFromListing(data as Record<string, unknown> | null);
  }
  if (!subject) subject = { name: s('subjectName') || s('place') || 'A Cyprus subject', category: null, district: null, summary: null, website: null, tags: null };

  const wantFranchise = s('franchise');
  const suggestion = suggestCommission({ subjectName: subject.name, category: subject.category, district: subject.district, franchise: wantFranchise || null });
  const franchise = wantFranchise && isFranchise(wantFranchise) ? wantFranchise : suggestion.franchise;
  const pieceKind = KIND_TO_PIECE[kind];
  const material = [`FIELD NOTES (${kind}):`, notes, s('quotes') ? `\nQUOTES:\n${s('quotes')}` : ''].filter(Boolean).join('\n');

  try {
    const d = await draftPiece({ kind: pieceKind, franchise, notes: material, subject });
    if (!d.bodyMd) return NextResponse.json({ ok: true, id: noteId, drafted: false, error: d.error || 'Draft came back empty.', note: 'Field note saved; drafting failed — try again from the note.' });
    const title = d.title || subject.name;
    const slug = uniqueSlug(title);
    const { data: created, error: cErr } = await sb.from('blog_posts').insert({
      slug, kind: pieceKind, franchise, angle: suggestion.angle, source_lang: 'en',
      pipeline_status: 'editing', status: 'draft', subject_listing_id: subjectListingId,
      category: s('sectionKey') || null, subcategory: s('subcategoryKey') || null,
      author_name: s('author') || 'The Cyprus Lifestyle Desk',
      title_en: title, content_en: mdToHtml(d.bodyMd), word_count: d.bodyMd.split(/\s+/).filter(Boolean).length,
    }).select('id, slug').single();
    if (cErr) return NextResponse.json({ ok: true, id: noteId, drafted: false, error: cErr.message });
    const blogId = (created as { id: string }).id;
    await sb.from('editorial_field_notes').update({ status: 'drafted', blog_post_id: blogId }).eq('id', noteId);
    return NextResponse.json({ ok: true, id: noteId, drafted: true, blogPostId: blogId, slug, note: 'Field note saved and drafted — the piece is now in Editing.' });
  } catch (e) {
    return NextResponse.json({ ok: true, id: noteId, drafted: false, error: (e as Error).message, note: 'Field note saved; drafting errored.' });
  }
}
