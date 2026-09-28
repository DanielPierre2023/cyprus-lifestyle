// lib/concierge/analytics.ts — roadmap item 02.
// Records every concierge turn with a coverage verdict, so we can prove the
// answer-coverage rate and mine the questions we couldn't fully answer. Cheap and
// best-effort: it never blocks or breaks a reply.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Multilingual "I don't fully know / I'll check" phrasing — a soft signal that the
// concierge deferred even when some data was present.
const DEFER_RX = /\b(don'?t have|do not have|couldn'?t find|could not find|not sure|no information|i'?ll (?:ask|check|find out)|our (?:desk|team) (?:will|can)|reach out to|check with|unable to)\b|δεν (?:έχω|βρήκα|γνωρίζω)|не (?:могу|нашл|распола)|nu (?:am|pot)|keine (?:informationen|angaben)|nie (?:mam|znalazł)|لا (?:أملك|أعرف)/i;

export type Coverage = { coverage: 'full' | 'partial' | 'deferred'; reason: 'ok' | 'thin' | 'no_data' };

// Heuristic verdict from retrieval facts + the answer text (no extra model call).
export function classifyCoverage(picks: number, kb: number, answer: string): Coverage {
  const grounded = (picks || 0) + (kb || 0);
  const deferred = DEFER_RX.test(answer || '');
  if (grounded === 0) return { coverage: 'deferred', reason: 'no_data' };
  if (deferred || grounded < 2 || (answer || '').trim().length < 40) return { coverage: 'partial', reason: 'thin' };
  return { coverage: 'full', reason: 'ok' };
}

export interface TurnLog {
  cid?: string | null; locale?: string; channel?: 'web' | 'whatsapp' | 'email' | 'request';
  question: string; answer: string; picks?: number; kb?: number; near?: boolean;
  recommended?: string[]; latencyMs?: number;
}

export async function logConciergeTurn(t: TurnLog): Promise<void> {
  try {
    const cov = classifyCoverage(t.picks || 0, t.kb || 0, t.answer || '');
    await supabaseAdmin().from('concierge_events').insert({
      cid: t.cid || null,
      locale: t.locale || null,
      channel: t.channel || 'web',
      question: (t.question || '').slice(0, 1000),
      answer_chars: (t.answer || '').length,
      picks: t.picks || 0,
      kb: t.kb || 0,
      near: !!t.near,
      coverage: cov.coverage,
      reason: cov.reason,
      recommended: (t.recommended || []).slice(0, 12),
      latency_ms: t.latencyMs ?? null,
    });
  } catch { /* analytics must never break a reply */ }
}

// Reader demand for the editorial planner: the questions people actually put to the
// concierge lately — the ones we answered poorly (deferred/partial) FIRST, then the
// most frequent. Distinct, trimmed, best-effort (never throws). Feeds
// PlannerSignals.demand so the newsroom writes what the audience is asking for.
export async function topReaderDemand(limit = 18, days = 45): Promise<string[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin()
      .from('concierge_events')
      .select('question, coverage')
      .gte('created_at', since)
      .not('question', 'is', null)
      .order('created_at', { ascending: false })
      .limit(600);
    if (error || !data) return [];
    const rows = data as { question: string | null; coverage: string | null }[];
    const agg = new Map<string, { q: string; count: number; unmet: boolean }>();
    for (const r of rows) {
      const q = (r.question || '').trim();
      if (q.length < 8) continue; // skip greetings / trivial turns
      const key = q.toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
      const unmet = r.coverage === 'deferred' || r.coverage === 'partial';
      const cur = agg.get(key);
      if (cur) { cur.count++; cur.unmet = cur.unmet || unmet; }
      else agg.set(key, { q: q.slice(0, 160), count: 1, unmet });
    }
    return [...agg.values()]
      .sort((a, b) => (Number(b.unmet) - Number(a.unmet)) || (b.count - a.count))
      .slice(0, limit)
      .map((x) => x.q);
  } catch {
    return [];
  }
}
