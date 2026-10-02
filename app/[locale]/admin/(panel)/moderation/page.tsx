'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Moderation console — three desks in one panel:
//   (a) Owner edits queue — pending directory_listing_edits proposed by owner-verified
//       businesses (description / photos). Approve applies the value to the listing;
//       reject closes it. Served + written by /api/admin/moderation/edits.
//   (b) Enrichment review — directory_listings the enrichment job held back
//       (text_status='review', hollow summary_en). Write a grounded description, re-queue
//       it, or skip. Served + written by /api/admin/moderation/review.
//   (c) Enrichment runner — a thin control panel over the EXISTING /api/admin/enrich-stubs
//       (GET dry-run census + cost, POST a batch). Uses the admin session cookie; no secret.
// All reads/writes are admin-session API routes (directory_listing_edits is RLS
// service-role-only; writes never touch the browser Supabase client).

// ── shared fetch helpers (admin session cookie travels with same-origin requests) ──
async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  return r.json() as Promise<T>;
}
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  return r.json() as Promise<T>;
}

// ── types (mirror lib/directory/moderation.ts) ──
interface PendingEdit {
  id: string; listing_slug: string; field: string; status: string;
  submitted_by: string | null; created_at: string;
  name: string; type: string | null; url: string; listing_found: boolean;
  current_description: string; proposed_description: string;
  current_photos: string[]; proposed_photos: string[];
}
interface ReviewListing {
  slug: string; name: string; type: string | null; category: string | null;
  category_label: string | null; district: string | null; url: string;
  current_summary: string; text_generated_at: string | null;
}

const GREEN = '#1c6b34';
const RED = '#9a2020';
const MUTED = '#8a8371';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; }
}

