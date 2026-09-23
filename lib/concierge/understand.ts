// lib/concierge/understand.ts
// ============================================================================
// LLM QUERY UNDERSTANDING (CI-3) — a cheap Haiku pass that reads a guest message in
// ANY of the seven languages and returns a structured interpretation the existing
// keyword engine already handles well: the district, a best-guess subtype, and 1–4
// ENGLISH category stems for the KIND of business wanted. This is what breaks the
// keyword whack-a-mole: instead of hand-coding a regex for every phrasing and every
// language, the model translates "mi si-a stricat aerul condiționat" or "у меня
// потёк бойлер" into English stems ("air conditioning", "boiler repair") that
// categoryProbes / readIntent already match — which is exactly why it lifts the
// weaker languages (EL/PL/RU) without touching the dictionaries.
//
// OPT-IN (cost): does nothing unless CONCIERGE_LLM_UNDERSTAND=1, and degrades to
// null on any error / missing key / timeout, so retrieval always falls back to the
// current keyword + semantic path unchanged. The pure helpers are unit-tested.
// ============================================================================
import 'server-only';
import { callClaude, CLAUDE_HAIKU, parseAiJson } from '@/lib/ai';

export interface Understanding {
  district: string | null;   // canonical: larnaca | limassol | paphos | nicosia | famagusta
  subtype: string | null;    // best-guess directory subtype slug (optional)
  keywords: string[];        // 1–4 English search stems for the business/place type
  luxury: boolean;
}

const DISTRICTS = ['larnaca', 'limassol', 'paphos', 'nicosia', 'famagusta'];

// Coerce a model JSON blob into a safe Understanding, or null when there's nothing
// useful (so the caller skips the extra search). Pure — unit-tested.
export function coerceUnderstanding(j: unknown): Understanding | null {
  if (!j || typeof j !== 'object') return null;
  const o = j as Record<string, unknown>;

  let district = typeof o.district === 'string' ? o.district.toLowerCase().trim() : null;
  if (!district || !DISTRICTS.includes(district)) district = null;

  const subtype = typeof o.subtype === 'string' && o.subtype.trim()
    ? o.subtype.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    : null;

  let raw: unknown[] = [];
  if (Array.isArray(o.keywords)) raw = o.keywords;
  else if (typeof o.keywords === 'string') raw = [o.keywords];
  const keywords = Array.from(new Set(
    raw.map((k) => String(k ?? '').toLowerCase().trim()).filter((k) => k.length >= 2 && k.length <= 40),
  )).slice(0, 4);

  const luxury = o.luxury === true || o.luxury === 'true';

  if (!district && !subtype && keywords.length === 0) return null;
  return { district, subtype: subtype || null, keywords, luxury };
}

// Fold the understanding into the original query so the EXISTING retrieval (readIntent,
// categoryProbes, term search, district filter) picks it up — English stems + district
// appended. Pure — unit-tested.
export function buildAugmentedQuery(original: string, u: Understanding | null): string {
  if (!u) return original;
  const extra: string[] = [...u.keywords];
  if (u.subtype) extra.push(u.subtype.replace(/-/g, ' '));
  if (u.district) extra.push(u.district);
  const add = extra.filter(Boolean).join(' ').trim();
  if (!add) return original;
  return `${original} ${add}`.slice(0, 400);
}

const SYSTEM =
  'You interpret one guest request for a luxury concierge in the Republic of Cyprus (the south; never Northern Cyprus). ' +
  'Return ONLY a JSON object: {"district":<one of larnaca|limassol|paphos|nicosia|famagusta, or null>,"subtype":<a short English directory category slug, or null>,"keywords":[1-4 short ENGLISH search terms for the KIND of business or place wanted],"luxury":<true|false>}. ' +
  'Translate from ANY language to English keywords. Keywords describe the business/place TYPE (e.g. "air conditioning repair", "seafood restaurant", "car rental"), never the town or the guest\'s words verbatim. ' +
  'If the guest names a town or village, map it to its district (e.g. Pyla/Oroklini→larnaca, Peyia/Geroskipou→paphos, Ypsonas→limassol, Lakatamia→nicosia, Ayia Napa/Paralimni→famagusta). If no place is named, district is null. ' +
  'luxury is true only when the guest clearly signals the high end (villa, yacht, VIP, five-star, fine dining, private, exclusive).';

// The live call. Opt-in and time-boxed; returns null on anything unexpected.
export async function understandQuery(text: string): Promise<Understanding | null> {
  const q = (text || '').trim();
  if (!q) return null;
  if (process.env.CONCIERGE_LLM_UNDERSTAND !== '1') return null; // opt-in — costs a Haiku call per turn
  try {
    const r = await callClaude({
      systemInstruction: SYSTEM,
      userMessage: q.slice(0, 600),
      model: CLAUDE_HAIKU,
      jsonMode: true,
      maxTokens: 200,
      timeoutMs: 3500,
      fn: 'concierge-understand',
    });
    if (r.error || !r.text) return null;
    return coerceUnderstanding(parseAiJson(r.text));
  } catch {
    return null;
  }
}
