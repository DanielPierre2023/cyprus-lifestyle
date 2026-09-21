// Living-knowledge engine — Phase 3: events actualiser.
// Keeps the Agenda current two ways, on the same rotation:
//   • refreshAgenda()          — invokes the existing events-ingest edge function
//                                (real external listings, with posters, as drafts).
//   • mineEventsFromArticles() — lifts the concrete, dated events our OWN published
//                                culture articles describe INTO the agenda as drafts,
//                                each stamped with the article it came from — so a
//                                culture piece always has its event to link to.
// Everything lands as status='draft' for editorial approval in Admin → Agenda (with
// the existing translate-on-approve), exactly like the edge ingester. Nothing invented:
// an event is only added if the article states a real name AND a real future date.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';
import { slugify, canonDistrict } from '@/lib/scrape/developments';

export const CULTURE_CATEGORIES = ['culture', 'arts', 'events', 'event', 'music', 'festival', 'entertainment', 'nightlife'];

export interface EventsSummary {
  agenda_refreshed: boolean; articles_scanned: number; events_added: number;
  errors: { slug: string; error: string }[]; ran_ms: number;
}
interface RawEvent { name?: string; starts_at?: string; ends_at?: string | null; venue?: string | null; district?: string | null; price?: string | null; url?: string | null; summary?: string | null }

// Invoke the existing events-ingest edge function (real listings → draft events).
export async function refreshAgenda(opts?: { cities?: string; limit?: number; perCity?: number }): Promise<{ ok: boolean; status: number; skipped?: string }> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.ENRICH_SECRET;
  if (!base || !key) return { ok: false, status: 0, skipped: 'ENRICH_SECRET / SUPABASE_URL not set' };
  const cities = opts?.cities || 'limassol,nicosia,larnaca,paphos,ayia-napa';
  const url = `${base}/functions/v1/events-ingest?key=${encodeURIComponent(key)}&cities=${encodeURIComponent(cities)}&limit=${opts?.limit ?? 24}&perCity=${opts?.perCity ?? 6}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(55_000) });
    return { ok: res.ok, status: res.status };
  } catch (e) { return { ok: false, status: 0, skipped: (e as Error).message.slice(0, 120) }; }
}

// Validate + normalise a model-extracted event; returns null if it isn't a real,
// future, southern-Cyprus dated event.
export function normalizeEvent(e: RawEvent): { name: string; starts_at: string; ends_at: string | null; venue: string | null; district: string | null; price: string | null; url: string | null; summary: string | null } | null {
  const name = String(e.name || '').trim().slice(0, 200);
  if (name.length < 2) return null;
  const d = new Date(String(e.starts_at || ''));
  if (isNaN(d.getTime())) return null;                                  // must have a real date
  if (d.getTime() < Date.now() - 2 * 86_400_000) return null;          // must not be in the past
  if (d.getFullYear() > new Date().getFullYear() + 3) return null;     // guard against parse nonsense
  const ends = e.ends_at ? new Date(String(e.ends_at)) : null;
  return {
    name,
    starts_at: d.toISOString(),
    ends_at: ends && !isNaN(ends.getTime()) ? ends.toISOString() : null,
    venue: (e.venue || '').toString().trim().slice(0, 160) || null,
    district: canonDistrict(e.district) || canonDistrict(e.venue),
    price: (e.price || '').toString().trim().slice(0, 60) || null,
    url: e.url && /^https?:\/\//.test(String(e.url)) ? String(e.url) : null,
    summary: (e.summary || '').toString().trim().slice(0, 400) || null,
  };
}

async function extractEventsFromArticle(title: string, body: string): Promise<RawEvent[]> {
  if (body.trim().length < 120) return [];
  const { text, error } = await callClaude({
    systemInstruction: [
      `Extract concrete, DATED, upcoming events described in this Cyprus culture article. Only events with a REAL specific date (a day, or a clear date range) AND a name. Skip anything vague, past, or recurring-without-a-date.`,
      `Republic of Cyprus (south) only. Never invent a date, venue or price — leave a field null if the article doesn't state it.`,
      `For each: name, starts_at (ISO 8601, e.g. 2026-10-12 or 2026-10-12T20:00), ends_at (ISO or null), venue (or null), district (nicosia|limassol|larnaca|famagusta|paphos or null), price (free text or null), url (or null), summary (one factual sentence or null).`,
      `Return {"events":[ ... ]}, at most 8. If there are no concrete dated events, return {"events":[]}.`,
    ].join('\n'),
    userMessage: `TITLE: ${title}\n\nARTICLE:\n"""${body.slice(0, 9000)}"""`,
    model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 1500, fn: 'events-from-article',
  });
  if (error) throw new Error(error);
  const parsed = parseAiJson<{ events?: RawEvent[] }>(text);
  return Array.isArray(parsed.events) ? parsed.events : [];
}