// ── photo strip ──
function Photos({ urls }: { urls: string[] }) {
  if (!urls.length) return <span className="sub" style={{ margin: 0 }}>none</span>;
  return (
    <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
      {urls.map((u, i) => (
        <a key={`${u}-${i}`} href={u} target="_blank" rel="noreferrer noopener"
          title={u} style={{ display: 'block', width: 76 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer"
            style={{ width: 76, height: 56, objectFit: 'cover', border: '1px solid #e3ddcf', borderRadius: 3, background: '#faf7f0', display: 'block' }} />
          <span style={{ display: 'block', fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.replace(/^https?:\/\//, '')}</span>
        </a>
      ))}
    </div>
  );
}

// ══════════════════════════════ (a) Owner edit card ══════════════════════════════
function OwnerEditCard({ edit, onResolved }: { edit: PendingEdit; onResolved: (id: string, verb: string) => void }) {
  const [busy, setBusy] = useState<'' | 'approve' | 'reject'>('');
  const [err, setErr] = useState('');

  async function decide(action: 'approve' | 'reject') {
    setBusy(action); setErr('');
    try {
      const d = await postJSON<{ ok: boolean; error?: string }>('/api/admin/moderation/edits', { id: edit.id, action });
      if (d.ok) onResolved(edit.id, action === 'approve' ? 'Approved' : 'Rejected');
      else { setErr(d.error || 'Failed'); setBusy(''); }
    } catch (e) { setErr((e as Error).message); setBusy(''); }
  }

  const isDesc = edit.field === 'description';
  const isPhotos = edit.field === 'photos';

  return (
    <div style={{ border: '1px solid #e3ddcf', borderRadius: 4, background: '#fff', padding: '12px 14px', marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <span className={`pill ${isDesc ? 'info' : 'warn'}`}>{edit.field}</span>
          <span className="sub" style={{ margin: '0 0 0 10px' }}>
            submitted {fmtDate(edit.created_at)}{edit.submitted_by ? ` · by ${edit.submitted_by}` : ''}
          </span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="abtn gold" disabled={!!busy} onClick={() => decide('approve')}>
            {busy === 'approve' ? '…' : 'Approve'}
          </button>
          <button className="abtn ghost" disabled={!!busy} onClick={() => decide('reject')}>
            {busy === 'reject' ? '…' : 'Reject'}
          </button>
        </div>
      </div>

      {isDesc ? (
        <div className="row" style={{ gap: 14, alignItems: 'stretch', marginTop: 10 }}>
          <div style={{ flex: '1 1 300px', minWidth: 260 }}>
            <span className="fl">Current (live)</span>
            <div style={{ border: '1px solid #eee6d6', borderRadius: 3, padding: '8px 10px', background: '#faf7f0', fontSize: 13, color: '#5b5647', whiteSpace: 'pre-wrap', minHeight: 48 }}>
              {edit.current_description || <em style={{ color: MUTED }}>— empty —</em>}
            </div>
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 260 }}>
            <span className="fl">Proposed</span>
            <div style={{ border: '1px solid #cde3d3', borderRadius: 3, padding: '8px 10px', background: '#f3f9f4', fontSize: 13, color: '#1c1c1c', whiteSpace: 'pre-wrap', minHeight: 48 }}>
              {edit.proposed_description || <em style={{ color: MUTED }}>— empty —</em>}
            </div>
          </div>
        </div>
      ) : null}

      {isPhotos ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ marginBottom: 8 }}><span className="fl">Current (live)</span><Photos urls={edit.current_photos} /></div>
          <div><span className="fl">Proposed</span><Photos urls={edit.proposed_photos} /></div>
        </div>
      ) : null}

      {!isDesc && !isPhotos ? (
        <div className="sub" style={{ marginTop: 8 }}>Unsupported field — approve/reject only.</div>
      ) : null}

      {err ? <div style={{ color: RED, fontSize: 12.5, marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}

// ══════════════════════════════ (b) Review card ══════════════════════════════
function ReviewCard({ listing, onResolved }: { listing: ReviewListing; onResolved: (slug: string, verb: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'requeue' | 'skip'>('');
  const [err, setErr] = useState('');

  async function act(action: 'save' | 'requeue' | 'skip') {
    if (action === 'save' && !text.trim()) { setErr('Write a description first.'); return; }
    setBusy(action); setErr('');
    try {
      const d = await postJSON<{ ok: boolean; error?: string }>('/api/admin/moderation/review',
        { slug: listing.slug, action, ...(action === 'save' ? { text } : {}) });
      if (d.ok) onResolved(listing.slug, action === 'save' ? 'Saved' : action === 'requeue' ? 'Re-queued' : 'Skipped');
      else { setErr(d.error || 'Failed'); setBusy(''); }
    } catch (e) { setErr((e as Error).message); setBusy(''); }
  }

  const meta = [listing.category_label || listing.category, listing.district].filter(Boolean).join(' · ');

  return (
    <div style={{ border: '1px solid #e3ddcf', borderRadius: 4, background: '#fff', padding: '12px 14px', marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <strong style={{ fontSize: 15 }}>
            <a href={listing.url} target="_blank" rel="noreferrer noopener" style={{ color: '#0B0E11' }}>{listing.name}</a>
          </strong>
          <div className="sub" style={{ margin: '2px 0 0' }}>{meta || '—'} · <code>{listing.slug}</code></div>
        </div>
        <span className="pill warn">review</span>
      </div>
      <textarea
        placeholder="Write a short, grounded description — only facts you can verify (what it is, its category, where it is). No prices, ratings, awards or superlatives."
        value={text} onChange={(e) => setText(e.target.value)} rows={3}
        style={{ marginTop: 10, marginBottom: 6 }} />
      <div className="row" style={{ gap: 6, justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 6 }}>
          <button className="abtn gold" disabled={!!busy} onClick={() => act('save')}>{busy === 'save' ? '…' : 'Save description'}</button>
          <button className="abtn ghost" disabled={!!busy} onClick={() => act('requeue')} title="Mark as a stub so the next enrichment run retries it">{busy === 'requeue' ? '…' : 'Re-queue'}</button>
          <button className="abtn ghost" disabled={!!busy} onClick={() => act('skip')} title="Leave it in review for now">{busy === 'skip' ? '…' : 'Skip'}</button>
        </div>
        <span className="sub" style={{ margin: 0 }}>{text.trim().length} chars</span>
      </div>
      {err ? <div style={{ color: RED, fontSize: 12.5, marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}

// ══════════════════════════════ (c) Enrichment runner ══════════════════════════════
interface DryRun {
  ok: boolean; error?: string;
  published_scanned?: number; stubs?: number; owner_verified_skipped?: number; already_generated?: number;
  by_type?: Record<string, number>;
  cost_estimate_usd?: { english_only: number; with_translation: number; per_row_en: number; per_row_translated: number };
}
interface BatchRun {
  ok: boolean; error?: string;
  candidates?: number; generated?: number; review?: number; errors?: number; usd?: number; translated?: number;
  note?: string; samples?: { slug: string; status: string; reason?: string }[];
}

function EnrichmentRunner() {
  const [dry, setDry] = useState<DryRun | null>(null);
  const [dryBusy, setDryBusy] = useState(false);
  const [limit, setLimit] = useState(20);
  const [concurrency, setConcurrency] = useState(4);
  const [translate, setTranslate] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [log, setLog] = useState<{ at: string; text: string }[]>([]);
  const [err, setErr] = useState('');

  async function dryRun() {
    setDryBusy(true); setErr('');
    try {
      const d = await getJSON<DryRun>('/api/admin/enrich-stubs');
      if (d.ok) setDry(d); else setErr(d.error || 'Dry-run failed');
    } catch (e) { setErr((e as Error).message); }
    setDryBusy(false);
  }

  async function runBatch() {
    setRunBusy(true); setErr('');
    try {
      const d = await postJSON<BatchRun>('/api/admin/enrich-stubs', { limit, concurrency, translate });
      if (d.ok) {
        const line = `+${d.generated ?? 0} written · ${d.review ?? 0} held for review · ${d.errors ?? 0} errors` +
          `${translate ? ` · ${d.translated ?? 0} translations` : ''} · ~$${(d.usd ?? 0).toFixed(4)} · ${d.note || ''}`;
        setLog((l) => [{ at: new Date().toLocaleTimeString('en-GB'), text: line }, ...l].slice(0, 20));
        dryRun(); // refresh the backlog census after a batch
      } else setErr(d.error || 'Batch failed');
    } catch (e) { setErr((e as Error).message); }
    setRunBusy(false);
  }

  const cost = dry?.cost_estimate_usd;
  const byType = dry?.by_type ? Object.entries(dry.by_type).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div style={{ border: '1px solid #e3ddcf', borderRadius: 4, background: '#fff', padding: '16px 18px' }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <button className="abtn ghost" disabled={dryBusy} onClick={dryRun}>{dryBusy ? 'Counting…' : 'Dry-run (census + cost)'}</button>
        <span className="sub" style={{ margin: 0 }}>Counts the hollow-stub backlog and estimates spend. Writes nothing.</span>
      </div>

      {dry ? (
        <div className="cards" style={{ marginTop: 14, marginBottom: 14 }}>
          <div className="stat"><div className="n">{(dry.stubs ?? 0).toLocaleString('en-GB')}</div><div className="k">Stubs remaining</div></div>
          <div className="stat"><div className="n">{(dry.published_scanned ?? 0).toLocaleString('en-GB')}</div><div className="k">Published scanned</div></div>
          <div className="stat"><div className="n">{(dry.already_generated ?? 0).toLocaleString('en-GB')}</div><div className="k">Already done</div></div>
          <div className="stat"><div className="n">${(cost?.english_only ?? 0).toFixed(2)}</div><div className="k">Est. cost (EN only)</div></div>
          <div className="stat"><div className="n">${(cost?.with_translation ?? 0).toFixed(2)}</div><div className="k">Est. cost (all 7)</div></div>
        </div>
      ) : null}

      {byType.length ? (
        <div className="sub" style={{ marginBottom: 14 }}>
          By type:{' '}
          {byType.slice(0, 12).map(([t, n], i) => (
            <span key={t}>{i ? ' · ' : ''}<strong>{t}</strong> {n.toLocaleString('en-GB')}</span>
          ))}
        </div>
      ) : null}

      <div className="row" style={{ gap: 14, alignItems: 'flex-end', borderTop: '1px solid #eee6d6', paddingTop: 14 }}>
        <div style={{ width: 90 }}>
          <span className="fl">Limit</span>
          <input type="number" min={1} max={40} value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(40, Number(e.target.value) || 1)))} style={{ marginBottom: 0 }} />
        </div>
        <div style={{ width: 110 }}>
          <span className="fl">Concurrency</span>
          <input type="number" min={1} max={8} value={concurrency}
            onChange={(e) => setConcurrency(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} style={{ marginBottom: 0 }} />
        </div>
        <label className="row" style={{ gap: 7, marginBottom: 2 }}>
          <input type="checkbox" checked={translate} onChange={(e) => setTranslate(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
          <span style={{ fontSize: 13 }}>Also translate (6 editions, ~6× cost)</span>
        </label>
        <button className="abtn gold" disabled={runBusy} onClick={runBatch}>
          {runBusy ? 'Running…' : `Run a batch (${limit})`}
        </button>
      </div>
      <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
        Idempotent and resumable — click repeatedly until the backlog is clear. Each batch generates grounded English blurbs (translation optional).
      </p>

      {err ? <div style={{ color: RED, fontSize: 13, marginTop: 10 }}>{err}</div> : null}

      {log.length ? (
        <div style={{ marginTop: 14 }}>
          <span className="fl">Batch log</span>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 12.5, color: '#5b5647', padding: '3px 0', borderBottom: '1px solid #f1ecdf' }}>
              <span style={{ color: MUTED }}>{l.at}</span> — {l.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ══════════════════════════════ page ══════════════════════════════
const sectionHead: React.CSSProperties = { fontSize: 18, marginTop: 30, marginBottom: 4, borderBottom: '2px solid #C9A24C', paddingBottom: 6 };

export default function ModerationConsole() {
  const [edits, setEdits] = useState<PendingEdit[]>([]);
  const [review, setReview] = useState<ReviewListing[]>([]);
  const [loadingEdits, setLoadingEdits] = useState(true);
  const [loadingReview, setLoadingReview] = useState(true);
  const [editsErr, setEditsErr] = useState('');
  const [reviewErr, setReviewErr] = useState('');
  const [flash, setFlash] = useState('');

  const loadEdits = useCallback(async () => {
    setLoadingEdits(true); setEditsErr('');
    try {
      const d = await getJSON<{ ok: boolean; edits?: PendingEdit[]; error?: string }>('/api/admin/moderation/edits');
      if (d.ok) setEdits(d.edits || []); else setEditsErr(d.error || 'Failed to load edits');
    } catch (e) { setEditsErr((e as Error).message); }
    setLoadingEdits(false);
  }, []);

  const loadReview = useCallback(async () => {
    setLoadingReview(true); setReviewErr('');
    try {
      const d = await getJSON<{ ok: boolean; listings?: ReviewListing[]; error?: string }>('/api/admin/moderation/review');
      if (d.ok) setReview(d.listings || []); else setReviewErr(d.error || 'Failed to load review queue');
    } catch (e) { setReviewErr((e as Error).message); }
    setLoadingReview(false);
  }, []);

  useEffect(() => { loadEdits(); loadReview(); }, [loadEdits, loadReview]);

  function toast(msg: string) { setFlash(msg); setTimeout(() => setFlash(''), 2500); }

  const onEditResolved = useCallback((id: string, verb: string) => {
    setEdits((es) => es.filter((e) => e.id !== id));
    toast(`${verb} — listing updated.`);
  }, []);
  const onReviewResolved = useCallback((slug: string, verb: string) => {
    setReview((rs) => rs.filter((r) => r.slug !== slug));
    toast(`${verb}.`);
  }, []);

  // Group pending edits by listing (preserve newest-first order of first appearance).
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PendingEdit[]>();
    for (const e of edits) {
      if (!map.has(e.listing_slug)) { map.set(e.listing_slug, []); order.push(e.listing_slug); }
      map.get(e.listing_slug)!.push(e);
    }
    return order.map((slug) => ({ slug, edits: map.get(slug)! }));
  }, [edits]);

  return (
    <>
      <h1>Moderation</h1>
      <p className="sub">
        Owner-submitted edits awaiting review, listings the enrichment job held back, and a one-click runner for the stub-enrichment job.
      </p>

      <div className="cards">
        <div className="stat"><div className="n" style={{ color: edits.length ? '#b8860b' : GREEN }}>{loadingEdits ? '…' : edits.length}</div><div className="k">Owner edits pending</div></div>
        <div className="stat"><div className="n" style={{ color: review.length ? '#b8860b' : GREEN }}>{loadingReview ? '…' : review.length}</div><div className="k">Listings in review</div></div>
      </div>

      {flash ? <div style={{ color: GREEN, fontSize: 13, margin: '0 0 12px' }}>{flash}</div> : null}

      {/* ── (a) Owner edits queue ── */}
      <h2 style={sectionHead}>Owner edits queue</h2>
      <p className="sub">
        Free-text and photo changes submitted by owner-verified businesses. <strong>Approve</strong> publishes the proposed value onto the
        listing (description → the displayed summary; photos → the owned gallery); <strong>Reject</strong> discards it. Structured fields
        (hours, socials, amenities, website) are published by the owner editor directly and never appear here.
      </p>
      {editsErr ? <div style={{ color: RED, fontSize: 13, marginBottom: 10 }}>{editsErr}</div> : null}
      {loadingEdits ? <p className="sub">Loading…</p> : null}
      {!loadingEdits && grouped.length === 0 ? <p className="sub">No pending owner edits. 🎉</p> : null}
      {grouped.map((g) => (
        <div key={g.slug} style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ fontSize: 15 }}>
              <a href={g.edits[0].url} target="_blank" rel="noreferrer noopener" style={{ color: '#0B0E11' }}>{g.edits[0].name}</a>
            </strong>
            <span className="sub" style={{ margin: '0 0 0 8px' }}><code>{g.slug}</code>{g.edits[0].listing_found ? '' : ' · ⚠ listing not found'}</span>
          </div>
          {g.edits.map((e) => <OwnerEditCard key={e.id} edit={e} onResolved={onEditResolved} />)}
        </div>
      ))}

      {/* ── (b) Enrichment review ── */}
      <h2 style={sectionHead}>Enrichment review</h2>
      <p className="sub">
        Listings where the generated description failed the grounding gate, so it was held back and the summary left empty (these stay out of
        the sitemap until fixed). Write a short, grounded description, <strong>Re-queue</strong> it for another automated attempt, or
        <strong> Skip</strong> for now.
      </p>
      {reviewErr ? <div style={{ color: RED, fontSize: 13, marginBottom: 10 }}>{reviewErr}</div> : null}
      {loadingReview ? <p className="sub">Loading…</p> : null}
      {!loadingReview && review.length === 0 ? <p className="sub">Nothing awaiting review. 🎉</p> : null}
      {review.map((r) => <ReviewCard key={r.slug} listing={r} onResolved={onReviewResolved} />)}

      {/* ── (c) Enrichment runner ── */}
      <h2 style={sectionHead}>Enrichment runner</h2>
      <p className="sub">Fill the hollow &ldquo;stub&rdquo; directory descriptions. Dry-run first to see the backlog and cost, then run batches until clear.</p>
      <EnrichmentRunner />
    </>
  );
}
