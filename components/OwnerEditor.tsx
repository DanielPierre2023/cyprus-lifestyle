'use client';
// OWNER PROFILE EDITOR — the form a verified owner uses to edit their own listing.
// Rendered by app/[locale]/(site)/directory/manage/page.tsx ONLY when a valid editing
// session cookie is present (set by /api/directory/owner/verify after the owner opened
// their emailed management link). It posts to /api/directory/owner/save; the httpOnly
// session cookie travels with the request automatically (this component never sees it).
//
// Two kinds of field, made explicit in the UI:
//   • Structured, low-risk (website, opening hours, socials, amenities) PUBLISH IMMEDIATELY.
//   • Free-text (description) and photo URLs are SUBMITTED FOR REVIEW (moderation) and go
//     live once our team approves them.
// Styling/markup conventions mirror components/ClaimListing.tsx (self-contained CSS, brand
// tokens, the shared hidden HoneypotField).
import { useState } from 'react';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/honeypot';

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' }, { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const SOCIALS: { key: string; label: string; placeholder: string }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbusiness' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbusiness' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/yourbusiness' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourbusiness' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourbusiness' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbusiness' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/35799000000' },
];

export interface OwnerEditorInitial {
  slug: string;
  name: string;
  type: string | null;
  description: string;
  website: string | null;
  hours: Record<string, string>;
  socials: Record<string, string>;
  amenities: string[];
  photos: string[];
}

