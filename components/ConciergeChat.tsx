'use client';
// The Cyprus Lifestyle Concierge — a bespoke luxury chat experience.
// A discreet "Concierge Bell" launcher unfolds into an editorial panel with
// streaming replies, grounded place cards and guide links, lead-routing and a
// human handoff. Multi-turn, multilingual, RTL-aware. Talks to
// /api/concierge/chat (SSE) and routes requests via /api/concierge/request.
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import CoverImage from '@/components/CoverImage';
import type { Locale } from '@/lib/locales';

export interface ConciergeChatLabels {
  open: string; title: string; greeting: string; placeholder: string; send: string;
  searching: string; composing: string; error: string;
  examplesTitle: string; examples: string[]; picksTitle: string; guidesTitle: string;
  arrange: string; human: string; newChat: string; close: string;
  reqEmailPh: string; reqNotePh: string; reqSend: string; reqSending: string; reqSent: string;
  trust: string; trustLink: string;
  mem: { welcome: string; title: string; note: string; forget: string; name: string; base: string; party: string; dates: string; interests: string; dietary: string; status: string };
  voice: { speak: string; listening: string; readAloud: string };
  member: string;
}
interface MemoryProfile { name?: string; language?: string; interests?: string[]; base?: string; party?: string; dates?: string; dietary?: string; status?: string; notes?: string; }
interface Pick { slug: string; type: string; name: string; district: string | null; rating: number | null; rating_count: number | null; price_band: string | null; image: string | null; verified?: boolean; }
interface GuideLink { label: string; path: string; }
interface Msg { role: 'user' | 'assistant'; content: string; picks?: Pick[]; guides?: GuideLink[]; canRoute?: boolean; streaming?: boolean; }

const TYPE_DOT: Record<string, string> = { restaurant: '#C0492E', winery: '#7B2D42', hotel: '#1F6F78', beach: '#2F86C4', development: '#8A6D3B', vendor: '#4E7A46' };

const SPEECH_LANG: Record<string, string> = { en: 'en-GB', el: 'el-GR', ro: 'ro-RO', ar: 'ar-SA', de: 'de-DE', pl: 'pl-PL', ru: 'ru-RU' };
// Launcher label shown beside the concierge bell, per edition.
const LAUNCH: Record<string, string> = {
  en: 'Ask your concierge', el: 'Ρωτήστε τον concierge', ro: 'Întreabă-ți concierge-ul',
  ar: 'اسأل الكونسيرج', de: 'Fragen Sie Ihren Concierge', pl: 'Zapytaj concierge’a', ru: 'Спросите консьержа',
};
/* eslint-disable @typescript-eslint/no-explicit-any */
function getSR(): any { return typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null; }
// Premium read-aloud: generate the reply as speech via our server TTS (OpenAI
// neural voice) and play the mp3. Browsers block audio that isn't tied to a user
// gesture (NotAllowedError), so we "prime" ONE reusable <audio> element on a real
// click (the read-aloud toggle / Send); after that, later playback is allowed.
// We never fall back to the browser voice for non-English text — it would read
// Romanian/Greek/etc. in an English voice — so a non-English locale stays silent
// if TTS is ever unavailable; English may use the browser voice as a last resort.
let ttsAudio: HTMLAudioElement | null = null;
let ttsUrl: string | null = null;
let audioPrimed = false;

function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!ttsAudio) { ttsAudio = new Audio(); ttsAudio.preload = 'auto'; }
  return ttsAudio;
}
// A ~0.05s silent WAV built at runtime, played within a gesture to unlock audio.
function silentWav(): string {
  const sr = 8000, n = 400, buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
  let bin = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}
