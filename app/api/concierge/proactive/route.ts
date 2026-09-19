// GET /api/concierge/proactive?locale=&cid=
// The proactive opener: a warm, timely greeting + 3 contextual suggestions,
// grounded on the season, sea temperature, what's on this week, and the guest's
// memory. Phrased by a cheap model in the visitor's language. If anything is
// unavailable, returns ok:false and the panel shows its static greeting.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';
import { CLIMATE } from '@/lib/knowledge/cyprus';
import { loadMemory, isValidCid, isProfileEmpty, type MemoryProfile } from '@/lib/concierge/memory';
import { isConciergeLocale } from '@/lib/concierge/brain';

export const runtime = 'nodejs';
export const maxDuration = 30;

const LANG: Record<string, string> = { en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian' };

const SEASON: Record<string, string> = {
  yes: "beach-and-sea season — the water is warm enough to swim",
  shoulder: "shoulder season — pleasant and quieter, still swimmable on warm days",
  no: "the mild, green season — made for villages, wine and the mountains rather than the beach",
};

async function upcomingEvents(locale: string): Promise<string[]> {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const cols: string = `slug, starts_at, title_${locale}, title_en`;
    const { data } = await supabaseAdmin().from('events')
      .select(cols)
      .eq('status', 'published').gte('starts_at', start.toISOString())
      .order('starts_at', { ascending: true }).limit(2);
    return ((data || []) as unknown as Record<string, unknown>[]).map((r) => {
      const title = String(r[`title_${locale}`] || r.title_en || '').trim();
      const when = r.starts_at ? new Date(String(r.starts_at)).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : '';
      return title ? `${title}${when ? ` (${when})` : ''}` : '';
    }).filter(Boolean);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const locale = isConciergeLocale(String(req.nextUrl.searchParams.get('locale') || '')) ? String(req.nextUrl.searchParams.get('locale')) : 'en';
  if (!(await rateLimit(req, 'concierge-proactive', 20, 60))) return NextResponse.json({ ok: false });
  if (!process.env.CLAUDE_API_KEY) return NextResponse.json({ ok: false });

  const cid = String(req.nextUrl.searchParams.get('cid') || '');
  const now = new Date();
  const clim = CLIMATE[now.getMonth()];
  const monthName = now.toLocaleString(locale, { month: 'long' });
  const season = SEASON[clim.swim] || SEASON.shoulder;

  const [events, profile] = await Promise.all([
    upcomingEvents(locale),
    isValidCid(cid) ? loadMemory(cid) : Promise.resolve({} as MemoryProfile),
  ]);

  const memBits: string[] = [];
  if (profile.name) memBits.push(`name ${profile.name}`);
  if (profile.base) memBits.push(`based in/visiting ${profile.base}`);
  if (profile.party) memBits.push(`party ${profile.party}`);
  if (profile.dates) memBits.push(`dates ${profile.dates}`);
  if (profile.interests?.length) memBits.push(`interests ${profile.interests.join(', ')}`);
  if (profile.status) memBits.push(`status ${profile.status}`);

  const context =
    `Today: ${now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}.\n` +
    `Season: it is ${monthName}, ${season}. Sea about ${clim.sea}°C, daytime around ${clim.airHigh}°C.\n` +
    (events.length ? `On soon: ${events.join('; ')}.\n` : 'No specific events to mention.\n') +
    (memBits.length && !isProfileEmpty(profile) ? `Returning guest — remembered: ${memBits.join('; ')}.\n` : 'New guest, nothing remembered.\n');

  const system =
    'You are the concierge for Cyprus Lifestyle, a luxury guide to the Republic of Cyprus (south only). ' +
    'Write a warm, elegant, PROACTIVE opening that anticipates what the guest might enjoy right now, and three short tappable suggestions. ' +
    'Ground strictly on the CONTEXT — never invent an event, place or price. If it is a returning guest, welcome them back briefly and reference what is relevant. ' +
    `Reply in ${LANG[locale] || 'English'}. Return ONLY JSON: {"greeting": string (one warm sentence, max ~24 words), "chips": [three strings, each max ~6 words, phrased as things the guest could tap to ask]}.`;

  try {
    const res = await callClaude({ systemInstruction: system, userMessage: `CONTEXT:\n${context}`, model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 320, temperature: 0.6, fn: 'concierge-proactive' });
    if (!res.text) return NextResponse.json({ ok: false });
    const parsed = JSON.parse(res.text);
    const greeting = typeof parsed.greeting === 'string' ? parsed.greeting.trim() : '';
    const chips = Array.isArray(parsed.chips) ? parsed.chips.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 3) : [];
    if (!greeting || chips.length < 2) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, greeting, chips });
  } catch { return NextResponse.json({ ok: false }); }
}
