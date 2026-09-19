// POST /api/concierge/tts  { text, locale? }  → audio/mpeg
// A premium neural voice for the concierge's read-aloud, using the OpenAI TTS API
// (the OPENAI_API_KEY the app already has). OpenAI's voices are warm and genuinely
// multilingual (real Romanian, Greek, Arabic, etc.), unlike the robotic browser
// voice. If this is unavailable the client falls back to the browser voice, so
// nothing breaks. Voice/model are overridable via env.
import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// tts-1-hd is high-quality and stable; 'nova' is a warm, refined female voice that
// suits a luxury concierge. Override with OPENAI_TTS_MODEL / OPENAI_TTS_VOICE.
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1-hd';
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || 'nova';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'concierge-tts', 40, 60))) {
    return new Response(JSON.stringify({ error: 'busy' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: 'tts_unconfigured' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
  if (text.length < 1) return new Response(JSON.stringify({ error: 'empty' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: text, response_format: 'mp3' }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'tts_failed', detail: detail.slice(0, 200) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    // Stream the mp3 straight back to the browser.
    return new Response(res.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
