'use client';
// components/admin/CoverImagePicker.tsx
//
// The article cover-image panel — the "Articole"-grade picker, ported to the
// Cyprus Lifestyle admin (plain admin.css, no Tailwind / no icon lib). One place
// to SEE the current cover and CHANGE it, four ways:
//   • Preview      — the live cover, with a Remove (✕) button.
//   • Search photos — grounded Unsplash search (real Cyprus photos), returned as
//                     relevance-ranked candidates you click to pick. The query is
//                     prefilled from the headline/category/district and editable.
//   • Upload        — from your computer into Supabase Storage (bucket blog-images).
//   • URL           — paste any image URL.
// Plus a Credit line, shown under the photo on the site.
//
// Grounding + the Unsplash key live server-side in the `search-cover-photos`
// edge function, so a subject like "parliament" resolves to the Cyprus one and
// the key is never exposed to the browser. Picked photos are hot-linked from
// Unsplash's CDN (same as the AI writer) — no storage bucket required for search.

import { useCallback, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type SupaClient = ReturnType<typeof supabaseBrowser>;

interface Candidate {
  id: string;
  thumb: string;
  preview: string;
  url: string;
  full: string;
  author: string;
  author_link: string;
  unsplash_link: string;
  download_location: string;
  alt: string;
}

interface Props {
  supabase: SupaClient;
  title: string;
  summary?: string;
  category?: string;
  district?: string | null;
  value: string; // current cover_image URL
  credit: string; // current cover_image_credit
  onChange: (url: string) => void;
  onCreditChange: (credit: string) => void;
}

// Palette (admin.css): ink #0B0E11 · gold #C9A24C · cream #E4D2AC · border #cfc7b3 · muted #8a8371
const box: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e3ddcf',
  borderRadius: 4,
  padding: 16,
  marginBottom: 12,
};
const label: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  fontSize: 11,
  color: '#8a8371',
  margin: '0 0 10px',
};
const hint: React.CSSProperties = { fontSize: 11, color: '#8a8371', margin: '6px 0 0' };

