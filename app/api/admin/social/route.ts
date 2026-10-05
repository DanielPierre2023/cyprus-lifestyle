// Admin → Social.
//   GET                                   settings, connection flags, queue statistics
//   POST { post_id, platforms[], repost? }   post ONE article now (any article ever published). Facebook/Instagram go through the
//                                          queue (same words, same rules, no double posts); X and LinkedIn use the older direct path.
//   POST { action:'settings', patch }      switches and limits
//   POST { action:'test' }                 check the Meta token, page and Instagram account
//   POST { action:'backlog', platforms, limit }   queue earlier published articles (newest first); they are then posted gradually within the daily limits
//   POST { action:'run' }                  work the queue right now
//   POST { action:'retry', id } | { action:'skip', id } | { action:'retry_failed' }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { publishToPlatforms, type Platform, type PostForSocial } from '@/lib/social';
import { enqueueBacklog, enqueueNow, loadSettings, outboxStats, processOutbox, configured, saveSettings, testConnection } from '@/lib/socialAuto';
import { auditLog } from '@/lib/audit';
import { isLocale, type Locale } from '@/lib/locales';
import type { SocialPlatform } from '@/lib/socialPlan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Hobby cap

const ALL: Platform[] = ['facebook', 'instagram', 'x', 'linkedin'];
const META: SocialPlatform[] = ['facebook', 'instagram'];
const isMeta = (p: string): p is SocialPlatform => (META as string[]).includes(p);
const forbidden = () => NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

export async function GET() {
  if (!(await isAdmin())) return forbidden();
  const sb = supabaseAdmin();
  const [settings, stats] = await Promise.all([loadSettings(sb), outboxStats(sb).catch(() => null)]);
  return NextResponse.json({ ok: true, settings, configured: configured(), stats, migrated: !!stats });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return forbidden();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const sb = supabaseAdmin();
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  const actor = { actor: user?.id ?? null, actorEmail: user?.email ?? null };

  if (action === 'settings') {
    const p = (body.patch && typeof body.patch === 'object' ? body.patch : {}) as Record<string, unknown>;
    const allowed = ['enabled', 'facebook', 'instagram', 'max_per_day', 'min_gap_minutes', 'max_age_hours'];
    const patch = Object.fromEntries(Object.entries(p).filter(([k]) => allowed.includes(k)));
    const settings = await saveSettings(sb, patch);
    await auditLog(sb, { ...actor, action: 'social.settings', table: 'site_settings', summary: 'social auto-post settings changed', changes: patch });
    return NextResponse.json({ ok: true, settings });
  }

  if (action === 'test') return NextResponse.json({ ok: true, connection: await testConnection() });

  if (action === 'backlog') {
    const platforms = (Array.isArray(body.platforms) ? body.platforms : META).filter(isMeta);
    const limit = Math.min(2000, Math.max(1, Number(body.limit) || 200));
    if (platforms.length === 0) return NextResponse.json({ ok: false, error: 'Choose at least one platform.' }, { status: 400 });
    try {
      const queued = await enqueueBacklog(sb, platforms, limit);
      await auditLog(sb, { ...actor, action: 'social.backlog', table: 'social_outbox', summary: `queued ${queued} earlier article posts (${platforms.join(', ')})` });
      return NextResponse.json({ ok: true, queued });
    } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
  }

  if (action === 'run') return NextResponse.json({ ok: true, ...(await processOutbox(sb, { deadlineMs: 45_000, maxItems: 5 })) });

  if (action === 'retry' || action === 'skip') {
    const id = String(body.id || '');
    const patch = action === 'retry'
      ? { status: 'pending', attempts: 0, error: null, next_attempt_at: new Date().toISOString() }
      : { status: 'skipped', error: 'skipped by an administrator' };
    const { data } = await sb.from('social_outbox').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).in('status', ['pending', 'failed']).select('id').maybeSingle();
    return NextResponse.json({ ok: !!data, error: data ? undefined : 'Only waiting or failed posts can be changed.' });
  }
  if (action === 'retry_failed') {
    const { data } = await sb.from('social_outbox').update({ status: 'pending', attempts: 0, error: null, next_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('status', 'failed').select('id');
    return NextResponse.json({ ok: true, retried: data?.length ?? 0 });
  }

  // ── post one article now ──
  const id = String(body.post_id || '');
  if (!id) return NextResponse.json({ ok: false, error: 'post_id required' }, { status: 400 });
  const platforms: Platform[] = Array.isArray(body.platforms) ? body.platforms.filter((p: string) => ALL.includes(p as Platform)) : ALL;
  const results: Record<string, unknown> = {};

  const metaPlatforms = platforms.filter(isMeta);
  if (metaPlatforms.length) {
    const { ids, alreadyPosted } = await enqueueNow(sb, id, metaPlatforms, body.repost === true);
    const run = ids.length ? await processOutbox(sb, { ids, deadlineMs: 50_000, maxItems: ids.length }) : null;
    results.meta = { queued: ids.length, alreadyPosted, run };
    await auditLog(sb, { ...actor, action: 'social.post', table: 'blog_posts', rowId: id, summary: `posted now to ${metaPlatforms.join(', ')}`, changes: { repost: body.repost === true } });
  }

  const direct = platforms.filter((p) => !isMeta(p));
  if (direct.length) {
    const locale: Locale = isLocale(String(body.locale)) ? body.locale : 'en';
    const { data } = await sb.from('blog_posts').select(`id, slug, cover_image, title_${locale}, excerpt_${locale}, title_en, excerpt_en`).eq('id', id).single();
    if (!data) return NextResponse.json({ ok: false, error: 'post not found' }, { status: 404 });
    const r = data as unknown as Record<string, string | null>;
    const post: PostForSocial = { id: String(r.id), slug: String(r.slug), cover_image: r.cover_image ?? null, locale, title: String(r[`title_${locale}`] || r.title_en || ''), excerpt: String(r[`excerpt_${locale}`] || r.excerpt_en || '') };
    results.direct = await publishToPlatforms(sb, post, direct);
  }
  return NextResponse.json({ ok: true, results });
}
