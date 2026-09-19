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
// AUTH: none required. Supabase's gateway already gates the function with your
//       project key. (Optional lock: set OSM_IMPORT_SECRET as a Supabase edge
//       secret and it will then be required as body.secret.)
//
// INVOKE (one category per call keeps each run well within limits):
//   {"category":"restaurant"}               → import restaurants
//   categories: restaurant | cafe | bar | hotel | guesthouse | winery | beach
//   {"category":"restaurant","dryRun":true} → count only, no write
//   {"category":"all"}                      → every category (slower)
//   optional: "limit" (default 2000), "status" ("draft" default | "published")
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// category → { legacy type, taxonomy group, subtype, Overpass selector(s), tag }
// `type` keeps the six legacy values for existing pages; `group`/`subtype` carry
// the full 12-group taxonomy (columns added in migration 0045). Run one category
// per call (or "all"); heavy ones (pharmacy, market, school) are best run alone.
const CATS: Record<string, { type: string; group: string; subtype: string; sel: string[]; tag?: string }> = {
  // Hospitality
  restaurant: { type: "restaurant", group: "hospitality", subtype: "restaurant", sel: [`nwr["amenity"="restaurant"](area.a);`] },
  cafe:       { type: "restaurant", group: "hospitality", subtype: "cafe", sel: [`nwr["amenity"="cafe"](area.a);`], tag: "cafe" },
  bar:        { type: "restaurant", group: "hospitality", subtype: "nightlife", sel: [`nwr["amenity"~"^(bar|pub|nightclub)$"](area.a);`], tag: "nightlife" },
  bakery:     { type: "restaurant", group: "hospitality", subtype: "bakery", sel: [`nwr["shop"="bakery"](area.a);`], tag: "bakery" },
  // Stays
  hotel:      { type: "hotel", group: "stays", subtype: "hotel", sel: [`nwr["tourism"~"^(hotel|resort)$"](area.a);`] },
  guesthouse: { type: "hotel", group: "stays", subtype: "guesthouse", sel: [`nwr["tourism"~"^(guest_house|apartment|chalet|hostel)$"](area.a);`], tag: "guesthouse" },
  // Food & producers
  winery:     { type: "winery", group: "food", subtype: "winery", sel: [`nwr["craft"="winery"](area.a);`, `nwr["shop"="wine"](area.a);`] },
  producer:   { type: "winery", group: "food", subtype: "producer", sel: [`nwr["shop"~"^(cheese|confectionery|chocolate|dairy)$"](area.a);`, `nwr["craft"~"^(confectionery|brewery|distillery)$"](area.a);`], tag: "producer" },
  // Nature
  beach:      { type: "beach", group: "nature", subtype: "beach", sel: [`nwr["natural"="beach"](area.a);`] },
  // Real estate & home
  realestate: { type: "vendor", group: "realestate", subtype: "agency", sel: [`nwr["office"="estate_agent"](area.a);`], tag: "real-estate" },
  furniture:  { type: "vendor", group: "realestate", subtype: "furniture", sel: [`nwr["shop"~"^(furniture|interior_decoration|kitchen|houseware|bathroom_furnishing)$"](area.a);`], tag: "home" },
  architect:  { type: "vendor", group: "realestate", subtype: "architect", sel: [`nwr["office"="architect"](area.a);`], tag: "architect" },
  // Professional & business
  legal:      { type: "vendor", group: "professional", subtype: "legal", sel: [`nwr["office"~"^(lawyer|notary)$"](area.a);`], tag: "legal" },
  accounting: { type: "vendor", group: "professional", subtype: "accounting", sel: [`nwr["office"~"^(accountant|tax_advisor)$"](area.a);`], tag: "accounting" },
  bank:       { type: "vendor", group: "professional", subtype: "banking", sel: [`nwr["amenity"="bank"](area.a);`], tag: "banking" },
  insurance:  { type: "vendor", group: "professional", subtype: "insurance", sel: [`nwr["office"="insurance"](area.a);`], tag: "insurance" },
  corporate:  { type: "vendor", group: "professional", subtype: "corporate", sel: [`nwr["office"~"^(company|consulting|financial|it)$"](area.a);`], tag: "business" },
  // Everyday services
  cleaning:   { type: "vendor", group: "services", subtype: "cleaning", sel: [`nwr["shop"~"^(laundry|dry_cleaning)$"](area.a);`, `nwr["craft"="cleaning"](area.a);`], tag: "cleaning" },
  trades:     { type: "vendor", group: "services", subtype: "trades", sel: [`nwr["craft"~"^(plumber|electrician|carpenter|painter|hvac|roofer|tiler|gardener)$"](area.a);`], tag: "trades" },
  pet:        { type: "vendor", group: "services", subtype: "pet-care", sel: [`nwr["shop"="pet"](area.a);`, `nwr["amenity"="veterinary"](area.a);`], tag: "pet" },
  childcare:  { type: "vendor", group: "services", subtype: "childcare", sel: [`nwr["amenity"~"^(kindergarten|childcare)$"](area.a);`], tag: "childcare" },
  // Health & wellness
  clinic:     { type: "vendor", group: "health", subtype: "clinic", sel: [`nwr["amenity"~"^(clinic|doctors|hospital)$"](area.a);`], tag: "health" },
  dentist:    { type: "vendor", group: "health", subtype: "dentist", sel: [`nwr["amenity"="dentist"](area.a);`], tag: "dentist" },
  pharmacy:   { type: "vendor", group: "health", subtype: "pharmacy", sel: [`nwr["amenity"="pharmacy"](area.a);`], tag: "pharmacy" },
  gym:        { type: "vendor", group: "health", subtype: "gym", sel: [`nwr["leisure"~"^(fitness_centre|sports_centre)$"](area.a);`], tag: "gym" },
  spa:        { type: "vendor", group: "health", subtype: "spa-beauty", sel: [`nwr["shop"~"^(beauty|hairdresser|massage)$"](area.a);`, `nwr["leisure"="spa"](area.a);`], tag: "wellness" },
  // Retail & shopping
  mall:       { type: "vendor", group: "retail", subtype: "mall", sel: [`nwr["shop"="mall"](area.a);`], tag: "shopping" },
  fashion:    { type: "vendor", group: "retail", subtype: "fashion", sel: [`nwr["shop"~"^(clothes|boutique|shoes|bag|fashion_accessories)$"](area.a);`], tag: "fashion" },
  jewellery:  { type: "vendor", group: "retail", subtype: "jewellery", sel: [`nwr["shop"~"^(jewelry|watches)$"](area.a);`], tag: "jewellery" },
  cosmetics:  { type: "vendor", group: "retail", subtype: "cosmetics", sel: [`nwr["shop"~"^(cosmetics|perfumery|chemist)$"](area.a);`], tag: "cosmetics" },
  electronics:{ type: "vendor", group: "retail", subtype: "electronics", sel: [`nwr["shop"~"^(electronics|mobile_phone|computer)$"](area.a);`], tag: "electronics" },
  homediy:    { type: "vendor", group: "retail", subtype: "home-diy", sel: [`nwr["shop"~"^(doityourself|hardware|garden_centre|appliance)$"](area.a);`], tag: "home" },
  gifts:      { type: "vendor", group: "retail", subtype: "gifts", sel: [`nwr["shop"~"^(gift|art|antiques)$"](area.a);`], tag: "gifts" },
  market:     { type: "vendor", group: "retail", subtype: "food-market", sel: [`nwr["shop"~"^(supermarket|greengrocer|deli|butcher)$"](area.a);`, `nwr["amenity"="marketplace"](area.a);`], tag: "food" },
  // Culture & experiences
  museum:     { type: "vendor", group: "culture", subtype: "museum", sel: [`nwr["tourism"~"^(museum|gallery)$"](area.a);`], tag: "culture" },
  heritage:   { type: "vendor", group: "culture", subtype: "heritage", sel: [`nwr["historic"~"^(castle|ruins|archaeological_site|monument)$"](area.a);`, `nwr["tourism"="attraction"](area.a);`], tag: "heritage" },
  marina:     { type: "vendor", group: "culture", subtype: "marina", sel: [`nwr["leisure"="marina"](area.a);`], tag: "marina" },
  golf:       { type: "vendor", group: "culture", subtype: "golf", sel: [`nwr["leisure"="golf_course"](area.a);`], tag: "golf" },
  // Community & education
  school:     { type: "vendor", group: "community", subtype: "school", sel: [`nwr["amenity"~"^(school|college|university)$"](area.a);`], tag: "education" },
  // Mobility
  carrental:  { type: "vendor", group: "mobility", subtype: "car-rental", sel: [`nwr["amenity"="car_rental"](area.a);`], tag: "car-rental" },
  carsharing: { type: "vendor", group: "mobility", subtype: "car-sharing", sel: [`nwr["amenity"="car_sharing"](area.a);`], tag: "car-sharing" },
  taxi:       { type: "vendor", group: "mobility", subtype: "taxi", sel: [`nwr["amenity"="taxi"](area.a);`], tag: "taxi" },
  charging:   { type: "vendor", group: "mobility", subtype: "ev-charging", sel: [`nwr["amenity"="charging_station"](area.a);`], tag: "ev" },
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function overpass(query: string): Promise<{ elements: OsmEl[] }> {
  let lastErr = "";
  // Public Overpass mirrors rate-limit by IP; try each mirror quickly and move
  // on. Short per-request timeout keeps the whole call inside the dashboard's
  // response window so it returns cleanly instead of the client giving up.
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const host of OVERPASS) {
      try {
        const res = await fetch(host, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(30000),
        });
        if (res.status === 429 || res.status === 504) { lastErr = `${host} → ${res.status}`; await sleep(1500); continue; }
        if (!res.ok) { lastErr = `${host} → HTTP ${res.status}`; continue; }
        return await res.json();
      } catch (e) { lastErr = `${host} → ${(e as Error).message}`; }
    }
    await sleep(1500);
  }
  throw new Error("Overpass unreachable after retries: " + lastErr);
}

