'use client';
// Records a listing view in localStorage so "Recently viewed" can resurface it.
// Client-only, per-browser, no cookies and nothing sent to the server — so it
// never affects page caching or privacy. Renders nothing.
import { useEffect } from 'react';

export interface RecentItem {
  slug: string; type: string; name: string; image: string | null; district: string | null; ts: number;
}
export const RECENT_KEY = 'cl:recent';
export const RECENT_MAX = 12;

export default function TrackView(item: Omit<RecentItem, 'ts'>) {
  useEffect(() => {
    if (!item.slug) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list: RecentItem[] = raw ? JSON.parse(raw) : [];
      const next = [{ ...item, ts: Date.now() }, ...list.filter((x) => x && x.slug !== item.slug)].slice(0, RECENT_MAX);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* private mode / blocked storage — personalization is best-effort */ }
  }, [item.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
