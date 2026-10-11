// lib/concierge/sourcesDeps.ts
// ============================================================================
// Production I/O for lib/concierge/sourcesRetrieve.ts. READ-ONLY: SELECTs and RPCs through the
// service-role client (the same way brain.ts reads). Every query re-applies the publish rule
// (published / active / reviewed) — the RPC filters too, but one layer is never trusted alone.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActivities, gygPartnerId } from '@/lib/activities/data';
import { affiliateUrl } from '@/lib/activities/classify';
import { type SourceDeps } from '@/lib/concierge/sourcesRetrieve';

type Row = Record<string, unknown>;
const LOCS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
const loc = (base: string) => LOCS.map((l) => `${base}_${l}`).join(',');

const ARTICLE_COLS = `slug,sponsored,sponsor_name,published_at,${loc('title')},${loc('excerpt')},${loc('summary')}`;
const EVENT_COLS = `slug,starts_at,ends_at,venue,district,price,date_confidence,recurrence,${loc('title')},${loc('summary')}`;
const KB_COLS = 'id,source,url,lang,title,description,body';

export function supabaseSourceDeps(): SourceDeps {
  const sb = () => supabaseAdmin();
  const rows = (d: unknown) => ((d as Row[] | null) || []);
  return {
    now: () => new Date(),
    async vectorMatch(vec, count) {
      const { data, error } = await sb().rpc('match_concierge_sources', { query_embedding: vec, match_count: count, filter_sources: null });
      if (error || !Array.isArray(data)) throw new Error(error?.message || 'rpc');
      return (data as { source: 'article' | 'event' | 'activity'; ref: string; similarity: number }[]).map((r) => ({ source: r.source, ref: String(r.ref), similarity: Number(r.similarity) }));
    },
    async kbDocMatch(vec, count) {
      const { data, error } = await sb().rpc('match_kb_docs', { query_embedding: vec, match_count: count });
      if (error || !Array.isArray(data)) throw new Error(error?.message || 'rpc');
      return (data as { id: string; similarity: number }[]).map((r) => ({ id: String(r.id), similarity: Number(r.similarity) }));
    },
    async kbDocsByIds(ids) {
      if (!ids.length) return [];
      const { data, error } = await sb().from('kb_docs').select(KB_COLS).eq('published', true).in('id', ids);
      if (error) throw new Error(error.message);
      return rows(data);
    },
    async articlesBySlugs(slugs) {
      if (!slugs.length) return [];
      const { data, error } = await sb().from('blog_posts').select(ARTICLE_COLS).eq('status', 'published').in('slug', slugs);
      if (error) throw new Error(error.message);
      return rows(data);
    },
    async eventsBySlugs(slugs) {
      if (!slugs.length) return [];
      const { data, error } = await sb().from('events').select(EVENT_COLS).eq('status', 'published').in('slug', slugs);
      if (error) throw new Error(error.message);
      return rows(data);
    },
    async eventsBetween(fromIso, toIso, limit) {
      const { data, error } = await sb().from('events').select(EVENT_COLS).eq('status', 'published')
        .lt('starts_at', toIso)
        .or(`ends_at.gte.${fromIso},and(ends_at.is.null,starts_at.gte.${new Date(new Date(fromIso).getTime() - 6 * 3600_000).toISOString()})`)
        .order('starts_at', { ascending: true }).limit(limit);
      if (error) throw new Error(error.message);
      return rows(data);
    },
    async activitiesByRefs(refs) {
      const want = new Set(refs);
      const all = await getActivities(); // same filters + 10-min cache the keyword leg uses (active, bookable, north rule)
      return all.filter((a) => want.has(a.external_id)).map((a) => ({
        row: a as unknown as Row, bookUrl: affiliateUrl(a.booking_url, gygPartnerId(), 'cl-concierge'),
      }));
    },
    async regulationAlerts(limit) {
      const { data, error } = await sb().from('regulation_alerts').select('id,url,title,summary,severity,detected_at')
        .eq('status', 'reviewed').in('severity', ['minor', 'major']).order('detected_at', { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return rows(data);
    },
    async webcams() {
      const { data, error } = await sb().from('webcams').select(`slug,district,area,${loc('name')}`).eq('status', 'published').order('sort', { ascending: true });
      if (error) throw new Error(error.message);
      return rows(data);
    },
    async publishedSlugs(slugs) {
      const out = new Set<string>();
      for (let i = 0; i < slugs.length; i += 200) {
        const { data, error } = await sb().from('directory_listings').select('slug').eq('status', 'published').in('slug', slugs.slice(i, i + 200));
        if (error) throw new Error(error.message);
        for (const r of rows(data)) out.add(String(r.slug));
      }
      return out;
    },
  };
}
