import { supabaseServer } from '@/lib/supabase/server';
import { getSection } from '@/lib/editorial/taxonomy';
import { getFranchise } from '@/lib/editorial/pipeline';
import IdeaActions from '@/components/admin/IdeaActions';

export const dynamic = 'force-dynamic';

// The Idea Board — the planner's suggestions to triage. Approve (which commissions,
// and auto-drafts when autonomy is on) or reject, each with its rationale, research
// brief, redundancy status and suggested subject.

type Idea = {
  id: string; section_key: string | null; subcategory_key: string | null;
  working_title: string; angle: string | null; rationale: string | null;
  status: string; source: string; target_month: string | null;
  subject_listing_id: string | null; research_brief: Record<string, unknown> | null;
  signals: Record<string, unknown> | null; assigned_to: string | null; created_at: string;
};

const NEEDS_LABEL: Record<string, string> = { desk: 'Desk', visit: 'Needs a visit', interview: 'Needs an interview' };

export default async function IdeaBoardTab() {
  const sb = await supabaseServer();
  const { data } = await sb.from('editorial_ideas')
    .select('id, section_key, subcategory_key, working_title, angle, rationale, status, source, target_month, subject_listing_id, research_brief, signals, assigned_to, created_at')
    .in('status', ['suggested', 'approved', 'assigned', 'drafting'])
    .order('created_at', { ascending: false })
    .limit(200);
  const ideas = (data as Idea[] | null) || [];

  const subjectIds = Array.from(new Set(ideas.map((i) => i.subject_listing_id).filter(Boolean))) as string[];
  const subjectName = new Map<string, string>();
  if (subjectIds.length) {
    const { data: subs } = await sb.from('directory_listings').select('id, name_en, slug').in('id', subjectIds);
    for (const s of (subs as { id: string; name_en: string | null; slug: string }[] | null) || []) subjectName.set(s.id, s.name_en || s.slug);
  }

  const suggested = ideas.filter((i) => i.status === 'suggested');
  const inProgress = ideas.filter((i) => i.status !== 'suggested');

  const sectionPath = (i: Idea) => {
    const dep = i.section_key ? getSection(i.section_key)?.name : null;
    const sub = i.subcategory_key ? getSection(i.subcategory_key)?.name : null;
    return [dep, sub].filter(Boolean).join(' → ') || '—';
  };

  const card = (i: Idea, withActions: boolean) => {
    const b = i.research_brief || {};
    const needs = typeof b.needs === 'string' ? b.needs : 'desk';
    const outline = Array.isArray(b.outline) ? (b.outline as string[]) : [];
    const verify = Array.isArray(b.verify) ? (b.verify as string[]) : [];
    const fr = typeof b.franchise === 'string' ? b.franchise : null;
    const subj = i.subject_listing_id ? subjectName.get(i.subject_listing_id) : (typeof b.subjectHint === 'string' ? b.subjectHint : null);
    return (
      <div key={i.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, borderLeft: '3px solid #C9A24C', padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div style={{ fontFamily: 'var(--disp, Georgia, serif)', fontSize: 18, fontWeight: 600 }}>{i.working_title}</div>
          <span className="sub" style={{ margin: 0, fontSize: 11 }}>{sectionPath(i)}</span>
        </div>
        {i.angle ? <div style={{ fontSize: 14, marginTop: 6 }}>{i.angle}</div> : null}
        {i.rationale ? <div className="sub" style={{ margin: '6px 0 0', fontSize: 13 }}><b style={{ color: '#C9A24C' }}>Why now:</b> {i.rationale}</div> : null}
        <div className="sub" style={{ margin: '8px 0 0', fontSize: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>{NEEDS_LABEL[needs] || 'Desk'}</span>
          {fr ? <span>· {getFranchise(fr)?.name ?? fr}</span> : null}
          {typeof b.wordTarget === 'number' ? <span>· ~{b.wordTarget} words</span> : null}
          {subj ? <span style={{ color: '#C9A24C' }}>· ↳ {subj}</span> : null}
          {i.source === 'ai-planner' ? <span>· planner</span> : <span>· {i.source}</span>}
        </div>
        {outline.length ? <div className="sub" style={{ margin: '8px 0 0', fontSize: 12.5 }}><b>Outline:</b> {outline.join(' · ')}</div> : null}
        {verify.length ? <div className="sub" style={{ margin: '4px 0 0', fontSize: 12.5, color: '#b3654f' }}><b>Verify:</b> {verify.join(' · ')}</div> : null}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          {withActions ? <IdeaActions id={i.id} /> : <span className="sub" style={{ margin: 0, fontSize: 12, textTransform: 'capitalize' }}>{i.status}{i.assigned_to ? ` · ${i.assigned_to}` : ''}</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      <h1>Idea board</h1>
      <p className="sub">The planner&apos;s suggestions, awaiting your call. Approve to commission (and auto-draft, if that&apos;s switched on in the <a href="/admin/editorial-plan" style={{ color: '#C9A24C' }}>plan</a>), or reject. Approved pieces move to the <a href="/admin/editorial-pipeline" style={{ color: '#C9A24C' }}>pipeline</a>.</p>

      <div className="cards">
        <div className="stat"><div className="n" style={{ color: '#C9A24C' }}>{suggested.length}</div><div className="k">Awaiting approval</div></div>
        <div className="stat"><div className="n">{inProgress.length}</div><div className="k">In progress</div></div>
      </div>

      <h1 style={{ fontSize: 18, marginTop: 14 }}>Awaiting your approval</h1>
      {suggested.length ? suggested.map((i) => card(i, true)) : <p className="sub">Nothing pending. Run the planner from the Editorial plan tab to generate ideas.</p>}

      {inProgress.length ? (
        <>
          <h1 style={{ fontSize: 18, marginTop: 18 }}>In progress</h1>
          {inProgress.map((i) => card(i, false))}
        </>
      ) : null}
    </>
  );
}
