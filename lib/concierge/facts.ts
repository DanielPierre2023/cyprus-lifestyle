// lib/concierge/facts.ts — the facts we hold about a business, in the form the concierge may state them. Pure (no I/O), unit-tested.
//
// The concierge may quote an address, a phone number and a website ONLY from here, and never says opening hours unless a line says so.
// Everything is cleaned and length-limited (listing text comes from imports, so it passes safeText like every other untrusted field).
import { isBlockedHost, hostOf } from '@/lib/concierge/linkPolicy';
import { safeText } from '@/lib/concierge/sources';

/** Hosts that are a platform, not the business's own website (social pages, review and booking portals, maps, link pages). */
const NOT_OWN_SITE = [
  'facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com', 'youtube.com', 'youtu.be', 'pinterest.com',
  'google.com', 'goo.gl', 'g.page', 'maps.app.goo.gl', 'yelp.com', 'foursquare.com', 'tripadvisor.com', 'booking.com', 'airbnb.com', 'expedia.com',
  'agoda.com', 'trivago.com', 'wolt.com', 'linktr.ee', 'wa.me', 'whatsapp.com', 't.me',
];

/** The business's own website, or null (a social page or portal is not "their website"; a blocked source site is never given). */
export function ownWebsite(url: unknown): string | null {
  const raw = String(url ?? '').trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(raw) ? `https://${raw}` : '';
  if (!withScheme) return null;
  const host = hostOf(withScheme);
  if (!host || !host.includes('.')) return null;
  if (isBlockedHost(host)) return null;
  if (NOT_OWN_SITE.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  return withScheme.replace(/[?#].*$/, '').replace(/\/+$/, '').slice(0, 120);
}

const NOISE_PARTS = new Set(['cyprus', 'cy', 'κύπρος', 'кипр', 'republic of cyprus']);
/** "Dromos Ar. 6, Kato Polemidia, 4159, Cyprus, CY" → "Dromos Ar. 6, Kato Polemidia, 4159". Empty → null. */
export function cleanAddress(address: unknown): string | null {
  const parts = String(address ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    .filter((s) => !NOISE_PARTS.has(s.toLowerCase()) && !/^p\.?\s?o\.?\s?box\s*0?$/i.test(s));
  const out = safeText(parts.join(', '), 140);
  return out || null;
}

/** A phone number exactly as stored (digits, +, spaces, brackets, dashes only), or null. */
export function cleanPhone(phone: unknown): string | null {
  const s = String(phone ?? '').trim();
  if (!s || !/\d{5,}/.test(s.replace(/\D/g, '')) || /[^\d+()\-.\s/]/.test(s)) return null;
  return s.slice(0, 40);
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayKey = (k: string) => { const i = DAY_ORDER.indexOf(String(k).slice(0, 3).toLowerCase()); return i; };
/**
 * Opening hours as one line, from whatever shape the column holds (string, list of strings, {mon: "09:00-18:00"}, list of
 * {day, open, close}). Null when there is nothing — which is the case for every listing today, and the concierge then says so.
 */
export function hoursLine(hours: unknown): string | null {
  if (hours == null) return null;
  const asText = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ');
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const open = o.open ?? o.from ?? o.opens; const close = o.close ?? o.to ?? o.closes;
      if (open != null && close != null) return `${asText(open)}–${asText(close)}`;
    }
    return '';
  };
  if (typeof hours === 'string') return safeText(hours, 200) || null;
  if (Array.isArray(hours)) {
    const items = hours.map((h) => {
      if (h && typeof h === 'object' && !Array.isArray(h)) {
        const o = h as Record<string, unknown>;
        const day = asText(o.day ?? o.days ?? o.weekday); const t = asText(o.hours ?? o.time) || asText(o);
        return [day, t].filter(Boolean).join(' ');
      }
      return asText(h);
    }).filter(Boolean);
    return items.length ? safeText(items.slice(0, 8).join('; '), 200) : null;
  }
  if (typeof hours === 'object') {
    const entries = Object.entries(hours as Record<string, unknown>)
      .map(([k, v]) => ({ k, i: dayKey(k), t: asText(v) })).filter((e) => e.t);
    if (!entries.length) return null;
    entries.sort((a, b) => (a.i < 0 ? 99 : a.i) - (b.i < 0 ? 99 : b.i));
    return safeText(entries.slice(0, 8).map((e) => `${e.k} ${e.t}`).join('; '), 200) || null;
  }
  return null;
}

export interface FactFields {
  address?: string | null; phone?: string | null; url?: string | null; hours?: unknown; summary?: string | null; name?: string | null;
}
export interface Facts { address: string | null; phone: string | null; website: string | null; hours: string | null; overview: string | null }

/** The facts for one business, cleaned. The overview is dropped when it only repeats the name. */
export function factsOf(r: FactFields): Facts {
  const overview = safeText(r.summary, 260) || null;
  const name = String(r.name ?? '').trim().toLowerCase();
  return {
    address: cleanAddress(r.address),
    phone: cleanPhone(r.phone),
    website: ownWebsite(r.url),
    hours: hoursLine(r.hours),
    overview: overview && overview.toLowerCase() !== name ? overview : null,
  };
}

/**
 * The lines printed under a business in the concierge's context. Only what we hold is printed; opening hours get a line only when
 * we really have them (the system prompt tells the concierge what to say otherwise).
 */
export function factLines(f: Facts, opts: { reviewed: boolean }): string[] {
  const out: string[] = [];
  const contact = [f.address ? `address: ${f.address}` : '', f.phone ? `phone: ${f.phone}` : '', f.website ? `website: ${f.website}` : ''].filter(Boolean);
  if (contact.length) out.push(`    ↳ contact on file — ${contact.join(' · ')}`);
  if (f.hours) out.push(`    ↳ opening hours as listed (advise confirming by phone): ${f.hours}`);
  if (f.overview) out.push(`    ↳ ${opts.reviewed ? 'description' : 'general overview (automatically written from public listing data, not checked by us)'}: ${f.overview}`);
  return out;
}