// Lift events from our published culture articles into the agenda (as drafts).
export async function mineEventsFromArticles(sb: SupabaseClient, opts?: { limit?: number; deadlineMs?: number }): Promise<{ scanned: number; added: number; errors: { slug: string; error: string }[] }> {
  const deadline = Date.now() + (opts?.deadlineMs ?? 30_000);
  const { data } = await sb.from('blog_posts')
    .select('slug, title_en, rewritten_en, county')
    .eq('status', 'published').is('events_mined_at', null)
    .in('category', CULTURE_CATEGORIES)
    .order('published_at', { ascending: false }).limit(opts?.limit ?? 4);
  const arts = (data as { slug: string; title_en: string | null; rewritten_en: string | null; county: string | null }[] | null) || [];
  let added = 0, scanned = 0; const errors: { slug: string; error: string }[] = [];

  for (const art of arts) {
    if (Date.now() > deadline) break;
    scanned++;
    try {
      const raws = await extractEventsFromArticle(art.title_en || art.slug, art.rewritten_en || '');
      for (const raw of raws.slice(0, 8)) {
        const ev = normalizeEvent(raw);
        if (!ev) continue;
        const key = `article:${art.slug}:${slugify(ev.name)}`.slice(0, 160);
        const { data: exists } = await sb.from('events').select('id').eq('ingest_key', key).maybeSingle();
        if (exists) continue;
        const evSlug = `ev-${slugify(ev.name)}-${art.slug}`.slice(0, 80);
        const { error } = await sb.from('events').insert({
          slug: evSlug, ingest_key: key, source: 'article', article_slug: art.slug, source_url: `/article/${art.slug}`,
          district: ev.district || art.county, venue: ev.venue,
          title_en: ev.name, title_el: ev.name, title_ro: ev.name, title_ar: ev.name, title_de: ev.name, title_pl: ev.name, title_ru: ev.name,
          summary_en: ev.summary,
          starts_at: ev.starts_at, ends_at: ev.ends_at, price: ev.price, url: ev.url,
          status: 'draft',
        });
        if (!error) added++;
      }
      await sb.from('blog_posts').update({ events_mined_at: new Date().toISOString() }).eq('slug', art.slug);
    } catch (e) {
      errors.push({ slug: art.slug, error: (e as Error).message.slice(0, 160) });
      // Mark mined anyway so one bad article doesn't jam the rotation; a re-run is manual.
      try { await sb.from('blog_posts').update({ events_mined_at: new Date().toISOString() }).eq('slug', art.slug); } catch { /* best effort */ }
    }
  }
  return { scanned, added, errors };
}

export async function runEventsActualiser(sb: SupabaseClient, opts?: { deadlineMs?: number; refresh?: boolean; mine?: boolean; mineLimit?: number }): Promise<EventsSummary> {
  const t0 = Date.now();
  const summary: EventsSummary = { agenda_refreshed: false, articles_scanned: 0, events_added: 0, errors: [], ran_ms: 0 };
  if (opts?.refresh !== false) {
    const r = await refreshAgenda();
    summary.agenda_refreshed = r.ok;
    if (!r.ok && r.skipped) summary.errors.push({ slug: 'events-ingest', error: r.skipped });
  }
  if (opts?.mine !== false) {
    const remaining = (opts?.deadlineMs ?? 40_000) - (Date.now() - t0);
    const m = await mineEventsFromArticles(sb, { limit: opts?.mineLimit ?? 4, deadlineMs: Math.max(8_000, remaining) });
    summary.articles_scanned = m.scanned; summary.events_added = m.added; summary.errors.push(...m.errors);
  }
  summary.ran_ms = Date.now() - t0;
  return summary;
}
