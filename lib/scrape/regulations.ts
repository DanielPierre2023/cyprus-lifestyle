// Living-knowledge engine — Phase 2: regulation watch.
// Watches the official Republic-of-Cyprus pages that govern the advice the concierge
// gives (company setup, tax & VAT, premises/planning/building permits, employment &
// social insurance, funding, exit). For each due source we fetch the page, compare it
// to the last stored snapshot, and when it MATERIALLY changes we write a reviewable
// alert with an AI "what changed" summary + severity. We never silently rewrite the
// knowledge base — legal/financial answers stay human-gated; the watch just makes
// sure a human is told the moment the law moves. Reuses scrape_sources + the shared
// http helpers; content-hash change-detection keeps the daily rotation cheap.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';
import { fetchText, stripHtml, sha256, robotsAllows } from '@/lib/scrape/http';

// Curated from the official URLs ALREADY cited in our knowledge base — validated,
// never invented. The admin can add more sources (e.g. migration, land registry)
// in the registry once their URLs are confirmed.
export const REGULATION_SOURCES: { url: string; name: string; cadence_days: number }[] = [
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/plan-your-business/', name: 'Plan your business', cadence_days: 14 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/start-your-business/', name: 'Start your business', cadence_days: 14 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/start-your-business/registering-for-income-tax-and-value-added-tax/', name: 'Income tax & VAT registration', cadence_days: 14 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/start-your-business/business-premises/', name: 'Business premises licence', cadence_days: 21 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/start-your-business/planning-permission/', name: 'Planning permission', cadence_days: 21 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/start-your-business/building-permission/', name: 'Building permission', cadence_days: 21 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/running-and-growing-your-business/', name: 'Running & growing (employment, social insurance)', cadence_days: 14 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/getting-your-business-funded/', name: 'Business funding & grants', cadence_days: 21 },
  { url: 'https://www.businessincyprus.gov.cy/doing-business-in-cyprus/exit-strategies/', name: 'Exit strategies', cadence_days: 30 },
];

interface RegSource { id: string; url: string; name: string | null; content_hash: string | null; cadence_days: number; last_fetched_at: string | null }
export interface RegSummary { considered: number; changed: number; unchanged: number; baselined: number; alerts: number; errors: { url: string; error: string }[]; ran_ms: number }
const SEVERITIES = ['info', 'minor', 'major'];

export async function seedRegulationSources(sb: SupabaseClient): Promise<number> {
  let added = 0;
  for (const s of REGULATION_SOURCES) {
    const { error } = await sb.from('scrape_sources').insert({ category: 'regulation', url: s.url, name: s.name, cadence_days: s.cadence_days });
    if (!error) added++; // unique(category,url) → re-seeding is idempotent
  }
  return added;
}

// Compare old vs new official-page text and describe, precisely and soberly, what
// materially changed for a business owner / buyer / newcomer. No speculation.
export async function summarizeRegChange(name: string, oldText: string, newText: string): Promise<{ title: string; summary: string; severity: string }> {
  const { text, error } = await callClaude({
    systemInstruction: [
      `You compare two versions of an official Republic of Cyprus government page ("${name}") and report what MATERIALLY changed for someone doing business, buying property, employing staff, or moving to Cyprus.`,
      `Focus on substance: figures (rates, thresholds, fees, minimum wage), rules, required documents, procedures, deadlines, eligibility. IGNORE navigation, menus, cookie notices, boilerplate and re-wording that doesn't change meaning.`,
      `If nothing material changed, set severity "info" and say so plainly.`,
      `severity: "major" = a figure/rule/procedure changed; "minor" = small clarification or added detail; "info" = no material change.`,
      `Return JSON {"title": "<=8 words", "summary": "2-4 sentences, concrete, cite the changed figure/rule", "severity": "info|minor|major"}.`,
    ].join('\n'),
    userMessage: `PREVIOUS VERSION:\n"""${oldText.slice(0, 7000)}"""\n\nNEW VERSION:\n"""${newText.slice(0, 7000)}"""`,
    model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 700, fn: 'regulation-diff',
  });
  if (error) return { title: `${name} changed`, summary: 'The official page changed; automatic summary unavailable — please review the source.', severity: 'minor' };
  const j = parseAiJson<{ title?: string; summary?: string; severity?: string }>(text);
  const severity = SEVERITIES.includes(String(j.severity)) ? String(j.severity) : 'minor';
  return {
    title: (j.title || `${name} changed`).slice(0, 120),
    summary: (j.summary || 'The official page changed — please review the source.').slice(0, 1200),
    severity,
  };
}

