// lib/concierge/embed.ts
// ============================================================================
// Embeddings for hybrid concierge retrieval (semantic recall on the KB).
// Reuses the OpenAI key the app already has (OPENAI_API_KEY). Everything here is
// OPTIONAL and non-breaking: if the key is absent or a call fails, callers get
// null/[] and the concierge falls back to keyword search (current behaviour).
// Model: text-embedding-3-small (1536 dims, multilingual-capable, cheap).
// ============================================================================
import 'server-only';

export const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
export const EMBED_DIM = 1536;
const URL = 'https://api.openai.com/v1/embeddings';

/** Embed one string. Returns null if unavailable (no key / error). */
export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  const input = (text || '').trim();
  if (!key || !input) return null;
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: input.slice(0, 8000) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const v = d?.data?.[0]?.embedding;
    return Array.isArray(v) ? (v as number[]) : null;
  } catch { return null; }
}

/** Embed many strings in one call. Returns a same-length array (null per miss). */
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !texts.length) return texts.map(() => null);
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts.map((t) => (t || '').slice(0, 8000)) }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return texts.map(() => null);
    const d = await res.json();
    const arr = d?.data;
    if (!Array.isArray(arr)) return texts.map(() => null);
    const out: (number[] | null)[] = texts.map(() => null);
    for (const item of arr) {
      if (typeof item?.index === 'number' && Array.isArray(item?.embedding)) out[item.index] = item.embedding as number[];
    }
    return out;
  } catch { return texts.map(() => null); }
}

export function hasEmbeddings(): boolean { return !!process.env.OPENAI_API_KEY; }
