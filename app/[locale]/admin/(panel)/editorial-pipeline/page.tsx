import { supabaseServer } from '@/lib/supabase/server';
import {
  FRANCHISES, PIPELINE_STATUSES, getFranchise,
  type PipelineStatus,
} from '@/lib/editorial/pipeline';
import CoverActions from '@/components/admin/CoverActions';
import PackageActions from '@/components/admin/PackageActions';

export const dynamic = 'force-dynamic';

// The editorial pipeline board — every commissioned piece, grouped by its workflow
// stage — plus the interview queue (interview pieces still to be researched/written).
// Read-only overview at the magazine's standard; the pipeline itself is driven by the
// key-gated routes under /api/editorial/*. Matches the Coverage tab's visual language.

type Piece = {
  id: string; slug: string;
  kind: string | null; franchise: string | null; pipeline_status: string | null;
  angle: string | null; subject_listing_id: string | null;
  questions: unknown; scheduled_at: string | null; source_lang: string | null;
  updated_at: string | null; title_en: string | null; title_el: string | null;
  cover_image: string | null; seo_title_en: string | null; excerpt_en: string | null;
};

// Human labels + the gold-scale accent used across the admin.
const STATUS_LABEL: Record<PipelineStatus, string> = {
  commissioned: 'Commissioned', dossier: 'Dossier', drafting: 'Drafting', editing: 'Editing',
  translating: 'Translating', scheduled: 'Scheduled', published: 'Published',
};
const STATUS_ACCENT: Record<PipelineStatus, string> = {
  commissioned: '#8a8a8a', dossier: '#b8860b', drafting: '#C9A24C', editing: '#C9A24C',
  translating: '#4a86c9', scheduled: '#1f7a3f', published: '#1f7a3f',
};

const qCount = (q: unknown): number => (Array.isArray(q) ? q.length : 0);
const pieceTitle = (p: Piece): string => p.title_en || p.title_el || p.slug;

