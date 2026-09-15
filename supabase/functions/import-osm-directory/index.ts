// supabase/functions/import-osm-directory/index.ts
//
// ============================================================================
// CYPRUS LIFESTYLE — OpenStreetMap directory importer (Phase 0)
// ----------------------------------------------------------------------------
// Bulk-loads REAL, geocoded Cyprus places from OpenStreetMap (via the public
// Overpass API) into public.directory_listings, so the directory & map feel
// complete under the curated flagship entries. Listing-grade: name, location,
// website/phone where OSM has them — no editorial summary (that stays curated).
//
// Self-contained — pastes into the Supabase dashboard. Uses the service role.
// Idempotent: upserts on osm_id (requires migration 0023). Re-running refreshes.
//
// AUTH: pass {"secret": "<your CRON_SECRET>"} in the body (or send the service
//       role key as the Bearer token). Fails closed.
//
// INVOKE (one category per call keeps each run well within limits):
//   {"secret":"…","category":"restaurant"}          → import restaurants
//   categories: restaurant | cafe | bar | hotel | guesthouse | winery | beach
//   {"secret":"…","category":"restaurant","dryRun":true}  → count only, no write
//   {"secret":"…","category":"all"}                 → every category (slower)
//   optional: "limit" (default 2000), "status" ("published" default | "draft")
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// category → { directory type, Overpass selector(s), extra tag }
const CATS: Record<string, { type: string; sel: string[]; tag?: string }> = {
  restaurant: { type: "restaurant", sel: [`nwr["amenity"="restaurant"](area.a);`] },
  cafe: { type: "restaurant", sel: [`nwr["amenity"="cafe"](area.a);`], tag: "cafe" },
  bar: { type: "restaurant", sel: [`nwr["amenity"~"^(bar|pub|nightclub)$"](area.a);`], tag: "nightlife" },
  hotel: { type: "hotel", sel: [`nwr["tourism"~"^(hotel|resort)$"](area.a);`] },
  guesthouse: { type: "hotel", sel: [`nwr["tourism"~"^(guest_house|apartment|chalet|hostel)$"](area.a);`], tag: "guesthouse" },
  winery: { type: "winery", sel: [`nwr["craft"="winery"](area.a);`, `nwr["shop"="wine"](area.a);`] },
  beach: { type: "beach", sel: [`nwr["natural"="beach"](area.a);`] },
};

// District centres for a nearest-centre fallback when addr:city is absent.
const DISTRICTS: Record<string, [number, number]> = {
  nicosia: [35.170, 33.360], limassol: [34.700, 33.020], larnaca: [34.920, 33.620],
  famagusta: [34.988, 33.950], paphos: [34.772, 32.424], kyrenia: [35.340, 33.320],
};
// Known towns → district (first match wins; lowercased contains).
const TOWN_DISTRICT: [RegExp, string][] = [
  [/lemesos|limassol|germasogeia|agios tychon|mouttagiaka|pareklisia|pissouri|pelendri|kyperounta|omodos|platres|kilani|koilani/i, "limassol"],
  [/pafos|paphos|geroskipou|peyia|pegeia|polis|latchi|kathikas|pomos|coral bay|chloraka|tala|kissonerga/i, "paphos"],
  [/larnaca|larnaka|aradippou|livadia|pervolia|kiti|oroklini|dromolaxia|lefkara|zygi/i, "larnaca"],
  [/ayia napa|agia napa|paralimni|protaras|deryneia|sotira|frenaros|famagusta|liopetri|avgorou/i, "famagusta"],
  [/nicosia|lefkosia|strovolos|lakatamia|aglantzia|latsia|engomi|dali|kakopetria|kalopanayiotis|astromeritis/i, "nicosia"],
  [/kyrenia|girne|bellapais|lapithos|karavas/i, "kyrenia"],
];

const IN_CY = (lat: number, lng: number) => lat >= 34.5 && lat <= 35.8 && lng >= 32.2 && lng <= 34.6;

function slugify(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
}
function districtFor(t: Record<string, string>, lat: number, lng: number): string | null {
  const city = (t["addr:city"] || t["addr:district"] || t["addr:place"] || "").trim();
  if (city) for (const [re, d] of TOWN_DISTRICT) if (re.test(city)) return d;
  // nearest-centre fallback
  let best: string | null = null, bestD = Infinity;
  for (const [d, [clat, clng]] of Object.entries(DISTRICTS)) {
    const dist = (lat - clat) ** 2 + (lng - clng) ** 2;
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}
function normUrl(u?: string): string | null {
  if (!u) return null;
  u = u.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.slice(0, 300);
}

async function overpass(query: string): Promise<{ elements: OsmEl[] }> {
  let lastErr = "";
  for (const host of OVERPASS) {
    try {
      const res = await fetch(host, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(150000),
      });
      if (!res.ok) { lastErr = `${host} → HTTP ${res.status}`; continue; }
      return await res.json();
    } catch (e) { lastErr = `${host} → ${(e as Error).message}`; }
  }
  throw new Error("Overpass unreachable: " + lastErr);
}