// Write straight to PostgREST with the service role — robust and free of the
// JS client's .upsert() quirk on the edge runtime. Returns null on success.
async function pgUpsert(baseUrl: string, key: string, rows: Row[]): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/rest/v1/directory_listings?on_conflict=osm_id`, {
      method: "POST",
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    return null;
  } catch (e) { return (e as Error).message; }
}

interface OsmEl {
  type: "node" | "way" | "relation"; id: number;
  lat?: number; lon?: number; center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
type Row = Record<string, unknown>;

function mapEl(el: OsmEl, catType: string, group: string, subtype: string, extraTag?: string): Row | null {
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
    category_group: group,
    subtype,
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
    notes: `source=osm; subtype=${subtype}`,
    osm_id, osm_type: el.type,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    const osmSecret = Deno.env.get("OSM_IMPORT_SECRET") || "";

    const body = await req.json().catch(() => ({}));
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const secret = String(body.secret || "");
    // Open by default: no secret needed. Supabase's own gateway already requires
    // a valid project key to reach this function at all. If you want to lock it
    // down later, set OSM_IMPORT_SECRET (or CRON_SECRET) as a *Supabase* Edge
    // Function secret and it will then be required.
    const requiredSecret = osmSecret || cronSecret;
    if (requiredSecret && secret !== requiredSecret && secret !== serviceKey && bearer !== serviceKey) {
      return new Response(JSON.stringify({
        ok: false,
        error: "unauthorized — this function has a secret set; pass it as body.secret (or remove the OSM_IMPORT_SECRET/CRON_SECRET Supabase edge secret to run it open)",
      }, null, 2), { status: 401, headers: CORS });
    }

    const wanted: string = (body.category || "restaurant").toLowerCase();
    const cats = wanted === "all" ? Object.keys(CATS) : [wanted];
    for (const c of cats) if (!CATS[c]) return new Response(JSON.stringify({ ok: false, error: `unknown category "${c}"`, categories: Object.keys(CATS) }), { status: 400, headers: CORS });
    const limit = Math.min(Number(body.limit) || 2000, 8000);
    // Default DRAFT: OSM places land hidden (backend only) as raw material to
    // review, enrich and selectively publish. Pass "status":"published" to go live.
    const status: string = body.status === "published" ? "published" : "draft";
    const dryRun = !!body.dryRun;

    const report: Record<string, unknown>[] = [];
    let totalUpserted = 0, totalFetched = 0, totalMapped = 0;

    let first = true;
    for (const c of cats) {
      if (!first) await sleep(2500); // be polite to Overpass between categories
      first = false;
      const { type, group, subtype, sel, tag } = CATS[c];
      const q = `[out:json][timeout:25];area["ISO3166-1"="CY"][admin_level=2]->.a;(${sel.join("")});out center tags;`;
      let data: { elements: OsmEl[] };
      try {
        data = await overpass(q);
      } catch (e) {
        // Isolate a failing category so an "all" run still finishes the rest and
        // reports cleanly instead of returning a 500 for everything.
        report.push({ category: c, type, error: (e as Error).message });
        continue;
      }
      const els = data.elements || [];
      totalFetched += els.length;

      // map + dedupe by osm_id within this batch
      const seen = new Set<string>();
      const rows: Row[] = [];
      for (const el of els) {
        const r = mapEl(el, type, group, subtype, tag);
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
          const err = await pgUpsert(url, serviceKey, chunk);
          if (err) {
            // fall back to row-by-row so one bad row can't sink the chunk
            for (const row of chunk) {
              const e2 = await pgUpsert(url, serviceKey, [row]);
              if (e2) errors.push(`${row.osm_id}: ${e2}`); else upserted++;
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
