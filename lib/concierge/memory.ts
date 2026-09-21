// lib/concierge/memory.ts
// ============================================================================
// CONCIERGE CROSS-SESSION MEMORY (privacy-first)
// ----------------------------------------------------------------------------
// A small, visible, clearable profile of what a guest has volunteered — so the
// concierge can welcome them back and pick up where they left off. Keyed by an
// anonymous browser id (cid). Only stores trip/preference facts the guest
// actually stated; never sensitive data. The guest can view and wipe it from
// the concierge's memory drawer.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';

export interface MemoryProfile {
  name?: string;
  language?: string;
  interests?: string[];
  base?: string;      // town they're visiting / based in
  party?: string;     // "2 adults + 2 children"
  dates?: string;     // "12–16 May"
  dietary?: string;   // "vegetarian"
  status?: string;    // visiting | relocating | resident
  notes?: string;     // one short line
  // Premium preference fields — what makes a returning subscriber's concierge feel
  // like it knows them (property buyers, relocators, investors).
  goals?: string;     // visiting | buying property | relocating | investing
  budget?: string;    // "€250k–350k" / "up to €4,000/mo"
  districts?: string[]; // districts of interest: larnaca, limassol, …
  buyer_type?: string;  // eu | non-eu (drives residency & property-permit guidance)
}

const STR_KEYS: (keyof MemoryProfile)[] = ['name', 'language', 'base', 'party', 'dates', 'dietary', 'status', 'notes', 'goals', 'budget', 'buyer_type'];
const ARR_KEYS: (keyof MemoryProfile)[] = ['interests', 'districts'];

export function sanitizeProfile(input: unknown): MemoryProfile {
  const o = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
  const p: MemoryProfile = {};
  for (const k of STR_KEYS) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) (p as Record<string, string>)[k] = v.trim().slice(0, 120);
  }
  for (const k of ARR_KEYS) {
    if (Array.isArray(o[k])) {
      const arr = (o[k] as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
      if (arr.length) (p as Record<string, string[]>)[k] = arr;
    }
  }
  return p;
}

export function isProfileEmpty(p: MemoryProfile): boolean {
  return !p || Object.keys(p).length === 0;
}

const CID_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const isValidCid = (cid: string) => CID_RE.test(cid);

export async function loadMemory(cid: string): Promise<MemoryProfile> {
  if (!isValidCid(cid)) return {};
  try {
    const { data } = await supabaseAdmin().from('concierge_memory').select('profile').eq('cid', cid).maybeSingle();
    return sanitizeProfile(data?.profile);
  } catch { return {}; }
}

export async function saveMemory(cid: string, profile: MemoryProfile): Promise<void> {
  if (!isValidCid(cid)) return;
  try {
    await supabaseAdmin().from('concierge_memory').upsert({ cid, profile, updated_at: new Date().toISOString() });
  } catch { /* best-effort */ }
}

export async function clearMemory(cid: string): Promise<void> {
  if (!isValidCid(cid)) return;
  try { await supabaseAdmin().from('concierge_memory').delete().eq('cid', cid); } catch { /* ignore */ }
}

// Render the profile into a grounding block for the concierge system prompt.
export function renderMemory(p: MemoryProfile): string {
  if (isProfileEmpty(p)) return '';
  const bits: string[] = [];
  if (p.name) bits.push(`name: ${p.name}`);
  if (p.status) bits.push(`status: ${p.status}`);
  if (p.goals) bits.push(`goal: ${p.goals}`);
  if (p.base) bits.push(`based in / visiting: ${p.base}`);
  if (p.districts?.length) bits.push(`districts of interest: ${p.districts.join(', ')}`);
  if (p.budget) bits.push(`budget: ${p.budget}`);
  if (p.buyer_type) bits.push(`buyer type: ${p.buyer_type} (EU vs non-EU affects property permit & residency)`);
  if (p.party) bits.push(`party: ${p.party}`);
  if (p.dates) bits.push(`travel dates: ${p.dates}`);
  if (p.interests?.length) bits.push(`interests: ${p.interests.join(', ')}`);
  if (p.dietary) bits.push(`dietary: ${p.dietary}`);
  if (p.notes) bits.push(`note: ${p.notes}`);
  return (
    '\n\nGUEST MEMORY — things this guest has told you before (use naturally; never recite it back verbatim, never assume beyond it): ' +
    bits.join('; ') + '. ' +
    'If they return or greet you, welcome them back warmly and briefly, referencing only what is relevant.'
  );
}

// Update the profile from the latest exchange (cheap model, JSON out, merge).
export async function updateMemory(cid: string, userText: string, assistantText: string, current: MemoryProfile): Promise<void> {
  if (!isValidCid(cid) || !userText) return;
  const system =
    'You maintain a concise concierge memory of a guest, built ONLY from what the guest volunteers. ' +
    'Given the current memory (JSON) and the latest exchange, return the UPDATED memory as a JSON object. ' +
    'Allowed keys only: name, language, interests (array of short tags), base (town they are visiting or based in), party (e.g. "2 adults + 2 children"), dates, dietary, status (one of: visiting, relocating, resident), notes (one short line), goals (what they want here, e.g. "buying property", "relocating", "investing", "visiting"), budget (short, as they stated it, e.g. "€250k–350k"), districts (array of Cyprus districts of interest), buyer_type (only "eu" or "non-eu", and only if they clearly indicate it). ' +
    'Merge: keep existing facts unless the guest changes them; add new facts the guest stated. Do NOT invent anything the guest did not say. Do NOT store sensitive data (health, payments, ID numbers, exact addresses). Keep every value short, and keep values in the guest’s own language where natural (town names, interests as they said them). ' +
    'If nothing new was volunteered, return the current memory unchanged. Return ONLY the JSON object.';
  const user =
    `CURRENT MEMORY:\n${JSON.stringify(current || {})}\n\n` +
    `LATEST EXCHANGE:\nGuest: ${userText.slice(0, 800)}\nConcierge: ${assistantText.slice(0, 800)}\n\n` +
    'Return the updated memory JSON.';
  try {
    const res = await callClaude({ systemInstruction: system, userMessage: user, model: CLAUDE_HAIKU, jsonMode: true, maxTokens: 400, temperature: 0, fn: 'concierge-memory' });
    if (!res.text) return;
    const parsed = JSON.parse(res.text);
    const merged = sanitizeProfile({ ...current, ...parsed });
    await saveMemory(cid, merged);
  } catch { /* extraction is best-effort; never breaks the chat */ }
}
