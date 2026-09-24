// Cyprus Lifestyle — AI provider wrappers (Node/Vercel port of TT's _shared/claude.ts,
// gemini.ts + an OpenAI helper). Same interface across providers so the desk can
// route between them. Spend is logged to ai_spend_log (mirrors TT telemetry).
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ── models ──────────────────────────────────────────────────────────────────
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';
// Current production Sonnet. The former 'claude-sonnet-4-6' was never a real API
// model id — Anthropic rejected every call, which is why the concierge said "busy".
export const CLAUDE_SONNET = 'claude-sonnet-5';
export const OPENAI_MODEL = 'gpt-4o';
export const GEMINI_MODEL = 'gemini-2.5-flash';

export interface AiRequest {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
  timeoutMs?: number; // request abort deadline (default 120s); short for latency-sensitive calls
  webSearch?: boolean; // give Claude Anthropic's server-side web_search tool (live "what's in" research)
  maxSearches?: number; // cap web_search tool uses per call (default 5)
}
export interface AiResponse {
  text: string;
  error?: string;
  usd?: number;
  inputTokens?: number;
  outputTokens?: number;
}

// Rough per-1M-token USD prices for spend estimation (adjust as pricing changes).
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  [CLAUDE_HAIKU]: { in: 1.0, out: 5.0 },
  [CLAUDE_SONNET]: { in: 3.0, out: 15.0 },
  [OPENAI_MODEL]: { in: 2.5, out: 10.0 },
  [GEMINI_MODEL]: { in: 0.3, out: 2.5 },
};

// Markup on the raw provider cost. Default 25% (1.25x); change via the
// COST_MARKUP_PCT env var. Kept in step with the edge function so every
// ai_spend_log row, from either side, carries the same markup.
const COST_MARKUP_PCT = Number(process.env.COST_MARKUP_PCT || '25');
const COST_MULTIPLIER = 1 + (COST_MARKUP_PCT / 100);

// Raw provider cost (no markup). Callers apply COST_MULTIPLIER for the logged usd.
function estimateUsd(model: string, inTok: number, outTok: number): number {
  const p = PRICE_PER_MTOK[model] ?? { in: 2, out: 8 };
  return +(((inTok * p.in) + (outTok * p.out)) / 1_000_000).toFixed(6);
}

// ── spend logging (ai_spend_log) ──────────────────────────────────────────────
export async function logSpend(row: {
  provider: string; model: string; function_name: string;
  units?: number; unit_kind?: string; usd?: number; caller?: string; meta?: unknown;
}) {
  try {
    // provider/model are intentionally NOT persisted — every row is stored with a
    // neutral 'llm' so the spend log keeps no trace of which model was used.
    await supabaseAdmin().from('ai_spend_log').insert({
      provider: 'llm',
      model: 'llm',
      function_name: row.function_name,
      units: row.units ?? null,
      unit_kind: row.unit_kind ?? 'tokens',
      usd: row.usd ?? null,
      caller: row.caller ?? null,
      meta: row.meta ?? {},
    });
  } catch (e) {
    console.warn('[spend] log failed:', (e as Error).message);
  }
}

async function fetchWithRetry(url: string, init: RequestInit, attempt = 0): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429 && attempt < 3) {
    const delay = Math.pow(2, attempt) * 2000;
    console.warn(`[ai] 429 — retry in ${delay}ms (${attempt + 1}/3)`);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, init, attempt + 1);
  }
  return res;
}

// ── Claude (Anthropic) ─────────────────────────────────────────────────────────
export async function callClaude(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const {
    systemInstruction, userMessage, maxTokens = 4096,
    jsonMode = false, model = CLAUDE_HAIKU, fn = 'writer', timeoutMs = 120_000,
    webSearch = false, maxSearches = 5,
  } = req;
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return { text: '', error: 'CLAUDE_API_KEY not configured' };

  const system = jsonMode
    ? `${systemInstruction}\n\nCRITICAL: Respond with ONLY a valid JSON object. No markdown, no backticks, no preamble, no explanation. Start with { and end with }.`
    : systemInstruction;

  try {
    // NOTE: newer Claude models (sonnet-5 / opus-5) reject the `temperature` field
    // with a 400, so it is intentionally not sent.
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': apiKey },
      body: JSON.stringify({
        model, max_tokens: maxTokens, system,
        messages: [{ role: 'user', content: userMessage }],
        // Anthropic runs web_search server-side (searches, reads, then answers); we
        // extract only the final text blocks below, so the JSON contract still holds.
        ...(webSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches }] } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json();
    if (!res.ok) return { text: '', error: data.error?.message || 'Claude API error' };
    const text = (Array.isArray(data.content) ? data.content : [])
      .filter((b: { type?: string; text?: string }) => b?.type === 'text' && b.text)
      .map((b: { text?: string }) => b.text).join('') || '';
    const inTok = data.usage?.input_tokens ?? 0;
    const outTok = data.usage?.output_tokens ?? 0;
    const base = estimateUsd(model, inTok, outTok);
    const usd = +(base * COST_MULTIPLIER).toFixed(6); // raw provider cost + markup
    await logSpend({ provider: 'anthropic', model, function_name: fn, units: inTok + outTok, usd, meta: { in: inTok, out: outTok, base_usd: base, markup_pct: COST_MARKUP_PCT } });
    return { text, usd, inputTokens: inTok, outputTokens: outTok };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────────
export async function callOpenAI(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const {
    systemInstruction, userMessage, temperature = 0.7, maxTokens = 4096,
    jsonMode = false, model = OPENAI_MODEL, fn = 'writer',
  } = req;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: '', error: 'OPENAI_API_KEY not configured' };
  try {
    const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, temperature, max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    if (!res.ok) return { text: '', error: data.error?.message || 'OpenAI API error' };
    const text = data.choices?.[0]?.message?.content || '';
    const inTok = data.usage?.prompt_tokens ?? 0;
    const outTok = data.usage?.completion_tokens ?? 0;
    const base = estimateUsd(model, inTok, outTok);
    const usd = +(base * COST_MULTIPLIER).toFixed(6); // raw provider cost + markup
    await logSpend({ provider: 'openai', model, function_name: fn, units: inTok + outTok, usd, meta: { in: inTok, out: outTok, base_usd: base, markup_pct: COST_MARKUP_PCT } });
    return { text, usd, inputTokens: inTok, outputTokens: outTok };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// ── Gemini (Google) ─────────────────────────────────────────────────────────
export async function callGemini(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const {
    systemInstruction, userMessage, temperature = 0.7, maxTokens = 2000,
    jsonMode = false, model = GEMINI_MODEL, fn = 'research',
  } = req;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: '', error: 'GEMINI_API_KEY not configured' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    if (!res.ok) return { text: '', error: data.error?.message || 'Gemini API error' };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inTok = data.usageMetadata?.promptTokenCount ?? 0;
    const outTok = data.usageMetadata?.candidatesTokenCount ?? 0;
    const base = estimateUsd(model, inTok, outTok);
    const usd = +(base * COST_MULTIPLIER).toFixed(6); // raw provider cost + markup
    await logSpend({ provider: 'google', model, function_name: fn, units: inTok + outTok, usd, meta: { in: inTok, out: outTok, base_usd: base, markup_pct: COST_MARKUP_PCT } });
    return { text, usd, inputTokens: inTok, outputTokens: outTok };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// Safe JSON parser for model responses.
export function parseAiJson<T = Record<string, unknown>>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(cleaned) as T; } catch { /* fall through */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) as T; } catch { /* fall through */ }
  }
  return {} as T;
}
