// Admin — the voice engine's control panel, usable straight from the browser address bar (signed in to /admin).
//   /api/admin/voice                       report: counts, switch state, daily cap, the 15 worst editions, recent runs
//   /api/admin/voice?on=1 | ?off=1         switch the background worker on / off
//   /api/admin/voice?cap=40                set the daily cap (editions per day, 0–1000)
//   /api/admin/voice?dry=1[&id=…&lang=xx]  free dry run: the score, the tells and the cost estimate of the next (or a given) edition
//   /api/admin/voice?run=1&id=…&lang=xx    repair that one edition now (costs one model call, about US$0.03–0.09)
// Anything that changes or spends needs a request typed in the address bar or opened from this site (Sec-Fetch-Site none|same-origin).
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditAdminRequest } from '@/lib/auditRequest';
import { loadState, saveState, loadPublished, unitsOf, runVoiceOnce } from '@/lib/voice/runner';
import { stuck, withDay } from '@/lib/voice/work';
import { MAX_SCORE } from '@/lib/voice/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Sign in to /admin first.' }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const changes = q.get('on') === '1' || q.get('off') === '1' || q.has('cap') || q.get('run') === '1';
  const fetchSite = req.headers.get('sec-fetch-site');
  if (changes && fetchSite && fetchSite !== 'none' && fetchSite !== 'same-origin') {
    return NextResponse.json({ ok: false, error: 'Open this address directly in your browser.' }, { status: 403 });
  }
  const sb = supabaseAdmin();
  try {
    let state = withDay(await loadState(sb), new Date());
    if (changes) auditAdminRequest(req, 'voice-engine');

    if (q.get('on') === '1' || q.get('off') === '1' || q.has('cap')) {
      if (q.get('on') === '1') state = { ...state, enabled: true };
      if (q.get('off') === '1') state = { ...state, enabled: false };
      if (q.has('cap')) {
        const n = Number(q.get('cap'));
        if (!Number.isFinite(n) || n < 0 || n > 1000) return NextResponse.json({ ok: false, error: 'cap must be a number from 0 to 1000.' }, { status: 400 });
        state = { ...state, dailyCap: Math.floor(n) };
      }
      await saveState(sb, state);
    }

    const id = q.get('id') || undefined, lang = q.get('lang') || undefined;
    if (q.get('dry') === '1' || q.get('run') === '1') {
      if (q.get('run') === '1' && !(id && lang)) return NextResponse.json({ ok: false, error: 'run needs id and lang (see the report).' }, { status: 400 });
      const r = await runVoiceOnce(sb, { id, lang, dry: q.get('dry') === '1' });
      return NextResponse.json({ ok: true, ...r });
    }

    const units = unitsOf(await loadPublished(sb));
    const failing = units.filter((u) => !u.ok);
    return NextResponse.json({
      ok: true, enabled: state.enabled, dailyCap: state.dailyCap, usedToday: state.usedToday, maxScore: MAX_SCORE,
      editions: units.length, passing: units.length - failing.length, failing: failing.length,
      sourceEditionsFailing: failing.filter((u) => u.isSource).length,
      worst: failing.sort((a, b) => b.score - a.score).slice(0, 15).map((u) => ({ id: u.id, lang: u.lang, slug: u.slug, desk: u.desk, score: u.score, words: u.words })),
      stuck: stuck(state), recent: state.recent.slice(0, 15),
      next: state.enabled ? 'The worker is on.' : 'The worker is off. Try ?dry=1 first (free), then ?on=1.',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
