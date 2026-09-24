// POST /api/admin/editorial/idea   (admin session-gated — no secret in the browser)
// Body: { id, action: 'approve'|'reject'|'assign', reason?, assignedTo? }
//   approve → create a pipeline piece (blog_posts, commissioned) from the idea, link
//             it, and — when the autonomy setting is 'auto-draft' — write the first
//             draft in-house (AI editor) and move it to 'editing'.
//   reject  → mark the idea rejected (with an optional reason).
//   assign  → set assigned_to and mark it assigned.
// This is how the Idea Board acts on the planner's suggestions.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/util';
import { subjectFromListing } from '@/lib/editorial/gate';
import { suggestCommission, isFranchise, getFranchise, mdToHtml, type PipelineSubject } from '@/lib/editorial/pipeline';
import { draftPiece } from '@/lib/editorial/generate';
import { getEditorialSettings } from '@/lib/editorial/settings';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Idea {
  id: string; section_key: string | null; subcategory_key: string | null;
  working_title: string; angle: string | null; subject_listing_id: string | null;
  research_brief: Record<string, unknown> | null; status: string; blog_post_id: string | null;
}

function briefToNotes(brief: Record<string, unknown> | null, angle: string | null): string {
  if (!brief) return angle ? `Angle: ${angle}` : '';
  const parts: string[] = [];
  if (angle) parts.push(`Angle: ${angle}`);
  if (typeof brief.subjectHint === 'string' && brief.subjectHint) parts.push(`Subject: ${brief.subjectHint}`);
  if (Array.isArray(brief.outline) && brief.outline.length) parts.push(`Outline:\n- ${(brief.outline as string[]).join('\n- ')}`);
  if (Array.isArray(brief.verify) && brief.verify.length) parts.push(`Must verify (do not assert unverified):\n- ${(brief.verify as string[]).join('\n- ')}`);
  return parts.join('\n\n');
}

async function approve(idea: Idea): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const settings = await getEditorialSettings();

  // Ground on the subject listing where the planner named one.
  let subject: PipelineSubject | null = null;
  if (idea.subject_listing_id) {
    const { data } = await sb.from('directory_listings').select('*').eq('id', idea.subject_listing_id).maybeSingle();
    subject = subjectFromListing(data as Record<string, unknown> | null);
  }
  const brief = idea.research_brief || {};
  const wantFranchise = typeof brief.franchise === 'string' ? brief.franchise : null;
  const suggestion = suggestCommission({
    subjectName: subject?.name ?? idea.working_title,
    category: subject?.category ?? idea.subcategory_key,
    district: subject?.district ?? null,
    franchise: wantFranchise,
  });
  const franchise = wantFranchise && isFranchise(wantFranchise) ? wantFranchise : suggestion.franchise;
  const title = idea.working_title;
  const slug = uniqueSlug(title);

  const { data: created, error } = await sb.from('blog_posts').insert({
    slug,
    kind: suggestion.kind,
    franchise,
    angle: idea.angle || suggestion.angle,
    source_lang: 'en',
    pipeline_status: 'commissioned',
    status: 'draft',
    subject_listing_id: idea.subject_listing_id,
    category: idea.section_key,
    subcategory: idea.subcategory_key,
    author_name: 'The Cyprus Lifestyle Desk',
    title_en: title,
  }).select('id, slug').single();
  if (error) return { ok: false, error: `Could not create the piece: ${error.message}` };
  const blogId = (created as { id: string }).id;

  await sb.from('editorial_ideas').update({ status: 'approved', blog_post_id: blogId, assigned_to: 'ai' }).eq('id', idea.id);

  // Auto-draft when autonomy is switched on: the AI editor writes the first version.
  let drafted = false;
  if (settings.autonomy === 'auto-draft') {
    try {
      const d = await draftPiece({
        kind: suggestion.kind,
        franchise,
        notes: briefToNotes(brief, idea.angle),
        subject: subject ?? { name: title, category: idea.subcategory_key, district: null, summary: null, website: null, tags: null },
      });
      if (d.bodyMd) {
        const html = mdToHtml(d.bodyMd);
        await sb.from('blog_posts').update({
          title_en: d.title || title,
          content_en: html,
          pipeline_status: 'editing',
          word_count: d.bodyMd.split(/\s+/).filter(Boolean).length,
        }).eq('id', blogId);
        await sb.from('editorial_ideas').update({ status: 'drafting' }).eq('id', idea.id);
        drafted = true;
      }
    } catch { /* leave it commissioned; the /api/editorial/draft route can finish it */ }
  }

  return {
    ok: true, action: 'approve', blogPostId: blogId, slug,
    franchise, franchiseName: getFranchise(franchise)?.name ?? franchise,
    autoDrafted: drafted,
    note: drafted ? 'Approved and drafted — now in Editing.' : 'Approved and commissioned. Draft it via the pipeline (auto-draft is off, or it will run next).',
  };
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof body.id === 'string' ? body.id : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!id || !['approve', 'reject', 'assign'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Provide { id, action: approve|reject|assign }.' }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('editorial_ideas')
    .select('id, section_key, subcategory_key, working_title, angle, subject_listing_id, research_brief, status, blog_post_id')
    .eq('id', id).maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: 'Idea not found.' }, { status: 404 });
  const idea = data as Idea;

  if (action === 'reject') {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
    await sb.from('editorial_ideas').update({ status: 'rejected', rejected_reason: reason }).eq('id', id);
    return NextResponse.json({ ok: true, action: 'reject' });
  }
  if (action === 'assign') {
    const assignedTo = typeof body.assignedTo === 'string' && body.assignedTo.trim() ? body.assignedTo.trim() : 'desk';
    await sb.from('editorial_ideas').update({ status: 'assigned', assigned_to: assignedTo }).eq('id', id);
    return NextResponse.json({ ok: true, action: 'assign', assignedTo });
  }
  if (idea.status === 'approved' || idea.status === 'drafting' || idea.blog_post_id) {
    return NextResponse.json({ ok: false, error: 'This idea has already been approved.' }, { status: 409 });
  }
  return NextResponse.json(await approve(idea));
}