interface OsmEl {
  type: "node" | "way" | "relation"; id: number;
  lat?: number; lon?: number; center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
type Row = Record<string, unknown>;

function mapEl(el: OsmEl, catType: string, extraTag?: string): Row | null {
  const t = el.tags || {};
  const name_en = (t["name:en"] || t.name || t["name:el"] || "").trim();
  if (!name_en) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number" || !IN_CY(lat, lng)) return null;

  const osm_id = `${el.type}/${el.id}`;
  const tags = [
    extraTag,
    ...(t.cuisine ? t.cuisine.split(";") : []),
    t.stars ? `${t.stars}-star` : "",
  ].map((x) => (x || "").toLowerCase().trim()).filter(Boolean);

  return {
    slug: `${slugify(name_en)}-${el.id.toString(36)}`,
    type: catType,
    district: districtFor(t, lat, lng),
    name_en, name_el: t["name:el"] || name_en, name_ro: name_en, name_ar: t["name:ar"] || name_en,
    lat, lng, coords_precision: "exact",
    url: normUrl(t.website || t["contact:website"]),
    phone: (t.phone || t["contact:phone"] || "").trim() || null,
    email: (t.email || t["contact:email"] || "").trim() || null,
    tags: [...new Set(tags)].slice(0, 6),
    featured: false,
    status: "published",
    source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    notes: "source=osm",
    osm_id, osm_type: el.type,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET") || "";

    const body = await req.json().catch(() => ({}));
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const authed = (cronSecret && body.secret === cronSecret) || bearer === serviceKey ||
      (Deno.env.get("OSM_IMPORT_SECRET") && body.secret === Deno.env.get("OSM_IMPORT_SECRET"));
    if (!authed) return new Response(JSON.stringify({ ok: false, error: "unauthorized — pass your CRON_SECRET as body.secret" }), { status: 401, headers: CORS });

    const wanted: string = (body.category || "restaurant").toLowerCase();
    const cats = wanted === "all" ? Object.keys(CATS) : [wanted];
    for (const c of cats) if (!CATS[c]) return new Response(JSON.stringify({ ok: false, error: `unknown category "${c}"`, categories: Object.keys(CATS) }), { status: 400, headers: CORS });
    const limit = Math.min(Number(body.limit) || 2000, 8000);
    const status: string = body.status === "draft" ? "draft" : "published";
    const dryRun = !!body.dryRun;

    const supa = createClient(url, serviceKey);
    const report: Record<string, unknown>[] = [];
    let totalUpserted = 0, totalFetched = 0, totalMapped = 0;

    for (const c of cats) {
      const { type, sel, tag } = CATS[c];
      const q = `[out:json][timeout:150];area["ISO3166-1"="CY"][admin_level=2]->.a;(${sel.join("")});out center tags;`;
      const data = await overpass(q);
      const els = data.elements || [];
      totalFetched += els.length;

      // map + dedupe by osm_id within this batch
      const seen = new Set<string>();
      const rows: Row[] = [];
      for (const el of els) {
        const r = mapEl(el, type, tag);
        if (!r) continue;
        const id = r.osm_id as string;
        if (seen.has(id)) continue;
        seen.add(id);
        r.status = status;
        rows.push(r);
        if (rows.length >= limit) break;
      }
      totalMapped += rows.length;

      let upserted = 0;
      const errors: string[] = [];
      if (!dryRun) {
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await supa.from("directory_listings").upsert(chunk, { onConflict: "osm_id" });
          if (error) {
            // fall back to row-by-row so one bad slug can't sink the chunk
            for (const row of chunk) {
              const { error: e2 } = await supa.from("directory_listings").upsert(row, { onConflict: "osm_id" });
              if (e2) errors.push(`${row.osm_id}: ${e2.message}`); else upserted++;
            }
          } else upserted += chunk.length;
        }
      }
      totalUpserted += upserted;
      report.push({ category: c, type, fetched: els.length, mapped: rows.length, upserted, errors: errors.slice(0, 5), sample: rows.slice(0, 3).map((r) => r.name_en) });
    }

    return new Response(JSON.stringify({
      ok: true, dryRun, status,
      totals: { fetched: totalFetched, mapped: totalMapped, upserted: totalUpserted },
      report,
      note: dryRun ? "dry run — nothing written" : "imported as status=" + status + "; curated (featured) entries still sort first",
    }, null, 2), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: CORS });
  }
});
