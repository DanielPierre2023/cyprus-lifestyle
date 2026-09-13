// Cover image search (Unsplash). Optional — if UNSPLASH_ACCESS_KEY is unset the
// desk simply leaves cover_image null for the editor to fill in.
import 'server-only';

export async function findCover(query: string): Promise<{ url: string; credit: string } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.results?.[0];
    if (!p) return null;
    return {
      url: p.urls?.regular || p.urls?.full,
      credit: `Photo: ${p.user?.name || 'Unsplash'} / Unsplash`,
    };
  } catch {
    return null;
  }
}
