'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/locales';
import { slugify } from '@/lib/util';
import CoverImagePicker from '@/components/admin/CoverImagePicker';
import RichEditor from '@/components/admin/RichEditor';

const CATS = ['cyprus', 'business', 'property', 'relocation', 'culture', 'escapes', 'table', 'agenda', 'people', 'world'];
const DISTRICTS = ['', 'nicosia', 'limassol', 'larnaca', 'famagusta', 'paphos', 'kyrenia'];
const LANG_FIELDS = ['title', 'excerpt', 'summary', 'content', 'seo_title', 'seo_description'];

type F = Record<string, any>;

export default function EditorTab() {
  const sb = supabaseBrowser();
  const [id, setId] = useState<string | null>(null);
  const [f, setF] = useState<F>({ status: 'draft', category: 'cyprus', county: '', ai_editor: 'cyprus', author_name: 'The Cyprus Desk' });
  const [tab, setTab] = useState<Locale>('en');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (pid: string) => {
    const l = LOCALES.map((x) => LANG_FIELDS.map((k) => `${k}_${x}`)).flat().join(', ');
    const { data } = await sb.from('blog_posts').select(`id, slug, category, county, status, ai_editor, author_name, cover_image, cover_image_credit, tags_en, ${l}`).eq('id', pid).maybeSingle();
    if (data) setF(data as F);
  }, [sb]);

  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('id');
    if (pid) { setId(pid); load(pid); }
  }, [load]);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  async function autoTranslate() {
    setBusy('translate'); setMsg('');
    for (const target of LOCALES.filter((x) => x !== 'en')) {
      const body = await fetch('/api/admin/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: f.content_en || '', source: 'en', target }) }).then((r) => r.json());
      const bundle: F = {};
      for (const k of ['title', 'excerpt', 'summary', 'seo_title', 'seo_description']) {
        if (!f[`${k}_en`]) continue;
        const t = await fetch('/api/admin/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: f[`${k}_en`], source: 'en', target, kind: k }) }).then((r) => r.json());
        bundle[`${k}_${target}`] = t.text || f[`${k}_en`];
      }
      setF((p) => ({ ...p, ...bundle, [`content_${target}`]: body.ok ? body.html : p[`content_${target}`] }));
    }
    setBusy(''); setMsg('Translated EN → EL, RO, AR, DE, PL, RU. Review and save.');
  }

  async function proof() {
    const r = await fetch('/api/admin/proof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: f[`title_${tab}`], content: f[`content_${tab}`], lang: tab, html: true }) }).then((x) => x.json());
    if (r.ok) setMsg(`AI-tell score (${tab}): ${r.report.score} (${r.report.level}). ${r.report.tells.map((t: any) => t.label).slice(0, 3).join('; ')}`);
  }

  // AI proofread the active language's body (targeted; only rewrites for EL/AR
  // when the deterministic score is still medium+).
  async function aiClean() {
    setBusy('ai'); setMsg('');
    const r = await fetch('/api/admin/proof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ai: true, content: f[`content_${tab}`] || '', lang: tab, html: true, title: f[`title_${tab}`] }) }).then((x) => x.json());
    setBusy('');
    if (!r.ok) { setMsg('Proofread failed.'); return; }
    if (r.changed) { set(`content_${tab}`, r.text); setMsg(`AI clean (${tab}): tell score ${r.scoreBefore} → ${r.scoreAfter}. Review and save.`); }
    else setMsg(`AI clean (${tab}): nothing to change (score ${r.scoreBefore}). ${tab === 'en' || tab === 'ro' ? 'The AI pass runs for EL/AR only.' : ''}`);
  }

  async function save(publish?: boolean) {
    setBusy('save'); setMsg('');
    const status = publish ? 'published' : f.status;
    const row: F = {
      category: f.category, county: f.county || null, ai_editor: f.ai_editor, author_name: f.author_name,
      cover_image: f.cover_image || null, cover_image_credit: f.cover_image_credit || null, status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      tags_en: (f.tags_en_str ?? (Array.isArray(f.tags_en) ? f.tags_en.join(', ') : '')).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean),
    };
    for (const x of LOCALES) for (const k of LANG_FIELDS) row[`${k}_${x}`] = f[`${k}_${x}`] ?? null;
    if (!row.title_en) { setBusy(''); setMsg('English title is required.'); return; }

    let ok = false;
    let savedSlug = f.slug as string | undefined;
    if (id) {
      const { error } = await sb.from('blog_posts').update(row).eq('id', id);
      ok = !error;
      setMsg(error ? error.message : 'Saved.');
    } else {
      row.slug = `${slugify(row.title_en)}-${Math.random().toString(36).slice(2, 7)}`;
      savedSlug = row.slug;
      const { data, error } = await sb.from('blog_posts').insert(row).select('id').single();
      if (!error && data) { setId((data as any).id); window.history.replaceState(null, '', `/admin/editor?id=${(data as any).id}`); }
      ok = !error;
      setMsg(error ? error.message : 'Created.');
    }

    // Instant on-demand ISR: refresh the reader pages the moment we publish, so a
    // published article appears immediately instead of after the 5-minute window.
    if (ok && status === 'published') {
      try {
        const rr = await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: savedSlug, category: row.category }),
        }).then((r) => r.json());
        if (rr?.ok) setMsg('Published and live now.');
      } catch { /* non-fatal: the time-based window still refreshes it */ }
    }
    setBusy('');
  }

  const rtl = tab === 'ar';
  return (
    <>
      <h1>Editor</h1>
      <p className="sub">{id ? 'Editing an article' : 'New article'} · write in English, then auto-translate to the other six editions.</p>

      <div className="row" style={{ marginBottom: 12 }}>
        <select value={f.category} onChange={(e) => set('category', e.target.value)} style={{ width: 150 }}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.county || ''} onChange={(e) => set('county', e.target.value)} style={{ width: 150 }}>{DISTRICTS.map((d) => <option key={d} value={d}>{d || '— district —'}</option>)}</select>
        <input placeholder="Author name" value={f.author_name || ''} onChange={(e) => set('author_name', e.target.value)} style={{ flex: '1 1 180px' }} />
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input placeholder="Tags (comma separated, EN)" value={f.tags_en_str ?? (Array.isArray(f.tags_en) ? f.tags_en.join(', ') : '')} onChange={(e) => set('tags_en_str', e.target.value)} style={{ flex: '1 1 300px' }} />
        <button className="abtn" disabled={!!busy} onClick={autoTranslate}>{busy === 'translate' ? 'Translating…' : 'Auto-translate EN → all 6 editions'}</button>
      </div>

      <CoverImagePicker
        supabase={sb}
        title={f.title_en || ''}
        summary={f.summary_en || f.excerpt_en || ''}
        category={f.category}
        district={f.county || null}
        value={f.cover_image || ''}
        credit={f.cover_image_credit || ''}
        onChange={(url) => set('cover_image', url)}
        onCreditChange={(c) => set('cover_image_credit', c)}
      />

      <div className="row" style={{ gap: 4, marginBottom: 8 }}>
        {LOCALES.map((l) => <button key={l} className={`abtn ${tab === l ? 'gold' : 'ghost'}`} onClick={() => setTab(l)}>{LOCALE_LABEL[l]}</button>)}
      </div>

      <div dir={rtl ? 'rtl' : 'ltr'}>
        <input placeholder="Headline" value={f[`title_${tab}`] || ''} onChange={(e) => set(`title_${tab}`, e.target.value)} style={{ fontSize: 18 }} />
        <input placeholder="Standfirst / excerpt" value={f[`excerpt_${tab}`] || ''} onChange={(e) => set(`excerpt_${tab}`, e.target.value)} />
        <textarea rows={3} placeholder="Summary (cards & search)" value={f[`summary_${tab}`] || ''} onChange={(e) => set(`summary_${tab}`, e.target.value)} />
        <label className="fl" style={{ display: 'block', margin: '8px 0 4px' }}>Body — write normally; use the toolbar to format. No HTML needed.</label>
        <RichEditor key={tab} value={f[`content_${tab}`] || ''} onChange={(html) => set(`content_${tab}`, html)} dir={rtl ? 'rtl' : 'ltr'} />
        <div className="row">
          <input placeholder="SEO title" value={f[`seo_title_${tab}`] || ''} onChange={(e) => set(`seo_title_${tab}`, e.target.value)} />
          <input placeholder="SEO description" value={f[`seo_description_${tab}`] || ''} onChange={(e) => set(`seo_description_${tab}`, e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="abtn gold" disabled={!!busy} onClick={() => save(false)}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
        <button className="abtn" disabled={!!busy} onClick={() => save(true)}>Save & publish</button>
        <button className="abtn ghost" onClick={proof}>Proof ({tab})</button>
        <button className="abtn ghost" disabled={!!busy} onClick={aiClean}>{busy === 'ai' ? 'Cleaning…' : `AI clean (${tab})`}</button>
      </div>
      {msg ? <p style={{ color: '#1c6b34', marginTop: 10 }}>{msg}</p> : null}
    </>
  );
}