export async function runRegulationWatch(
  sb: SupabaseClient,
  opts?: { deadlineMs?: number; maxSources?: number; force?: boolean },
): Promise<RegSummary> {
  const t0 = Date.now();
  const deadline = t0 + (opts?.deadlineMs ?? 20_000);
  const maxSources = opts?.maxSources ?? 3;
  const summary: RegSummary = { considered: 0, changed: 0, unchanged: 0, baselined: 0, alerts: 0, errors: [], ran_ms: 0 };
  const robotsCache = new Map<string, string>();

  const { data } = await sb.from('scrape_sources')
    .select('id, url, name, content_hash, cadence_days, last_fetched_at')
    .eq('category', 'regulation').eq('enabled', true)
    .order('last_fetched_at', { ascending: true, nullsFirst: true })
    .limit(maxSources * 3);
  const now = Date.now();
  const due = ((data as RegSource[] | null) || []).filter((s) =>
    opts?.force || !s.last_fetched_at || (now - new Date(s.last_fetched_at).getTime()) >= s.cadence_days * 86_400_000
  ).slice(0, maxSources);

  for (const src of due) {
    if (Date.now() > deadline) break;
    summary.considered++;
    try {
      if (!(await robotsAllows(src.url, robotsCache))) { await mark(sb, src.id, { status: 'disabled', last_error: 'robots.txt disallows' }); continue; }
      const res = await fetchText(src.url, 14000);
      if (!res.ok) { await mark(sb, src.id, { status: 'error', last_error: `fetch ${res.status}` }); summary.errors.push({ url: src.url, error: `fetch ${res.status}` }); continue; }
      const text = stripHtml(res.html).slice(0, 12000);
      if (text.length < 120) { await mark(sb, src.id, { status: 'error', last_error: 'empty/blocked page' }); summary.errors.push({ url: src.url, error: 'empty page' }); continue; }
      const hash = sha256(text);
      const nowIso = new Date().toISOString();

      const { data: snap } = await sb.from('regulation_snapshots').select('text, hash').eq('source_id', src.id).maybeSingle();
      const prev = snap as { text: string | null; hash: string | null } | null;

      if (!prev) {
        // Baseline — record it, no alert (nothing to compare against yet).
        await sb.from('regulation_snapshots').upsert({ source_id: src.id, text, hash, fetched_at: nowIso });
        await mark(sb, src.id, { last_fetched_at: nowIso, content_hash: hash, status: 'active', last_error: null });
        summary.baselined++;
        continue;
      }
      if (!opts?.force && prev.hash === hash) {
        await mark(sb, src.id, { last_fetched_at: nowIso, status: 'active', last_error: null });
        summary.unchanged++;
        continue;
      }
      // Changed → summarise and raise an alert for review.
      const change = await summarizeRegChange(src.name || src.url, prev.text || '', text);
      await sb.from('regulation_alerts').insert({
        source_id: src.id, url: src.url, title: change.title, summary: change.summary, severity: change.severity,
      });
      await sb.from('regulation_snapshots').upsert({ source_id: src.id, text, hash, fetched_at: nowIso });
      await mark(sb, src.id, { last_fetched_at: nowIso, content_hash: hash, status: 'active', last_error: null });
      summary.changed++; summary.alerts++;
    } catch (e) {
      const msg = (e as Error).message.slice(0, 200);
      summary.errors.push({ url: src.url, error: msg });
      await mark(sb, src.id, { status: 'error', last_error: msg, last_fetched_at: new Date().toISOString() });
    }
  }
  summary.ran_ms = Date.now() - t0;
  return summary;
}

async function mark(sb: SupabaseClient, id: string, patch: Record<string, unknown>) {
  try { await sb.from('scrape_sources').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id); } catch { /* best effort */ }
}
