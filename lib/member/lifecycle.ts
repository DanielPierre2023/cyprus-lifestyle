// lib/member/lifecycle.ts — the two member lifecycle e-mails, sent once each per event from the daily job (lib/member/reconcile.ts).
//
//   grace  — a paid membership has a payment problem and is inside the 7-day grace period (benefits continue until <date>)
//   ended  — the benefits have stopped (status canceled, or a payment problem whose grace period is over)
//
// ONCE PER EVENT: each e-mail is CLAIMED with one atomic conditional UPDATE (stamp column still empty -> now) before it is sent,
// so two overlapping runs cannot both send; if the send fails the claim is released and tomorrow's run tries again. When a
// membership recovers (status back to active) both stamps are cleared, so a LATER payment problem or lapse is a new event and is
// announced again. At-most-once on purpose: a crash between claim and send loses one notice rather than ever sending two.
// Stripe's own "failed payment" customer e-mails should stay OFF (docs/MEMBER-CARD.md) so members do not get two.
// Recipients: paid members only (a Stripe subscription id exists) with an e-mail address; complimentary memberships ended by
// the owner are not mailed. Language: the member's stored locale, else English. Memberships that ended before this feature
// shipped were pre-stamped by the migration, so nobody receives a notice about an old event.
import type { SupabaseClient } from '@supabase/supabase-js';
import { brandedEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';
import { dateFormatter } from '@/lib/i18n/format';
import { GRACE_DAYS, PROFILE_RETENTION_DAYS, entitled, type MemberLike } from '@/lib/member/entitlement';
import { lifecycleCopy } from '@/lib/member/lifecycleCopy';

const DAY = 86_400_000;
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_m, k) => (k in v ? String(v[k]) : `{${k}}`));

/** The moment benefits stop for a 'failed' membership — the same anchor entitled() uses, so e-mail and account page agree. */
export function graceEndsAt(m: Pick<MemberLike, 'current_period_end' | 'updated_at'>): Date | null {
  const t = Date.parse(m.current_period_end || m.updated_at || '');
  return Number.isFinite(t) ? new Date(t + GRACE_DAYS * DAY) : null;
}

const loc = (l: string | null | undefined): Locale => (l && isLocale(l) ? (l as Locale) : 'en');
const prefix = (l: Locale) => (l === 'en' ? '' : `/${l}`);
const day = (d: Date, l: Locale) => { try { return dateFormatter(l, { dateStyle: 'long' }, 'Europe/Nicosia').format(d); } catch { return d.toISOString().slice(0, 10); } };

export interface Mail { subject: string; html: string }

export function graceMail(locale: string | null | undefined, v: { until: Date; siteUrl: string }): Mail {
  const l = loc(locale), c = lifecycleCopy(l);
  const site = v.siteUrl.replace(/\/$/, '');
  return {
    subject: c.graceSubject,
    html: brandedEmail({
      locale: l, heading: esc(c.graceHeading),
      bodyHtml: `<p>${esc(fill(c.graceBody, { date: day(v.until, l) }))}</p><p>${esc(c.graceHow)}</p><p style="opacity:.75;font-size:14px">${esc(c.graceFoot)}</p>`,
      ctaLabel: c.graceCta, ctaUrl: `${site}${prefix(l)}/account`, preheader: c.graceHeading,
    }),
  };
}

export function endedMail(locale: string | null | undefined, v: { siteUrl: string }): Mail {
  const l = loc(locale), c = lifecycleCopy(l);
  const site = v.siteUrl.replace(/\/$/, '');
  return {
    subject: c.endedSubject,
    html: brandedEmail({
      locale: l, heading: esc(c.endedHeading),
      bodyHtml: `<p>${esc(c.endedBody)}</p><p>${esc(c.endedStops)}</p><p>${esc(fill(c.endedKept, { days: PROFILE_RETENTION_DAYS }))}</p><p>${esc(c.endedRejoin)}</p><p style="opacity:.75;font-size:14px">${esc(c.endedFoot)}</p>`,
      ctaLabel: c.endedCta, ctaUrl: `${site}${prefix(l)}/membership`, preheader: c.endedHeading,
    }),
  };
}

export type NoticeKind = 'grace' | 'ended';
/** Pure: which notice (if any) does this member row call for right now? 'ended' wins over 'grace'. */
export function noticeFor(m: MemberLike & { email?: string | null; grace_notice_at?: string | null; lapsed_notice_at?: string | null }, now: Date): NoticeKind | null {
  if (!m.stripe_subscription_id || !m.email) return null;                       // complimentary or no address: nothing to send
  const live = entitled(m, now);
  if ((m.status === 'canceled' || (m.status === 'failed' && !live)) && !m.lapsed_notice_at) return 'ended';
  if (m.status === 'failed' && live && !m.grace_notice_at) return 'grace';
  return null;
}

export interface LifecycleSummary { graceSent: number; endedSent: number; cleared: number; failed: number }
export type Sender = (m: { to: string; subject: string; html: string }) => Promise<{ ok: boolean; error?: string }>;

interface Row extends MemberLike { id: string; email: string | null; locale: string | null; grace_notice_at: string | null; lapsed_notice_at: string | null }
const COLS = 'id, email, locale, status, current_period_end, updated_at, stripe_subscription_id, lapsed_at, grace_notice_at, lapsed_notice_at';
const MAX_PER_RUN = 100;

export async function runLifecycleNotices(sb: SupabaseClient, now: Date, send: Sender, siteUrl: string): Promise<LifecycleSummary> {
  const out: LifecycleSummary = { graceSent: 0, endedSent: 0, cleared: 0, failed: 0 };
  const nowIso = now.toISOString();

  // 1. a recovered membership starts with a clean slate (a later problem is a new event)
  for (const col of ['grace_notice_at', 'lapsed_notice_at'] as const) {
    const r = await sb.from('concierge_members').update({ [col]: null }).eq('status', 'active').not(col, 'is', null).select('id');
    out.cleared += r.data?.length ?? 0;
  }

  // 2. who needs a notice
  const { data } = await sb.from('concierge_members').select(COLS).in('status', ['failed', 'canceled'])
    .not('stripe_subscription_id', 'is', null).not('email', 'is', null).limit(500);
  const due = ((data || []) as Row[]).map((r) => ({ r, kind: noticeFor(r, now) })).filter((x): x is { r: Row; kind: NoticeKind } => x.kind !== null).slice(0, MAX_PER_RUN);

  for (const { r, kind } of due) {
    const col = kind === 'grace' ? 'grace_notice_at' : 'lapsed_notice_at';
    // claim: only one runner can move the stamp from empty to now
    const claim = await sb.from('concierge_members').update({ [col]: nowIso }).eq('id', r.id).is(col, null).select('id');
    if (claim.error || !claim.data || claim.data.length === 0) continue;
    const until = graceEndsAt(r);
    const mail = kind === 'grace' ? graceMail(r.locale, { until: until || now, siteUrl }) : endedMail(r.locale, { siteUrl });
    let ok = false;
    try { ok = (await send({ to: String(r.email), subject: mail.subject, html: mail.html })).ok; } catch { ok = false; }
    if (ok) { if (kind === 'grace') out.graceSent++; else out.endedSent++; }
    else {
      out.failed++;
      await sb.from('concierge_members').update({ [col]: null }).eq('id', r.id).eq(col, nowIso);   // release: tomorrow's run tries again
    }
  }
  return out;
}
