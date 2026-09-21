// lib/concierge/subscriber.ts
// ============================================================================
// SUBSCRIBER PERSONALIZATION (Phase 4)
// Anonymous guests keep a per-browser memory (concierge_memory, keyed by cid).
// A recognised MEMBER additionally has a durable preference profile stored on
// concierge_members.profile — so what the concierge learns follows them across
// devices and sessions, not just one browser. This module composes the two:
// load the member profile as the base, overlay the latest per-browser memory, and
// sync anything newly learned back to the member. Still built only from what the
// member volunteers; still fully clearable.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadMemory, clearMemory, sanitizeProfile, isProfileEmpty, isValidCid, type MemoryProfile } from '@/lib/concierge/memory';

const ARR_KEYS: (keyof MemoryProfile)[] = ['interests', 'districts'];

// Pure: base (durable member profile) + overlay (latest browser memory). String
// fields: the overlay (most recent) wins; array fields (interests, districts) are
// unioned so durable preferences aren't lost when a session doesn't restate them.
export function mergeProfiles(base: MemoryProfile, overlay: MemoryProfile): MemoryProfile {
  const b = sanitizeProfile(base), o = sanitizeProfile(overlay);
  const out: Record<string, unknown> = { ...b, ...o };
  for (const k of ARR_KEYS) {
    const merged = Array.from(new Set([...((b[k] as string[]) || []), ...((o[k] as string[]) || [])])).slice(0, 8);
    if (merged.length) out[k] = merged; else delete out[k];
  }
  return sanitizeProfile(out);
}

interface MemberRow { id: string; email: string | null; profile: MemoryProfile }
export async function getMemberByCid(cid: string): Promise<MemberRow | null> {
  if (!isValidCid(cid)) return null;
  try {
    const { data } = await supabaseAdmin().from('concierge_members')
      .select('id, email, profile').eq('cid', cid).eq('status', 'active').limit(1).maybeSingle();
    if (!data) return null;
    return { id: String(data.id), email: (data.email as string) ?? null, profile: sanitizeProfile(data.profile) };
  } catch { return null; }
}

// The profile the concierge should personalise with: durable member profile (if any)
// overlaid with this browser's latest memory.
export async function loadProfileForCid(cid: string): Promise<MemoryProfile> {
  if (!isValidCid(cid)) return {};
  const [browser, member] = await Promise.all([loadMemory(cid), getMemberByCid(cid)]);
  return member ? mergeProfiles(member.profile, browser) : browser;
}

// After a turn's memory update, fold what we now know into the member's durable
// profile so it follows them to their next device/session. No-op for non-members.
export async function syncMemberProfile(cid: string): Promise<void> {
  if (!isValidCid(cid)) return;
  const member = await getMemberByCid(cid);
  if (!member) return;
  const merged = mergeProfiles(member.profile, await loadMemory(cid));
  if (isProfileEmpty(merged)) return;
  try {
    await supabaseAdmin().from('concierge_members')
      .update({ profile: merged, profile_updated_at: new Date().toISOString() }).eq('id', member.id);
  } catch { /* best-effort */ }
}

// "Forget me": wipe this browser's memory AND, for a member, their durable profile.
export async function clearProfileForCid(cid: string): Promise<void> {
  if (!isValidCid(cid)) return;
  await clearMemory(cid);
  const member = await getMemberByCid(cid);
  if (!member) return;
  try {
    await supabaseAdmin().from('concierge_members')
      .update({ profile: {}, profile_updated_at: new Date().toISOString() }).eq('id', member.id);
  } catch { /* best-effort */ }
}
