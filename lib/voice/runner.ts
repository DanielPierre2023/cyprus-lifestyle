// lib/voice/runner.ts — the worker body: load the published editions, score them with the one judge, repair the next one that
// fails, save it with a rollback record, and update the state. Used by the cron route and the admin route.
//
// Consequences of the design:
//  • It only ever UPDATES the edition it repaired (content_xx / title_xx of one row); status, slug, other editions, covers and
//    publish dates are untouched. Because blog_posts has a revalidation webhook, the live page refreshes by itself.
//  • Before saving, the previous title and body are written to the admin audit log (changes.before), which is the rollback.
//  • A repair is saved only if the loop reports an improvement AND the facts guard passed (guaranteed inside reviseToStandard);
//    otherwise nothing is written and the attempt counts toward MAX_ATTEMPTS.
//  • Time: one edition per call, with a 45 s budget inside Vercel's 60 s.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude, CLAUDE_SONNET } from '@/lib/ai';
import { auditLog } from '@/lib/audit';
import { LOCALES } from '@/lib/locales';
import { deskFor, type Desk } from '@/lib/voice/desks';
import { scoreVoice, asLang } from '@/lib/voice/score';
import { reviseToStandard, type CallModel, type ReviseResult } from '@/lib/voice/revise';
import { MAX_SCORE } from '@/lib/voice/gate';
import { STATE_KEY, parseState, withDay, canRun, chooseNext, recordRun, unitKey, type Unit, type VoiceState } from '@/lib/voice/work';

export const EVERGREEN_AUTHOR = 'The Cyprus Lifestyle Desk';
type Row = Record<string, unknown>;

const COLS = ['id', 'slug', 'category', 'franchise', 'kind', 'author_name', 'source_lang', 'source_url', 'status',
  ...LOCALES.flatMap((l) => [`title_${l}`, `content_${l}`])].join(', ');

