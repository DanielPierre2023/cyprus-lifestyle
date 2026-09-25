import 'server-only';
// ============================================================================
// Open-Meteo nowcast — free, no API key. One BATCHED request for many points
// (Open-Meteo accepts comma-separated coordinates), cached in-process so a page
// with many beach cams makes a single upstream call every TTL — unlike the
// per-point client calls that trip 429s. Fails soft: any error → empty result,
// callers just render without the nowcast.
// ============================================================================

export interface Nowcast {
  seaTempC: number | null;   // sea-surface temperature
  waveM: number | null;      // wave height
  airTempC: number | null;   // 2 m air temperature
  weatherCode: number | null; // WMO weather code
}

export interface GeoKey { key: string; lat: number; lng: number; }

const TTL_MS = 15 * 60 * 1000; // 15 min — matches the /live page revalidate window
const cache = new Map<string, { at: number; value: Nowcast }>();
const round = (n: number) => Math.round(n * 1000) / 1000; // ~100 m cache buckets

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Normalise Open-Meteo's response: an array (multi-coordinate) or a single object.
function asArray(j: unknown): Record<string, unknown>[] {
  if (Array.isArray(j)) return j as Record<string, unknown>[];
  if (j && typeof j === 'object') return [j as Record<string, unknown>];
  return [];
}
function currentNum(row: Record<string, unknown> | undefined, field: string): number | null {
  const cur = row?.current as Record<string, unknown> | undefined;
  const v = cur?.[field];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Batched nowcast for a set of keyed points. Returns a map key → Nowcast for the
 * points that resolved. Points already in the cache (within TTL) are served from
 * cache; only the misses are fetched, in a single marine + a single forecast call.
 */
export async function nowcastByKey(points: GeoKey[]): Promise<Record<string, Nowcast>> {
  const out: Record<string, Nowcast> = {};
  const now = Date.now();
  const misses: GeoKey[] = [];
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const ck = `${round(p.lat)},${round(p.lng)}`;
    const hit = cache.get(ck);
    if (hit && now - hit.at < TTL_MS) out[p.key] = hit.value;
    else misses.push(p);
  }
  if (misses.length === 0) return out;

  const lats = misses.map((p) => round(p.lat)).join(',');
  const lngs = misses.map((p) => round(p.lng)).join(',');
  const tz = 'timezone=auto';
  const [marine, forecast] = await Promise.all([
    fetchJson(`https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}&current=sea_surface_temperature,wave_height&${tz}`),
    fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code&${tz}`),
  ]);
  const mArr = asArray(marine);
  const fArr = asArray(forecast);

  misses.forEach((p, i) => {
    const value: Nowcast = {
      seaTempC: currentNum(mArr[i], 'sea_surface_temperature'),
      waveM: currentNum(mArr[i], 'wave_height'),
      airTempC: currentNum(fArr[i], 'temperature_2m'),
      weatherCode: currentNum(fArr[i], 'weather_code'),
    };
    cache.set(`${round(p.lat)},${round(p.lng)}`, { at: now, value });
    out[p.key] = value;
  });
  return out;
}
