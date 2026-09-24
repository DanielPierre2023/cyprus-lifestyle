// POST /api/admin/editorial/idea   (admin session-gated — no secret in the browser)
// Body: { id, action: 'approve'|'reject'|'assign', reason?, assignedTo? }
//   approve → create a pipeline piece (blog_posts, commissioned) from the idea and link
//             it. When autonomy is 'auto-draft', the writing is handed to the dedicated
//             /api/editorial/draft route IN THE BACKGROUND (via after()), so this request
//             returns fast and the full Sonnet draft runs in its own 60s function instead
//             of timing out inline.
//   reject  → mark the idea rejected (with an optional reason).
//   assign  → set assigned_to and mark it assigned.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/util';
import { suggestCommission, isFranchise, getFranchise } from '@/lib/editorial/pipeline';
import { getEditorialSettings } from '@/lib/editorial/settings';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Idea {
  id: string; section_key: string | null; subcategory_key: string | null;
  working_title: string; angle: string | null; subject_listing_id: string | null;
  research_brief: Record<string, unknown> | null; status: string; blog_post_id: string | null;
}

function briefingFrom(idea: Idea): string {
  const b = idea.research_brief || {};
  const parts: string[] = [];
  if (idea.angle) parts.push(`Angle: ${idea.angle}`);
  if (typeof b.subjectHint === 'string' && b.subjectHint) parts.push(`Subject: ${b.subjectHint}`);
  if (Array.isArray(b.outline) && b.outline.length) parts.push(`Outline:\n- ${(b.outline as string[]).join('\n- ')}`);
  if (Array.isArray(b.verify) && b.verify.length) parts.push(`Must verify (do not assert unverified):\n- ${(b.verify as string[]).join('\n- ')}`);
  return parts.join('\n\n');
}

async function approve(idea: Idea): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const settings = await getEditorialSettings();

  const brief = idea.research_brief || {};
  const wantFranchise = typeof brief.franchise === 'string' ? brief.franchise : null;
  const suggestion = suggestCommission({
    subjectName: idea.working_title,
    category: idea.subcategory_key,
    district: null,
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
    // Carry the planner's brief onto the piece so the draft step is grounded on it.
    dossier: { briefing: briefingFrom(idea) },
  }).select('id, slug').single();
  if (error) return { ok: false, error: `Could not create the piece: ${error.message}` };
  const blogId = (created as { id: string }).id;

  const autoDraft = settings.autonomy === 'auto-draft';
  await sb.from('editorial_ideas').update({
    status: autoDraft ? 'drafting' : 'approved', blog_post_id: blogId, assigned_to: 'ai',
  }).eq('id', idea.id);

  // When auto-draft is on, the COCKPIT calls /api/admin/editorial/draft next (a second
  // request with its own 60s budget). We just report the id + flag here so approve stays fast.
  return {
    ok: true, action: 'approve', blogPostId: blogId, slug,
    franchise, franchiseName: getFranchise(franchise)?.name ?? franchise,
    autoDraft,
    note: autoDraft ? 'Approved and commissioned. Drafting…' : 'Approved and commissioned. Draft it from the pipeline.',
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