export async function loadState(sb: SupabaseClient): Promise<VoiceState> {
  const { data } = await sb.from('site_settings').select('value').eq('key', STATE_KEY).maybeSingle();
  return parseState(data?.value);
}
export async function saveState(sb: SupabaseClient, s: VoiceState): Promise<void> {
  await sb.from('site_settings').upsert({ key: STATE_KEY, value: s, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

export const deskOfRow = (r: Row): Desk => deskFor({
  category: r.category as string | null, franchise: r.franchise as string | null, kind: r.kind as string | null,
  evergreen: r.author_name === EVERGREEN_AUTHOR,
});

export async function loadPublished(sb: SupabaseClient, limit = 400): Promise<Row[]> {
  const { data, error } = await sb.from('blog_posts').select(COLS).eq('status', 'published').order('published_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as unknown as Row[];
}

export function unitsOf(rows: Row[]): Unit[] {
  const out: Unit[] = [];
  for (const r of rows) {
    const src = (LOCALES as readonly string[]).includes(String(r.source_lang)) ? String(r.source_lang) : 'en';
    const desk = deskOfRow(r);
    for (const l of LOCALES) {
      const body = String(r[`content_${l}`] || '');
      if (!body.trim()) continue;
      const rep = scoreVoice({ title: String(r[`title_${l}`] || ''), body, lang: l, desk });
      out.push({
        id: String(r.id), slug: String(r.slug), lang: l, isSource: l === src, score: rep.score,
        high: rep.tells.some((t) => t.severity === 'high'), ok: rep.score <= MAX_SCORE && !rep.tells.some((t) => t.severity === 'high'),
        desk, words: rep.metrics.words,
      });
    }
  }
  return out;
}

/** Expected max output tokens for rewriting a body (non-Latin scripts cost more tokens per character). */
export const maxTokensFor = (body: string, lang: string): number => {
  const perToken = ['ar', 'el', 'ru'].includes(lang) ? 2 : ['ro', 'pl', 'de'].includes(lang) ? 3 : 3.8;
  return Math.min(12_000, Math.ceil((body.length / perToken) * 1.5) + 600);
};

export const modelCaller = (lang: string, body: string): CallModel => async (system, user) => {
  const r = await callClaude({ systemInstruction: system, userMessage: user, model: CLAUDE_SONNET, jsonMode: true, maxTokens: maxTokensFor(body, lang), timeoutMs: 50_000, fn: 'voice-revise' });
  return { text: r.text, error: r.error };
};

export interface RunOptions { id?: string; lang?: string; dry?: boolean; force?: boolean; now?: Date; callModel?: (lang: string, body: string) => CallModel }
export interface RunSummary {
  ran: boolean; reason?: string;
  slug?: string; lang?: string; desk?: Desk;
  before?: number; after?: number; changed?: boolean; saved?: boolean; ok?: boolean; log?: string[];
  estimateUsd?: number;
}

export async function runVoiceOnce(sb: SupabaseClient, opts: RunOptions = {}): Promise<RunSummary> {
  const now = opts.now || new Date();
  let state = withDay(await loadState(sb), now);
  const explicit = !!(opts.id && opts.lang);
  const gate = canRun(state, now, !!opts.force || explicit || !!opts.dry);
  if (!gate.ok) return { ran: false, reason: gate.reason };

  const rows = await loadPublished(sb);
  const units = unitsOf(rows);
  const unit = explicit ? units.find((u) => u.id === opts.id && u.lang === opts.lang) || null : chooseNext(units, state, now);
  if (!unit) return { ran: false, reason: explicit ? 'That edition was not found or has no text.' : 'Nothing to repair: every edition passes, or has used its attempts.' };
  const row = rows.find((r) => String(r.id) === unit.id) as Row;
  const body = String(row[`content_${unit.lang}`] || '');
  const title = String(row[`title_${unit.lang}`] || '');
  const lang = asLang(unit.lang);

  if (opts.dry) {
    const rep = scoreVoice({ title, body, lang, desk: unit.desk });
    const approxIn = 4200 + body.length / 3, approxOut = body.length / 3;
    return { ran: false, reason: 'dry run', slug: unit.slug, lang: unit.lang, desk: unit.desk, before: rep.score, estimateUsd: +(((approxIn * 3 + approxOut * 15) / 1e6) * 1.25).toFixed(3), log: rep.tells.slice(0, 8).map((t) => `${t.severity}: ${t.label}${t.count > 1 ? ` ×${t.count}` : ''}`) };
  }

  const make = opts.callModel || modelCaller;
  const res: ReviseResult = await reviseToStandard({ title, body, lang, desk: unit.desk, callModel: make(unit.lang, body), maxPasses: 2, budgetMs: 45_000 });
  const improved = res.changed && res.after.score < res.before.score && res.facts?.ok !== false;
  let saved = false;
  if (improved) {
    const upd: Record<string, unknown> = { [`content_${unit.lang}`]: res.body, updated_at: now.toISOString() };
    if (res.title && res.title !== title) upd[`title_${unit.lang}`] = res.title;
    const { error } = await sb.from('blog_posts').update(upd).eq('id', unit.id);
    if (!error) {
      saved = true;
      await auditLog(sb, { action: 'voice.repair', table: 'blog_posts', rowId: unit.id, summary: `${unit.slug} [${unit.lang}] voice ${res.before.score} → ${res.after.score}`, changes: { lang: unit.lang, before: { title, body }, after: { title: res.title }, scoreBefore: res.before.score, scoreAfter: res.after.score } });
    } else res.log.push(`save failed: ${error.message}`);
  }
  const paid = res.passes > 0;
  state = recordRun(state, unit, { ok: res.verdict.voiceOk, before: res.before.score, after: res.after.score, changed: saved, note: res.log[res.log.length - 1] || '' }, now, paid);
  await saveState(sb, state);
  return { ran: true, slug: unit.slug, lang: unit.lang, desk: unit.desk, before: res.before.score, after: res.after.score, changed: res.changed, saved, ok: res.verdict.voiceOk, log: res.log };
}

export { unitKey };