export default async function EditorialPipelineTab() {
  const sb = await supabaseServer();

  const { data } = await sb.from('blog_posts')
    .select('id, slug, kind, franchise, pipeline_status, angle, subject_listing_id, questions, scheduled_at, source_lang, updated_at, title_en, title_el, cover_image, seo_title_en, excerpt_en')
    .not('pipeline_status', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(400);
  const pieces = (data as Piece[] | null) || [];

  // Resolve the subject business names for display.
  const subjectIds = Array.from(new Set(pieces.map((p) => p.subject_listing_id).filter(Boolean))) as string[];
  const subjectName = new Map<string, string>();
  if (subjectIds.length) {
    const { data: subs } = await sb.from('directory_listings').select('id, name_en, name_el, slug').in('id', subjectIds);
    for (const s of (subs as { id: string; name_en: string | null; name_el: string | null; slug: string }[] | null) || []) {
      subjectName.set(s.id, s.name_en || s.name_el || s.slug);
    }
  }

  // Group by workflow stage.
  const byStatus = new Map<PipelineStatus, Piece[]>();
  for (const s of PIPELINE_STATUSES) byStatus.set(s, []);
  for (const p of pieces) {
    const st = (p.pipeline_status || '') as PipelineStatus;
    if (byStatus.has(st)) byStatus.get(st)!.push(p);
  }

  // The interview queue: interview pieces not yet drafted, oldest-commissioned first.
  const queue = pieces
    .filter((p) => p.kind === 'interview' && ['commissioned', 'dossier', 'drafting'].includes(p.pipeline_status || ''))
    .sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));

  const inFlight = pieces.filter((p) => p.pipeline_status !== 'published').length;
  const published = byStatus.get('published')!.length;

  return (
    <>
      <h1>Editorial pipeline</h1>
      <p className="sub">
        Every commissioned piece, by workflow stage. The magazine runs on interviews: we commission a piece about a business, research a dossier, draft and translate it across the seven editions, then publish — and publishing elevates that business in the directory. The board is driven by the key-gated routes under <code>/api/editorial/*</code>.
      </p>

      <div className="cards">
        <div className="stat"><div className="n">{pieces.length.toLocaleString('en-US')}</div><div className="k">In the pipeline</div></div>
        <div className="stat"><div className="n" style={{ color: '#C9A24C' }}>{inFlight.toLocaleString('en-US')}</div><div className="k">In flight</div></div>
        <div className="stat"><div className="n" style={{ color: '#1f7a3f' }}>{published.toLocaleString('en-US')}</div><div className="k">Published</div></div>
        <div className="stat"><div className="n">{queue.length.toLocaleString('en-US')}</div><div className="k">Interview queue</div></div>
        <div className="stat"><div className="n">{FRANCHISES.length}</div><div className="k">Franchises</div></div>
      </div>

      {/* ── The board ─────────────────────────────────────────────────────────── */}
      <h1 style={{ fontSize: 18, marginTop: 8 }}>The board</h1>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {PIPELINE_STATUSES.map((st) => {
          const col = byStatus.get(st)!;
          return (
            <div key={st} style={{ minWidth: 230, flex: '0 0 230px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderBottom: `2px solid ${STATUS_ACCENT[st]}`, paddingBottom: 6 }}>
                <span style={{ fontWeight: 700, color: STATUS_ACCENT[st] }}>{STATUS_LABEL[st]}</span>
                <span className="sub" style={{ margin: 0 }}>{col.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.slice(0, 40).map((p) => {
                  const f = p.franchise ? getFranchise(p.franchise) : undefined;
                  const subj = p.subject_listing_id ? subjectName.get(p.subject_listing_id) : null;
                  return (
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 10px' }}>
                      {p.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover_image} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 4, display: 'block', marginBottom: 6 }} />
                      ) : null}
                      <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{pieceTitle(p)}</div>
                      <div className="sub" style={{ margin: '4px 0 0', fontSize: 11 }}>
                        {f ? f.name : (p.franchise || '—')} · {p.kind || '—'}
                        {p.source_lang ? ` · ${p.source_lang.toUpperCase()}` : ''}
                      </div>
                      {subj ? <div className="sub" style={{ margin: '2px 0 0', fontSize: 11, color: '#C9A24C' }}>↳ {subj}</div> : null}
                      {st === 'scheduled' && p.scheduled_at ? <div className="sub" style={{ margin: '2px 0 0', fontSize: 11 }}>{new Date(p.scheduled_at).toLocaleString('en-GB')}</div> : null}
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <CoverActions id={p.id} hasCover={!!p.cover_image} />
                        <PackageActions id={p.id} hasSeo={!!(p.seo_title_en || p.excerpt_en)} />
                      </div>
                    </div>
                  );
                })}
                {col.length === 0 ? <div className="sub" style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>—</div> : null}
                {col.length > 40 ? <div className="sub" style={{ margin: 0, fontSize: 11 }}>+{col.length - 40} more</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Interview queue ───────────────────────────────────────────────────── */}
      <h1 style={{ fontSize: 18 }}>Interview queue</h1>
      <p className="sub">Interview pieces commissioned but not yet drafted — the ones to research, book and write next.</p>
      <table className="adm-t">
        <thead><tr><th>Piece</th><th>Franchise</th><th>Subject business</th><th>Stage</th><th>Questions</th><th>Updated</th></tr></thead>
        <tbody>
          {queue.map((p) => {
            const f = p.franchise ? getFranchise(p.franchise) : undefined;
            const subj = p.subject_listing_id ? subjectName.get(p.subject_listing_id) : null;
            return (
              <tr key={p.id}>
                <td>{pieceTitle(p)}</td>
                <td>{f ? f.name : (p.franchise || '—')}</td>
                <td>{subj || <span className="sub" style={{ margin: 0 }}>—</span>}</td>
                <td><span style={{ color: STATUS_ACCENT[(p.pipeline_status || 'commissioned') as PipelineStatus], fontWeight: 700 }}>{STATUS_LABEL[(p.pipeline_status || 'commissioned') as PipelineStatus]}</span></td>
                <td>{qCount(p.questions) || '—'}</td>
                <td className="sub" style={{ margin: 0 }}>{p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-GB') : '—'}</td>
              </tr>
            );
          })}
          {queue.length === 0 ? <tr><td colSpan={6}>The interview queue is empty. Commission a piece via <code>/api/editorial/commission</code>.</td></tr> : null}
        </tbody>
      </table>

      {/* ── Franchises reference ──────────────────────────────────────────────── */}
      <h1 style={{ fontSize: 18 }}>Franchises</h1>
      <p className="sub">The recurring columns of the magazine and their publishing cadence.</p>
      <table className="adm-t">
        <thead><tr><th>Franchise</th><th>Cadence</th><th>Default shape</th><th>Live pieces</th><th>Remit</th></tr></thead>
        <tbody>
          {FRANCHISES.map((f) => {
            const count = pieces.filter((p) => p.franchise === f.key).length;
            return (
              <tr key={f.key}>
                <td style={{ fontWeight: 600 }}>{f.name}</td>
                <td style={{ textTransform: 'capitalize' }}>{f.cadence}</td>
                <td>{f.kind}</td>
                <td>{count || '—'}</td>
                <td className="sub" style={{ margin: 0, maxWidth: 420 }}>{f.description}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
