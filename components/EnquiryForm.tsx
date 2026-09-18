'use client';
// "Request info" — an enquiry form on a listing hub. Posts to /api/directory/lead,
// which records the lead and emails the desk. The lead-gen layer of the directory:
// featured/verified businesses receive real enquiries. Hidden `company` field is
// the honeypot the server checks.
import { useState } from 'react';
import type { Locale } from '@/lib/locales';

export interface EnquiryLabels {
  title: string; intro: string; name: string; email: string; message: string;
  send: string; sending: string; success: string; error: string;
}

export default function EnquiryForm({ listingSlug, listingType, listingName, locale, labels }:
{ listingSlug: string; listingType: string; listingName: string; locale: Locale; labels: EnquiryLabels }) {
  const [f, setF] = useState({ name: '', email: '', message: '', company: '' }); // company = honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/directory/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, listingSlug, listingType, listingName, locale }),
      });
      const d = await res.json();
      if (d.ok) setState('done');
      else { setErr(d.error || labels.error); setState('error'); }
    } catch { setErr(labels.error); setState('error'); }
  }

  if (state === 'done') {
    return <div className="enq enq-done"><p>{labels.success}</p><style>{ENQ_CSS}</style></div>;
  }

  return (
    <form className="enq" onSubmit={submit}>
      <h3 className="enq-t">{labels.title}</h3>
      <p className="enq-i">{labels.intro}</p>
      <input className="enq-in" required placeholder={labels.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input className="enq-in" required type="email" placeholder={labels.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <textarea className="enq-in enq-ta" rows={3} placeholder={labels.message} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      {/* honeypot */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
      <button className="btn enq-btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? labels.sending : labels.send}</button>
      {state === 'error' ? <p className="enq-err">{err}</p> : null}
      <style>{ENQ_CSS}</style>
    </form>
  );
}

const ENQ_CSS = `
  .enq{background:#fff;border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
  .enq-t{font-family:var(--disp);font-weight:600;font-size:20px;margin:0}
  .enq-i{font-family:var(--body);font-size:14px;color:var(--ink-soft,#5b5346);margin:0 0 2px}
  .enq-in{font-family:var(--body);font-size:15px;padding:10px 12px;border:1px solid var(--line,#e0d6c1);border-radius:5px;background:var(--paper,#fbf7ee);color:var(--ink,#171310);width:100%}
  .enq-in:focus{outline:none;border-color:#C9A24C;box-shadow:0 0 0 3px rgba(201,162,76,.16)}
  .enq-ta{resize:vertical}
  .enq-btn{margin-top:2px}
  .enq-err{font-family:var(--body);font-size:14px;color:#a3341f;margin:0}
  .enq-done{align-items:flex-start}
  .enq-done p{font-family:var(--body);font-size:16px;color:var(--ink,#171310);margin:0}
`;