export default function CoverImagePicker({
  supabase,
  title,
  summary,
  category,
  district,
  value,
  credit,
  onChange,
  onCreditChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);

  const note = (t: string) => {
    setMsg(t);
    if (t) setTimeout(() => setMsg(''), 5000);
  };

  // Unsplash: grounded search → ranked candidates. First run prefills the query
  // from the server-side brief (headline + category + district).
  const runSearch = useCallback(
    async (q?: string) => {
      if (!title && !q && !query) {
        note('Add a headline first, or type a search term.');
        return;
      }
      setSearching(true);
      setOpen(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-cover-photos', {
          body: { action: 'search', title, summary, category, county: district, query: q ?? query },
        });
        if (error) throw new Error(error.message);
        const d = (data || {}) as { error?: string; query?: string; results?: Candidate[] };
        if (d.error) throw new Error(d.error);
        setCandidates(Array.isArray(d.results) ? d.results : []);
        if (!query && d.query) setQuery(d.query);
        if (!d.results?.length) note('No results — adjust the search terms.');
      } catch (e) {
        note('Search failed: ' + (e as Error).message);
      }
      setSearching(false);
    },
    [supabase, title, summary, category, district, query],
  );

  // Pick a candidate → server pings Unsplash's download endpoint (API rule) and
  // returns the hot-link URL + credit. No storage bucket needed.
  const pick = useCallback(
    async (c: Candidate) => {
      setPicking(c.id);
      try {
        const { data, error } = await supabase.functions.invoke('search-cover-photos', {
          body: {
            action: 'download',
            image_url: c.url,
            download_location: c.download_location,
            credit: `Photo: ${c.author} / Unsplash`,
          },
        });
        if (error) throw new Error(error.message);
        const d = (data || {}) as { error?: string; publicUrl?: string; credit?: string };
        if (d.error || !d.publicUrl) throw new Error(d.error || 'could not set photo');
        onChange(d.publicUrl);
        onCreditChange(d.credit || `Photo: ${c.author} / Unsplash`);
        setOpen(false);
        note('✓ Cover set.');
      } catch (e) {
        note('Could not set photo: ' + (e as Error).message);
      }
      setPicking('');
    },
    [supabase, onChange, onCreditChange],
  );

  // Upload from computer → Supabase Storage (public bucket blog-images).
  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        note('Please choose an image file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        note('Image must be under 10MB.');
        return;
      }
      setUploading(true);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from('blog-images')
          .upload(fileName, file, { contentType: file.type, upsert: false });
        if (error) {
          const m = (error.message || '').toLowerCase();
          if (m.includes('not found') || m.includes('bucket')) {
            note('Uploads need a public "blog-images" bucket — create it in Supabase → Storage. (Search & URL work without it.)');
          } else {
            note('Upload failed: ' + error.message);
          }
          setUploading(false);
          if (uploadRef.current) uploadRef.current.value = '';
          return;
        }
        const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(fileName);
        onChange(urlData.publicUrl);
        onCreditChange(credit || 'Cyprus Lifestyle archive');
        note('✓ Image uploaded.');
      } catch (err) {
        note('Upload error: ' + (err as Error).message);
      }
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    },
    [supabase, onChange, onCreditChange, credit],
  );

  return (
    <div style={box}>
      <p style={label}>Cover image</p>

      {/* Preview */}
      {value
        ? (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Cover preview"
              style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 3, display: 'block', border: '1px solid #e3ddcf' }}
            />
            <button
              type="button"
              onClick={() => onChange('')}
              title="Remove cover"
              style={{
                position: 'absolute',
                top: 8,
                insetInlineEnd: 8,
                background: 'rgba(11,14,17,.78)',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                width: 28,
                height: 28,
                cursor: 'pointer',
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )
        : (
          <div
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#faf7f0',
              border: '1px dashed #cfc7b3',
              borderRadius: 3,
              color: '#8a8371',
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            No cover image yet
          </div>
        )}

      {/* Actions */}
      <div className="row" style={{ marginBottom: candidates.length || open ? 10 : 0 }}>
        <button type="button" className="abtn gold" disabled={searching} onClick={() => (open ? setOpen(false) : runSearch())}>
          {searching ? 'Searching…' : open ? 'Close search' : 'Search photos'}
        </button>
        <button
          type="button"
          className="abtn ghost"
          disabled={uploading}
          onClick={() => uploadRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload from computer'}
        </button>
        <input ref={uploadRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
      </div>

      {/* Unsplash panel */}
      {open
        ? (
          <div style={{ border: '1px solid #e3ddcf', borderRadius: 3, padding: 12, marginBottom: 10, background: '#faf7f0' }}>
            <div className="row" style={{ flexWrap: 'nowrap', marginBottom: candidates.length ? 10 : 0 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="e.g. Limassol marina Cyprus"
                style={{ marginBottom: 0 }}
              />
              <button type="button" className="abtn" disabled={searching} onClick={() => runSearch()} style={{ whiteSpace: 'nowrap' }}>
                {searching ? '…' : 'Go'}
              </button>
            </div>
            {candidates.length
              ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pick(c)}
                      disabled={!!picking}
                      title={c.alt || `Photo by ${c.author}`}
                      style={{
                        position: 'relative',
                        padding: 0,
                        border: '1px solid #cfc7b3',
                        borderRadius: 3,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '16 / 9',
                        background: '#eee',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.thumb} alt={c.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: picking === c.id ? 0.4 : 1 }} />
                      <span
                        style={{
                          position: 'absolute',
                          insetInline: 0,
                          bottom: 0,
                          background: 'rgba(11,14,17,.6)',
                          color: '#E4D2AC',
                          fontSize: 9,
                          padding: '2px 4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textAlign: 'start',
                        }}
                      >
                        {picking === c.id ? 'Setting…' : c.author}
                      </span>
                    </button>
                  ))}
                </div>
              )
              : null}
            <p style={hint}>Real Unsplash photos · ranked by relevance · credited automatically.</p>
          </div>
        )
        : null}

      {/* Manual URL */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…  (or use Search / Upload above)"
        style={{ marginBottom: 10 }}
      />

      {/* Credit */}
      <input
        value={credit || ''}
        onChange={(e) => onCreditChange(e.target.value)}
        placeholder="Photo credit (e.g. Photo: … / Unsplash)"
        style={{ marginBottom: 0 }}
      />
      {credit ? <p style={hint}>Shown under the photo: “{credit}”</p> : null}
      {msg ? <p style={{ ...hint, color: msg.startsWith('✓') ? '#1c6b34' : '#9a2020' }}>{msg}</p> : null}
    </div>
  );
}
