// lib/images.ts
// Single source of truth for the "owned vs hot-linked image" policy ("Own the Data").
// Pure module (no 'use client' / 'server-only') so it can be imported from client
// components (CoverImage, DirectoryMap), server components, and server modules (lib/seo).
//
// Many bulk-imported directory rows carry an `image` that HOT-LINKS a third-party
// server (scraped). We must never embed those — not in a card, a map popup, or an OG
// social card. An image counts as OURS (safe to embed) when it is EITHER:
//   • a same-origin relative path ("/…", but not protocol-relative "//…"), OR
//   • served from our own Supabase project host (NEXT_PUBLIC_SUPABASE_URL — Supabase
//     Storage objects live on that exact host), OR
//   • served from our own site host (NEXT_PUBLIC_SITE_URL).
// Any other absolute URL is treated as NOT ours. Fails CLOSED: an unparseable src, or
// one on an un-configured host, is not embedded. To relax later (e.g. an owned CDN),
// add the new host(s) to `ownedHosts` below — that is the whole policy, in one place.
export function isOwnedImage(src: string | null | undefined): boolean {
  if (!src) return false;
  const s = src.trim();
  if (!s) return false;
  if (s.startsWith('//')) return false;            // protocol-relative → treat as external
  if (s.startsWith('/')) return true;              // same-origin relative asset
  const ownedHosts = new Set<string>();
  for (const base of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (base) { try { ownedHosts.add(new URL(base).host); } catch { /* ignore malformed env */ } }
  }
  try { return ownedHosts.has(new URL(s).host); }
  catch { return false; }                          // not a vettable absolute URL → don't embed
}