export default function OwnerEditor({ initial }: { initial: OwnerEditorInitial }) {
  const [website, setWebsite] = useState(initial.website || '');
  const [description, setDescription] = useState(initial.description || '');
  const [hours, setHours] = useState<Record<string, string>>(() => ({ ...initial.hours }));
  const [socials, setSocials] = useState<Record<string, string>>(() => ({ ...initial.socials }));
  const [amenities, setAmenities] = useState((initial.amenities || []).join('\n'));
  const [photos, setPhotos] = useState((initial.photos || []).join('\n'));
  const [hp, setHp] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ saved: string[]; pending: string[] } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(''); setDone(null);
    try {
      const res = await fetch('/api/directory/owner/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: initial.slug,
          website,
          description,
          hours,
          socials,
          amenities: amenities.split('\n'),
          photos: photos.split('\n'),
          [HONEYPOT_FIELD]: hp,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setErr(d.error || 'Something went wrong — please try again.'); return; }
      setDone({ saved: d.saved || [], pending: d.pending || [] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErr('Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const FIELD_LABEL: Record<string, string> = {
    website: 'Website', hours: 'Opening hours', socials: 'Social links',
    amenities: 'Amenities', description: 'Description', photos: 'Photos',
  };
  const names = (keys: string[]) => keys.map((k) => FIELD_LABEL[k] || k).join(', ');

  return (
    <form className="oe" onSubmit={onSubmit}>
      {done ? (
        <div className="oe-flash" role="status">
          <strong>Changes received.</strong>
          {done.saved.length ? <p>Published to your listing now: <b>{names(done.saved)}</b>.</p> : null}
          {done.pending.length ? <p>Submitted for review (they’ll go live once approved): <b>{names(done.pending)}</b>.</p> : null}
          {!done.saved.length && !done.pending.length ? <p>No changes were needed.</p> : null}
        </div>
      ) : null}

      <p className="oe-note">
        Structured details (<b>website, opening hours, socials, amenities</b>) publish immediately.
        Your <b>description</b> and <b>photos</b> are submitted for a quick review before they go live.
      </p>

      {/* ── Website ── */}
      <section className="oe-sec">
        <h3 className="oe-h">Website</h3>
        <label className="oe-field">
          <span className="oe-lab">Website address</span>
          <input className="oe-in" type="url" inputMode="url" placeholder="https://your-business.com"
            value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </section>

      {/* ── Opening hours ── */}
      <section className="oe-sec">
        <h3 className="oe-h">Opening hours</h3>
        <div className="oe-hours">
          {DAYS.map((d) => (
            <label key={d.key} className="oe-hrow">
              <span className="oe-day">{d.label}</span>
              <input className="oe-in" placeholder="e.g. 09:00–17:00 or Closed"
                value={hours[d.key] || ''} onChange={(e) => setHours({ ...hours, [d.key]: e.target.value })} />
            </label>
          ))}
        </div>
      </section>

      {/* ── Socials ── */}
      <section className="oe-sec">
        <h3 className="oe-h">Social links</h3>
        {SOCIALS.map((sct) => (
          <label key={sct.key} className="oe-field">
            <span className="oe-lab">{sct.label}</span>
            <input className="oe-in" type="url" inputMode="url" placeholder={sct.placeholder}
              value={socials[sct.key] || ''} onChange={(e) => setSocials({ ...socials, [sct.key]: e.target.value })} />
          </label>
        ))}
      </section>

      {/* ── Amenities ── */}
      <section className="oe-sec">
        <h3 className="oe-h">Amenities</h3>
        <label className="oe-field">
          <span className="oe-lab">One per line (e.g. Free parking, Wheelchair access, Outdoor seating)</span>
          <textarea className="oe-ta" rows={4} value={amenities} onChange={(e) => setAmenities(e.target.value)} />
        </label>
      </section>

      {/* ── Description (moderated) ── */}
      <section className="oe-sec">
        <h3 className="oe-h">Description <span className="oe-tag">Reviewed before publishing</span></h3>
        <label className="oe-field">
          <span className="oe-lab">Tell visitors about your business</span>
          <textarea className="oe-ta" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </section>

      {/* ── Photos (moderated; URLs for now) ── */}
      <section className="oe-sec">
        <h3 className="oe-h">Photos <span className="oe-tag">Reviewed before publishing</span></h3>
        <label className="oe-field">
          <span className="oe-lab">Image URLs, one per line (direct uploads are coming soon)</span>
          <textarea className="oe-ta" rows={4} placeholder="https://…/photo-1.jpg" value={photos} onChange={(e) => setPhotos(e.target.value)} />
        </label>
      </section>

      {/* honeypot — hidden spam trap shared with every public form */}
      <HoneypotField value={hp} onChange={setHp} />

      {err ? <p className="oe-err">{err}</p> : null}
      <button className="btn oe-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>

      <style>{OE_CSS}</style>
    </form>
  );
}

const OE_CSS = `
  .oe{display:flex;flex-direction:column;gap:22px;max-width:720px}
  .oe-note{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--ink-soft,#5b5346);background:var(--paper-2,#efe8d8);border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:12px 16px;margin:0}
  .oe-flash{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--ink,#171310);background:#eef6ec;border:1px solid #bcd9b4;border-radius:6px;padding:14px 16px}
  .oe-flash p{margin:6px 0 0}
  .oe-sec{background:#fff;border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:18px 20px}
  .oe-h{font-family:var(--disp);font-weight:600;font-size:19px;margin:0 0 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .oe-tag{font-family:var(--sans);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a5b12;border:1px solid #C9A24C;border-radius:999px;padding:2px 9px}
  .oe-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
  .oe-field:last-child{margin-bottom:0}
  .oe-lab{font-family:var(--sans);font-size:12.5px;color:var(--ink-soft,#5b5346)}
  .oe-in,.oe-ta{font-family:var(--sans);font-size:15px;padding:10px 12px;border:1px solid var(--line,#e0d6c1);border-radius:5px;background:var(--paper,#fbf8f1);color:var(--ink,#171310);width:100%;box-sizing:border-box}
  .oe-ta{line-height:1.5;resize:vertical}
  .oe-in:focus,.oe-ta:focus{outline:none;border-color:#C9A24C}
  .oe-hours{display:flex;flex-direction:column;gap:8px}
  .oe-hrow{display:grid;grid-template-columns:110px 1fr;align-items:center;gap:12px}
  .oe-day{font-family:var(--sans);font-size:13px;color:var(--ink,#171310)}
  .oe-err{font-family:var(--sans);font-size:14px;color:#9b2d1f;margin:0}
  .oe-btn{align-self:flex-start;text-align:center}
  @media (max-width:560px){.oe-hrow{grid-template-columns:1fr;gap:4px}}
`;