// Must be called from a user gesture (toggle / Send) to unlock audio playback.
function primeAudio() {
  const a = getAudioEl(); if (!a || audioPrimed) return;
  try {
    a.muted = true; // muted playback is always permitted → this unlocks the element for later real playback
    a.src = silentWav();
    const done = () => { audioPrimed = true; try { a.pause(); a.currentTime = 0; } catch { /* no-op */ } a.muted = false; };
    const p = a.play();
    if (p && typeof p.then === 'function') p.then(done).catch(() => { try { a.muted = false; } catch { /* no-op */ } });
    else done();
  } catch { try { a.muted = false; } catch { /* no-op */ } }
}
function browserSpeak(text: string, locale: string) {
  try {
    const s = window.speechSynthesis; if (!s || !text) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 700));
    u.lang = SPEECH_LANG[locale] || 'en-GB'; u.rate = 1; u.pitch = 1;
    s.speak(u);
  } catch { /* no-op */ }
}
async function speak(text: string, locale: string) {
  const t = (text || '').trim();
  if (!t) return;
  stopSpeaking();
  const a = getAudioEl();
  try {
    const res = await fetch('/api/concierge/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t.slice(0, 4000), locale }),
    });
    if (!res.ok || !a) throw new Error('tts');
    const blob = await res.blob();
    if (ttsUrl) { try { URL.revokeObjectURL(ttsUrl); } catch { /* no-op */ } ttsUrl = null; }
    ttsUrl = URL.createObjectURL(blob);
    a.src = ttsUrl;
    a.muted = false;
    try { await a.play(); }
    catch { await new Promise((r) => setTimeout(r, 140)); await a.play(); } // one retry — autoplay unlock can lag the first reply
  } catch {
    if (locale === 'en') browserSpeak(t, locale); // English only; never a wrong-language voice
  }
}
function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch { /* no-op */ }
  try { if (ttsAudio) ttsAudio.pause(); } catch { /* no-op */ }
}

