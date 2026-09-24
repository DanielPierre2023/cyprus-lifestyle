// POST /api/admin/editorial/field-note   (admin session-gated)
// Log an editor's VISIT / INTERVIEW / STORY and, optionally, have the AI editor redact
// a house-voice piece from the notes. Drafting is handed to the dedicated
// /api/editorial/draft route IN THE BACKGROUND (via after()) so this request returns
// fast and the full Sonnet draft runs in its own 60s function.
// Body: { kind, subjectListingId?, subjectName?, place?, visitedOn?, rating?, notes,
//         quotes?, media?[], sectionKey?, subcategoryKey?, franchise?, author?, autoDraft? }
import { NextRequest, NextResponse, after } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/util';
import { suggestCommission, isFranchise, type PieceKind } from '@/lib/editorial/pipeline';

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
  const author = s('author') || 'Editor';

  const sb = supabaseAdmin();
  const { data: note, error } = await sb.from('editorial_field_notes').insert({
    kind, subject_listing_id: subjectListingId, subject_name: s('subjectName') || null,
    place: s('place') || null, visited_on: s('visitedOn') || null, rating,
    notes, quotes: s('quotes') || null, media, author, status: 'captured',
  }).select('id').single();
  if (error) return NextResponse.json({ ok: false, error: `Could not save the field note: ${error.message}` }, { status: 500 });
  const noteId = (note as { id: string }).id;

  if (b.autoDraft !== true) {
    return NextResponse.json({ ok: true, id: noteId, queuedDraft: false, note: 'Field note saved.' });
  }

  // Commission a piece from the note and hand the draft to the background draft route,
  // passing the field notes as the grounding material.
  const wantFranchise = s('franchise');
  const suggestion = suggestCommission({
    subjectName: s('subjectName') || s('place') || null,
    category: s('subcategoryKey') || s('sectionKey') || null,
    franchise: wantFranchise || null,
  });
  const franchise = wantFranchise && isFranchise(wantFranchise) ? wantFranchise : suggestion.franchise;
  const pieceKind = KIND_TO_PIECE[kind];
  const title = s('subjectName') || s('place') || 'A Cyprus dispatch';
  const slug = uniqueSlug(title);
  const material = [`FIELD NOTES (${kind}) by ${author}:`, notes, s('quotes') ? `\nQUOTES (verbatim):\n${s('quotes')}` : ''].filter(Boolean).join('\n');

  const { data: created, error: cErr } = await sb.from('blog_posts').insert({
    slug, kind: pieceKind, franchise, angle: suggestion.angle, source_lang: 'en',
    pipeline_status: 'commissioned', status: 'draft', subject_listing_id: subjectListingId,
    category: s('sectionKey') || null, subcategory: s('subcategoryKey') || null,
    author_name: author, title_en: title,
  }).select('id, slug').single();
  if (cErr) return NextResponse.json({ ok: true, id: noteId, queuedDraft: false, error: `Note saved, but could not commission a piece: ${cErr.message}` });
  const blogId = (created as { id: string }).id;
  await sb.from('editorial_field_notes').update({ status: 'drafting', blog_post_id: blogId }).eq('id', noteId);

  const key = process.env.ENRICH_SECRET || '';
  if (key) {
    const origin = req.nextUrl.origin;
    after(async () => {
      try {
        await fetch(`${origin}/api/editorial/draft?key=${encodeURIComponent(key)}&id=${blogId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: material }),
        });
      } catch { /* the draft route runs as an independent invocation; best effort */ }
    });
  }

  return NextResponse.json({
    ok: true, id: noteId, blogPostId: blogId, slug, queuedDraft: !!key,
    note: key
      ? 'Field note saved. The AI editor is drafting it in the background — it will appear in the pipeline (Editing) shortly.'
      : 'Field note saved and a piece commissioned. Set ENRICH_SECRET to enable background drafting.',
  });
}