export default function ConciergeChat({ locale, labels }: { locale: Locale; labels: ConciergeChatLabels }) {
  const rtl = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [req, setReq] = useState<{ email: string; note: string; state: 'idle' | 'sending' | 'sent' } | null>(null);
  const cidRef = useRef<string>('');
  const [mem, setMem] = useState<MemoryProfile | null>(null);
  const [memOpen, setMemOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const recRef = useRef<any>(null); // SpeechRecognition instance
  const spokenRef = useRef<Set<number>>(new Set());
  const [proactive, setProactive] = useState<{ greeting: string; chips: string[] } | null>(null);
  const proactiveFetched = useRef(false);
  const [isMember, setIsMember] = useState(false);
  const memberFetched = useRef(false);

  // Recognise a concierge member (by the browser cid) → show the Member mark.
  useEffect(() => {
    if (!open || memberFetched.current) return;
    memberFetched.current = true;
    const cid = cidRef.current;
    if (!cid) return;
    fetch(`/api/membership/status?cid=${encodeURIComponent(cid)}`)
      .then((r) => r.json()).then((d) => { if (d && d.member) setIsMember(true); })
      .catch(() => { /* free tier */ });
  }, [open]);

  // Proactive opener: on first open, fetch a timely greeting + suggestions
  // grounded on the season, what's on, and memory. Falls back to the static one.
  useEffect(() => {
    if (!open || proactiveFetched.current) return;
    proactiveFetched.current = true;
    const cid = cidRef.current;
    fetch(`/api/concierge/proactive?locale=${encodeURIComponent(locale)}${cid ? `&cid=${encodeURIComponent(cid)}` : ''}`)
      .then((r) => r.json())
      .then((d) => { if (d && d.ok && d.greeting) setProactive({ greeting: d.greeting, chips: Array.isArray(d.chips) ? d.chips : [] }); })
      .catch(() => { /* keep the static opener */ });
  }, [open, locale]);

  useEffect(() => {
    setVoiceSupported(!!getSR());
    try { if (localStorage.getItem('cl_voiceout') === '1') setVoiceOut(true); } catch { /* ignore */ }
    // Unlock audio on the very first user interaction anywhere, so the neural voice
    // can play the reply in ANY language (not just English's browser-voice fallback).
    const unlock = () => { primeAudio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); window.removeEventListener('touchend', unlock); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchend', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchend', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  // Read the concierge's replies aloud when voice output is on.
  useEffect(() => {
    if (!voiceOut) return;
    const i = msgs.length - 1;
    const m = msgs[i];
    if (m && m.role === 'assistant' && !m.streaming && m.content && !spokenRef.current.has(i)) {
      spokenRef.current.add(i);
      speak(m.content, locale);
    }
  }, [msgs, voiceOut, locale]);

  function toggleVoiceOut() {
    const turningOn = !voiceOut;
    if (turningOn) primeAudio(); else stopSpeaking(); // unlock audio within this click
    setVoiceOut(turningOn);
    try { localStorage.setItem('cl_voiceout', turningOn ? '1' : '0'); } catch { /* ignore */ }
  }

  function toggleMic() {
    if (listening) { try { recRef.current?.stop(); } catch { /* ignore */ } return; }
    const SR = getSR(); if (!SR) return;
    stopSpeaking();
    const rec = new SR();
    rec.lang = SPEECH_LANG[locale] || 'en-GB';
    rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    let finalText = '';
    rec.onresult = (e: any) => {
      let interim = '';
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const tr = e.results[k][0].transcript;
        if (e.results[k].isFinal) finalText += tr; else interim += tr;
      }
      setInput((finalText + interim).slice(0, 400));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => { setListening(false); const text = finalText.trim(); if (text) send(text); };
    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

  // Anonymous, per-browser id for cross-session memory (guest can wipe it).
  useEffect(() => {
    try {
      let c = localStorage.getItem('cl_cid');
      if (!c) { c = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, ''); localStorage.setItem('cl_cid', c); }
      cidRef.current = c;
    } catch { cidRef.current = ''; }
  }, []);

  // On first open, fetch what we remember about this guest.
  useEffect(() => {
    if (!open || !cidRef.current || mem !== null) return;
    fetch(`/api/concierge/memory?cid=${encodeURIComponent(cidRef.current)}`)
      .then((r) => r.json()).then((d) => { if (d.has && d.profile) setMem(d.profile as MemoryProfile); else setMem({}); })
      .catch(() => setMem({}));
  }, [open, mem]);

  async function forgetMe() {
    try { await fetch(`/api/concierge/memory?cid=${encodeURIComponent(cidRef.current)}`, { method: 'DELETE' }); } catch { /* ignore */ }
    setMem({}); setMemOpen(false);
  }

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, status]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 350); }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (q.length < 2 || busy) return;
    stopSpeaking();
    if (voiceOut) primeAudio(); // Send is a user gesture — unlock audio for the reply
    setInput('');
    setReq(null);
    const history: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs([...history, { role: 'assistant', content: '', streaming: true }]);
    setBusy(true); setStatus(labels.searching);

    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, cid: cidRef.current || undefined, messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok || !res.body) throw new Error('bad');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let acc = '';
      const setLast = (patch: Partial<Msg>) => setMsgs((prev) => {
        const next = [...prev]; const i = next.length - 1;
        if (i >= 0 && next[i].role === 'assistant') next[i] = { ...next[i], ...patch };
        return next;
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          const raw = s.slice(5).trim(); if (!raw) continue;
          let evt: Record<string, unknown>; try { evt = JSON.parse(raw); } catch { continue; }
          if (evt.type === 'status') setStatus(evt.label === 'composing' ? labels.composing : labels.searching);
          else if (evt.type === 'delta') { acc += String(evt.text || ''); setStatus(''); setLast({ content: acc, streaming: true }); }
          else if (evt.type === 'meta') setLast({ picks: (evt.picks as Pick[]) || [], guides: (evt.guides as GuideLink[]) || [], canRoute: Boolean(evt.canRoute) });
          else if (evt.type === 'error') { if (!acc) setLast({ content: labels.error }); }
          else if (evt.type === 'done') setLast({ streaming: false });
        }
      }
      setLast({ streaming: false });
      if (!acc) setLast({ content: labels.error, streaming: false });
    } catch {
      setMsgs((prev) => { const n = [...prev]; const i = n.length - 1; if (i >= 0) n[i] = { role: 'assistant', content: labels.error }; return n; });
    } finally { setBusy(false); setStatus(''); }
  }

  async function sendRequest() {
    if (!req || req.state !== 'idle') return;
    setReq({ ...req, state: 'sending' });
    const lastA = [...msgs].reverse().find((m) => m.role === 'assistant');
    const lastU = [...msgs].reverse().find((m) => m.role === 'user');
    try {
      const res = await fetch('/api/concierge/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: lastU?.content || '', answer: lastA?.content || '', picks: lastA?.picks || [], guides: lastA?.guides || [], email: req.email, note: req.note, locale }),
      });
      const d = await res.json().catch(() => ({}));
      setReq({ ...req, state: d.ok ? 'sent' : 'idle' });
    } catch { setReq({ ...req, state: 'idle' }); }
  }

  const empty = msgs.length === 0;
  const hasMem = !!mem && Object.keys(mem).length > 0;
  const memFields: [string, string][] = mem ? ([
    ['name', mem.name], ['base', mem.base], ['party', mem.party], ['dates', mem.dates],
    ['interests', mem.interests?.length ? mem.interests.join(', ') : ''], ['dietary', mem.dietary], ['status', mem.status],
  ].filter((e) => e[1]) as [string, string][]) : [];

  return (
    <div dir={rtl ? 'rtl' : 'ltr'}>
      {!open && (
        <div className="cc-launch">
          <button type="button" className="cc-launch-tag" onClick={() => { primeAudio(); setOpen(true); }}>{LAUNCH[locale] || LAUNCH.en}</button>
          <button className="cc-bell" aria-label={LAUNCH[locale] || labels.open} onClick={() => { primeAudio(); setOpen(true); }}>
            <span className="cc-bell-halo" aria-hidden="true" />
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3.5a1.3 1.3 0 0 1 1.3 1.3v.7a5.7 5.7 0 0 1 4.4 5.55V15l1.3 1.8H5L6.3 15v-3.95A5.7 5.7 0 0 1 10.7 5.5v-.7A1.3 1.3 0 0 1 12 3.5Z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </button>
        </div>
      )}

      {open && (
        <div className="cc-scrim" onClick={() => setOpen(false)}>
          <section className="cc-panel" onClick={(e) => e.stopPropagation()} aria-label={labels.title}>
            <header className="cc-head">
              <span className="cc-head-t"><span className="cc-diamond" aria-hidden="true" />{labels.title}{isMember && <span className="cc-member">{labels.member}</span>}</span>
              <span className="cc-head-actions">
                <button className={`cc-ghost cc-voiceout${voiceOut ? ' on' : ''}`} aria-pressed={voiceOut} aria-label={labels.voice.readAloud} title={labels.voice.readAloud} onClick={toggleVoiceOut}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    {voiceOut ? <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18 6a8 8 0 0 1 0 12" /></> : <path d="m16 9 5 6M21 9l-5 6" />}
                  </svg>
                </button>
                {hasMem && <button className="cc-ghost cc-memtoggle" aria-label={labels.mem.title} title={labels.mem.title} onClick={() => setMemOpen((v) => !v)}>✦</button>}
                {msgs.length > 0 && <button className="cc-ghost" onClick={() => { setMsgs([]); setReq(null); spokenRef.current.clear(); stopSpeaking(); }}>{labels.newChat}</button>}
                <button className="cc-ghost cc-close" aria-label={labels.close} onClick={() => { stopSpeaking(); try { recRef.current?.stop(); } catch { /* ignore */ } setOpen(false); }}>✕</button>
              </span>
            </header>

            {memOpen && hasMem && (
              <div className="cc-mem">
                <div className="cc-mem-h">{labels.mem.title}</div>
                <div className="cc-mem-fields">
                  {memFields.map(([k, v]) => (
                    <div key={k} className="cc-mem-row"><span className="cc-mem-k">{labels.mem[k as keyof typeof labels.mem]}</span><span className="cc-mem-v">{v}</span></div>
                  ))}
                </div>
                <div className="cc-mem-foot">
                  <span className="cc-mem-note">{labels.mem.note}</span>
                  <button className="cc-mem-forget" onClick={forgetMe}>{labels.mem.forget}</button>
                </div>
              </div>
            )}

            <div className="cc-stream" ref={streamRef}>
              {empty && (
                <div className="cc-welcome">
                  {hasMem && !proactive && <p className="cc-wb">✦ {labels.mem.welcome}{mem?.name ? `, ${mem.name}` : ''}</p>}
                  <p className="cc-greeting">{proactive?.greeting || labels.greeting}</p>
                  <div className="cc-starters">
                    {(proactive?.chips?.length ? proactive.chips : labels.examples).map((ex) => (
                      <button key={ex} className="cc-starter" onClick={() => send(ex)}>{ex}</button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} className={`cc-msg cc-${m.role}`}>
                  {m.role === 'assistant' && <span className="cc-av" aria-hidden="true">✦</span>}
                  <div className="cc-msg-body">
                    <div className="cc-bubble">
                      {m.content}{m.streaming && <span className="cc-caret" aria-hidden="true" />}
                    </div>

                    {m.role === 'assistant' && !m.streaming && m.guides && m.guides.length > 0 && (
                      <div className="cc-guides">
                        <span className="cc-lbl">{labels.guidesTitle}</span>
                        <div className="cc-guide-row">
                          {m.guides.map((g) => <Link key={g.path} href={g.path} className="cc-guide" onClick={() => setOpen(false)}>{g.label} →</Link>)}
                        </div>
                      </div>
                    )}

                    {m.role === 'assistant' && !m.streaming && m.picks && m.picks.length > 0 && (
                      <>
                        <span className="cc-lbl cc-lbl-picks">{labels.picksTitle}</span>
                        <div className="cc-picks">
                          {m.picks.map((p) => (
                            <Link key={p.slug} href={`/directory/${p.type}/${p.slug}`} className="cc-pick" onClick={() => setOpen(false)}>
                              <span className="cc-pick-img"><CoverImage src={p.image} seed={p.slug} alt={p.name} className="ph-img" sizes="72px" fallbackKind="brand" /></span>
                              <span className="cc-pick-b">
                                <span className="cc-pick-meta"><span className="d" style={{ background: TYPE_DOT[p.type] || '#C9A24C' }} />{p.district || p.type}{p.rating != null ? <span className="cc-rate"> · ★ {p.rating.toFixed(1)}</span> : null}{p.verified ? <span className="cc-seal">✓</span> : null}</span>
                                <span className="cc-pick-name">{p.name}</span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}

                    {m.role === 'assistant' && !m.streaming && m.canRoute && i === msgs.length - 1 && (
                      req?.state === 'sent' ? (
                        <p className="cc-sent">✓ {labels.reqSent}</p>
                      ) : req ? (
                        <div className="cc-req">
                          <div className="cc-req-row">
                            <input className="cc-req-in" type="email" placeholder={labels.reqEmailPh} value={req.email} onChange={(e) => setReq({ ...req, email: e.target.value })} />
                            <button className="cc-req-go" onClick={sendRequest} disabled={req.state === 'sending'}>{req.state === 'sending' ? labels.reqSending : labels.reqSend}</button>
                          </div>
                          <input className="cc-req-in cc-req-note" placeholder={labels.reqNotePh} value={req.note} onChange={(e) => setReq({ ...req, note: e.target.value })} />
                          <p className="cc-trust">◆ {labels.trust} <Link href="/standards" onClick={() => setOpen(false)}>{labels.trustLink} →</Link></p>
                        </div>
                      ) : (
                        <div className="cc-actions">
                          <button className="cc-act" onClick={() => setReq({ email: '', note: '', state: 'idle' })}>{labels.arrange}</button>
                          <Link href="/contact" className="cc-act cc-act-2" onClick={() => setOpen(false)}>{labels.human}</Link>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}

              {status && <div className="cc-status"><span className="cc-dots"><i /><i /><i /></span>{status}</div>}
            </div>

            <form className="cc-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
              {voiceSupported && (
                <button type="button" className={`cc-mic${listening ? ' on' : ''}`} aria-label={labels.voice.speak} title={labels.voice.speak} onClick={toggleMic}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                </button>
              )}
              <textarea
                ref={inputRef} className="cc-input" rows={2} value={input}
                placeholder={listening ? labels.voice.listening : labels.placeholder} enterKeyHint="send"
                onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 168) + 'px'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              />
              <button className="cc-go" type="submit" disabled={busy || input.trim().length < 2} aria-label={labels.send}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={rtl ? 'M20 12H4M10 6l-6 6 6 6' : 'M4 12h16M14 6l6 6-6 6'} /></svg>
              </button>
            </form>
          </section>
        </div>
      )}

      <style>{`
        .cc-launch{position:fixed;inset-block-end:calc(22px + env(safe-area-inset-bottom,0px));inset-inline-end:22px;z-index:1200;display:flex;align-items:center;gap:10px}
        .cc-launch-tag{order:-1;font-family:var(--sans,'Jost',sans-serif);font-size:13.5px;font-weight:600;letter-spacing:.01em;color:#1C1710;
          background:var(--paper,#F3EDDF);border:1px solid rgba(201,162,76,.55);border-radius:999px;padding:9px 15px;cursor:pointer;white-space:nowrap;
          box-shadow:0 6px 20px rgba(11,14,17,.16);transition:transform .16s cubic-bezier(.2,0,0,1)}
        .cc-launch-tag:hover{transform:translateY(-1px);border-color:#C9A24C}
        @media (max-width:360px){.cc-launch-tag{font-size:12.5px;padding:8px 12px}}
        .cc-launch .cc-bell{position:static;inset:auto}
        .cc-bell{position:fixed;inset-block-end:calc(22px + env(safe-area-inset-bottom,0px));inset-inline-end:22px;z-index:1200;
          width:60px;height:60px;border-radius:50%;border:1px solid rgba(201,162,76,.55);cursor:pointer;
          background:radial-gradient(120% 120% at 30% 25%, #1f1a12, #0b0e11);color:#E9C978;display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 30px rgba(11,14,17,.34),0 1px 0 rgba(255,255,255,.06) inset}
        .cc-bell:hover{transform:translateY(-2px);color:#F1D592;transition:transform .16s cubic-bezier(.2,0,0,1)}
        .cc-bell-halo{position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(201,162,76,.4);animation:ccpulse 3.4s ease-out infinite}
        @keyframes ccpulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.25);opacity:0}100%{opacity:0}}
        @media (prefers-reduced-motion:reduce){.cc-bell-halo{animation:none}.cc-bell:hover{transform:none}}

        .cc-scrim{position:fixed;inset:0;z-index:1300;background:rgba(11,10,7,.34);backdrop-filter:blur(3px);
          display:flex;align-items:stretch;justify-content:flex-end;animation:ccfade .2s ease}
        @keyframes ccfade{from{opacity:0}to{opacity:1}}
        .cc-panel{width:min(520px,100%);height:100%;display:flex;flex-direction:column;background:var(--paper,#F3EDDF);
          border-inline-start:1px solid var(--line,#DDD2BB);box-shadow:-20px 0 60px rgba(11,10,7,.22);
          animation:ccslide .34s cubic-bezier(.2,0,0,1)}
        @keyframes ccslide{from{transform:translateX(var(--cc-from,24px));opacity:.4}to{transform:none;opacity:1}}
        [dir=rtl] .cc-panel{--cc-from:-24px}
        @media (prefers-reduced-motion:reduce){.cc-panel{animation:none}}
        @media (max-width:560px){.cc-scrim{align-items:stretch;justify-content:stretch}.cc-panel{width:100%}}

        .cc-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line,#DDD2BB);
          background:color-mix(in srgb, var(--paper,#F3EDDF) 82%, transparent);backdrop-filter:blur(6px)}
        .cc-head-t{font-family:var(--disp,'Playfair Display',serif);font-size:20px;color:var(--ink,#1C1710);display:flex;align-items:center;gap:9px}
        .cc-diamond{width:7px;height:7px;background:#C9A24C;transform:rotate(45deg);display:inline-block}
        .cc-member{margin-inline-start:8px;font-family:var(--sans,'Jost',sans-serif);font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a5b12;border:1px solid #C9A24C;border-radius:999px;padding:2px 8px;vertical-align:middle}
        .cc-head-actions{display:flex;align-items:center;gap:6px}
        .cc-ghost{background:none;border:0;color:var(--ink-soft,#6E6455);font-family:var(--sans,'Jost',sans-serif);font-size:12.5px;cursor:pointer;padding:6px 8px;border-radius:6px}
        .cc-ghost:hover{color:var(--ink,#1C1710);background:var(--paper-2,#EAE1CC)}
        .cc-close{font-size:15px}
        .cc-memtoggle{color:#8a5b12;font-size:14px}
        .cc-mem{padding:14px 18px;border-bottom:1px solid var(--line,#DDD2BB);background:var(--card-2,#F6F0E2)}
        .cc-mem-h{font-family:var(--sans,'Jost',sans-serif);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint,#938876);margin-bottom:10px}
        .cc-mem-fields{display:flex;flex-direction:column;gap:6px}
        .cc-mem-row{display:flex;gap:10px;align-items:baseline}
        .cc-mem-k{flex:none;width:88px;color:var(--ink-soft,#6E6455);font-family:var(--sans,'Jost',sans-serif);font-size:11px;letter-spacing:.04em;text-transform:uppercase}
        .cc-mem-v{color:var(--ink,#1C1710);font-family:var(--body,'Lora',serif);font-size:14.5px}
        .cc-mem-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}
        .cc-mem-note{font-family:var(--sans,'Jost',sans-serif);font-size:11px;color:var(--ink-faint,#938876);max-width:60%}
        .cc-mem-forget{font-family:var(--sans,'Jost',sans-serif);font-size:12.5px;color:#a3341f;background:none;border:1px solid var(--line,#DDD2BB);border-radius:999px;padding:5px 12px;cursor:pointer;white-space:nowrap}
        .cc-mem-forget:hover{border-color:#a3341f}
        .cc-wb{font-family:var(--sans,'Jost',sans-serif);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8a5b12;margin:0 0 12px}

        .cc-stream{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:16px}
        .cc-welcome{margin:auto 0}
        .cc-greeting{font-family:var(--disp,'Playfair Display',serif);font-size:22px;line-height:1.35;color:var(--ink,#1C1710);margin:0 0 18px;max-width:34ch}
        .cc-starters{display:flex;flex-direction:column;gap:9px;align-items:flex-start}
        .cc-starter{font-family:var(--body,'Lora',serif);font-size:15px;text-align:start;padding:11px 15px;border:1px solid var(--line,#DDD2BB);border-radius:12px;background:var(--card,#FBF7EE);color:var(--ink,#1C1710);cursor:pointer;width:100%}
        .cc-starter:hover{border-color:#C9A24C;background:var(--card-2,#F6F0E2)}

        .cc-msg{display:flex;gap:10px;align-items:flex-start}
        .cc-user{flex-direction:row-reverse}
        .cc-av{flex:none;width:26px;height:26px;border-radius:50%;background:radial-gradient(120% 120% at 30% 25%, #1f1a12, #0b0e11);color:#E9C978;display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:2px}
        .cc-msg-body{max-width:86%;min-width:0}
        .cc-user .cc-msg-body{display:flex;flex-direction:column;align-items:flex-end}
        .cc-bubble{font-family:var(--body,'Lora',serif);font-size:16px;line-height:1.6;color:var(--ink,#1C1710);white-space:pre-wrap;word-wrap:break-word}
        .cc-user .cc-bubble{background:var(--paper-2,#EAE1CC);border:1px solid var(--line,#DDD2BB);border-radius:14px;padding:10px 14px;font-size:15.5px}
        .cc-caret{display:inline-block;width:2px;height:1.05em;background:#C9A24C;margin-inline-start:2px;vertical-align:-2px;animation:ccblink 1s steps(2) infinite}
        @keyframes ccblink{50%{opacity:0}}

        .cc-lbl{font-family:var(--sans,'Jost',sans-serif);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint,#938876);display:block;margin:14px 0 8px}
        .cc-guide-row{display:flex;flex-wrap:wrap;gap:7px}
        .cc-guide{font-family:var(--body,'Lora',serif);font-size:13.5px;padding:6px 12px;border:1px solid var(--line,#DDD2BB);border-radius:999px;background:var(--card,#FBF7EE);color:#8a5b12;font-weight:600}
        .cc-guide:hover{border-color:#C9A24C;text-decoration:none}
        .cc-picks{display:flex;flex-direction:column;gap:8px}
        .cc-pick{display:flex;gap:11px;align-items:center;border:1px solid var(--line,#DDD2BB);border-radius:11px;background:var(--card,#FBF7EE);overflow:hidden;padding-inline-end:12px}
        .cc-pick:hover{border-color:#C9A24C;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.05)}
        .cc-pick-img{position:relative;width:64px;height:64px;flex:none;background:linear-gradient(135deg,#1c2b33,#0B0E11)}
        .cc-pick-img .ph-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .cc-pick-b{display:flex;flex-direction:column;gap:2px;min-width:0}
        .cc-pick-meta{font-family:var(--sans,'Jost',sans-serif);font-size:12px;color:var(--ink-soft,#6E6455);display:flex;align-items:center;gap:6px;text-transform:capitalize}
        .cc-pick-meta .d{width:7px;height:7px;border-radius:50%;flex:none}
        .cc-rate{color:#8a5b12;font-weight:600}
        .cc-seal{color:#2f6b2f;font-weight:700}
        .cc-pick-name{font-family:var(--disp,'Playfair Display',serif);font-size:16px;color:var(--ink,#1C1710);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        .cc-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
        .cc-act{font-family:var(--sans,'Jost',sans-serif);font-size:13.5px;font-weight:600;padding:8px 15px;border-radius:999px;border:1px solid #C9A24C;background:#C9A24C;color:#0b0e11;cursor:pointer}
        .cc-act:hover{background:#b8912f;text-decoration:none}
        .cc-act-2{background:transparent;color:var(--ink,#1C1710);border-color:var(--line,#DDD2BB)}
        .cc-act-2:hover{background:var(--paper-2,#EAE1CC)}
        .cc-req{margin-top:14px;border:1px solid var(--line,#DDD2BB);border-radius:12px;background:var(--card-2,#F6F0E2);padding:14px}
        .cc-req-row{display:flex;gap:8px}
        .cc-req-in{flex:1;min-width:0;font-family:var(--body,'Lora',serif);font-size:14.5px;padding:9px 12px;border:1px solid var(--line,#DDD2BB);border-radius:8px;background:var(--card,#fff);color:var(--ink,#1C1710)}
        .cc-req-in:focus{outline:none;border-color:#C9A24C}
        .cc-req-note{margin-top:8px;width:100%}
        .cc-req-go{white-space:nowrap;font-family:var(--sans,'Jost',sans-serif);font-weight:600;font-size:13.5px;padding:0 15px;border-radius:8px;border:1px solid #C9A24C;background:#C9A24C;color:#0b0e11;cursor:pointer}
        .cc-req-go:disabled{opacity:.6}
        .cc-sent{font-family:var(--body,'Lora',serif);color:#2f6b2f;margin:14px 0 0}
        .cc-trust{font-family:var(--sans,'Jost',sans-serif);font-size:11.5px;color:var(--ink-soft,#6E6455);margin:11px 0 0}
        .cc-trust a{color:#8a5b12;font-weight:600}

        .cc-status{display:flex;align-items:center;gap:9px;font-family:var(--sans,'Jost',sans-serif);font-size:13px;color:var(--ink-soft,#6E6455)}
        .cc-dots{display:inline-flex;gap:3px}
        .cc-dots i{width:5px;height:5px;border-radius:50%;background:#C9A24C;animation:ccb 1.1s infinite ease-in-out}
        .cc-dots i:nth-child(2){animation-delay:.15s}.cc-dots i:nth-child(3){animation-delay:.3s}
        @keyframes ccb{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}

        .cc-composer{display:flex;gap:9px;align-items:flex-end;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,#DDD2BB);
          background:color-mix(in srgb, var(--paper,#F3EDDF) 82%, transparent);backdrop-filter:blur(8px)}
        .cc-input{flex:1;resize:none;font-family:var(--body,'Lora',serif);font-size:16px;line-height:1.5;padding:12px 14px;border:1px solid var(--line,#DDD2BB);border-radius:14px;background:var(--card,#fff);color:var(--ink,#1C1710);min-height:52px;max-height:168px;overflow-y:auto}
        .cc-input:focus{outline:none;border-color:#C9A24C;box-shadow:0 0 0 3px rgba(201,162,76,.16)}
        .cc-go{flex:none;width:44px;height:44px;border-radius:50%;border:0;background:#C9A24C;color:#0b0e11;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .cc-go:hover{background:#b8912f}.cc-go:disabled{opacity:.45;cursor:default}
        .cc-voiceout{color:var(--ink-soft,#6E6455)}
        .cc-voiceout.on{color:#8a5b12}
        .cc-mic{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid var(--line,#DDD2BB);background:var(--card,#fff);color:var(--ink-soft,#6E6455);cursor:pointer;display:flex;align-items:center;justify-content:center}
        .cc-mic:hover{border-color:#C9A24C;color:var(--ink,#1C1710)}
        .cc-mic.on{background:#C9A24C;color:#0b0e11;border-color:#C9A24C;position:relative}
        .cc-mic.on::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(201,162,76,.5);animation:ccpulse 1.6s ease-out infinite}
        @media (prefers-reduced-motion:reduce){.cc-mic.on::after{animation:none}}
      `}</style>
    </div>
  );
}
