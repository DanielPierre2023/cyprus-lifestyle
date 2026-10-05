// lib/newsletterDigest.ts
// ============================================================================
// The weekly newsletter ("The Dispatch"), every FRIDAY, with a human in the loop:
//
//   Friday ~09:00 Cyprus time  prepareDigest()  → one DRAFT per edition (7 languages). Nothing is sent.
//   An administrator            previews, sends a test to themself, then presses "Approve & send".
//   Right away, and every 3 min sendApproved()   → delivers approved editions in resumable passes.
//
// Safety properties (all unit-tested, see scripts/tests/newsletter.workflow.test.ts):
//   • One campaign per (ISO week, language): preparing twice cannot create a second one.
//   • Nothing is sent without approval — there is no code path from "draft" to "mailed".
//   • An address is CLAIMED (a row in newsletter_deliveries) before it is mailed, so a double click, a retry or two
//     overlapping passes can never mail the same person twice.
//   • A temporary failure (rate limit, timeout) leaves the address un-handled for the next pass; a permanent one
//     (bad address) is recorded as failed and not retried.
//   • Every message carries a personal, signed unsubscribe link + the one-click List-Unsubscribe headers; without a
//     signing key nothing is sent at all.
// ============================================================================
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { brandedEmail, sendEmail, sendEmailBatch, type BatchMessage } from '@/lib/email';
import { escapeHtml, safeHttpUrl } from '@/lib/util';
import { LOCALES, type Locale } from '@/lib/locales';
import {
  UNSUB_PLACEHOLDER, personalise, unsubscribeHeaders, unsubscribeSecret, unsubscribeUrl,
} from '@/lib/newsletterUnsub';
import { auditLog } from '@/lib/audit';
import { deliver, isoWeekId, pendingRecipients, sameSlugSet, type DeliveryPorts } from '@/lib/newsletterPlan';

import { logServerError } from '@/lib/monitor.server';

export { isFridayUtc, isoWeekId } from '@/lib/newsletterPlan';

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');

// ── composing the edition ────────────────────────────────────────────────────

interface PostCard { slug: string; title: string; excerpt: string; cover_image: string | null }

async function latestFor(sb: SupabaseClient, locale: Locale, limit = 6): Promise<PostCard[]> {
  const { data } = await sb.from('blog_posts')
    .select(`slug, cover_image, title_${locale}, excerpt_${locale}, title_en, excerpt_en`)
    .eq('status', 'published').order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as Record<string, string | null>[]).map((r) => ({
    slug: String(r.slug),
    title: String(r[`title_${locale}`] || r.title_en || ''),
    excerpt: String(r[`excerpt_${locale}`] || r.excerpt_en || ''),
    cover_image: r.cover_image ?? null,
  })).filter((c) => c.title);
}

function digestHtml(locale: Locale, cards: PostCard[]): string {
  const base = site();
  const path = locale === 'en' ? '' : `/${locale}`;
  return cards.map((c) => `
    <table role="presentation" width="100%" style="margin:0 0 22px"><tr>
      ${safeHttpUrl(c.cover_image) ? `<td width="120" style="padding-inline-end:14px;vertical-align:top"><img src="${escapeHtml(safeHttpUrl(c.cover_image))}" width="120" style="width:120px;border-radius:2px" alt=""></td>` : ''}
      <td style="vertical-align:top">
        <a href="${base}${path}/article/${encodeURIComponent(c.slug)}" style="color:#16181C;text-decoration:none;font-weight:700;font-size:17px">${escapeHtml(c.title)}</a>
        <p style="margin:6px 0 0;color:#4a463d;font-size:14px;line-height:1.5">${escapeHtml(c.excerpt)}</p>
      </td>
    </tr></table>`).join('');
}

// A single tasteful sponsor block for the "sole sponsor" newsletter product.
function sponsorBlockHtml(s: Record<string, unknown>): string {
  const name = escapeHtml(s.advertiser_name || '');
  const headline = escapeHtml(s.headline || s.advertiser_name || '');
  const body = escapeHtml(s.body || '');
  const url = escapeHtml(safeHttpUrl(s.url));
  const image = escapeHtml(safeHttpUrl(s.image));
  if (!headline && !body) return '';
  const cta = url ? `<a href="${url}" style="color:#8a5b12;text-decoration:none;font-weight:700">${name || 'Learn more'} →</a>` : '';
  return `
    <table role="presentation" width="100%" style="margin:0 0 26px;background:#FBF7EE;border:1px solid #e7d3a8;border-radius:4px">
      <tr><td style="padding:14px 16px">
        <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a9832f;font-weight:700;margin-bottom:6px">In partnership with${name ? ` ${name}` : ''}</div>
        ${image ? `<img src="${image}" width="140" style="width:140px;border-radius:2px;margin:0 0 8px" alt="">` : ''}
        <div style="font-weight:700;color:#16181C;font-size:16px">${headline}</div>
        ${body ? `<p style="margin:6px 0 8px;color:#4a463d;font-size:14px;line-height:1.5">${body}</p>` : ''}
        ${cta}
      </td></tr>
    </table>`;
}

export const DIGEST_SUBJECT: Record<Locale, string> = {
  en: 'The Dispatch — this week from Cyprus',
  el: 'Το εβδομαδιαίο δελτίο από την Κύπρο',
  ro: 'Buletinul săptămânal din Cipru',
  ar: 'نشرة الأسبوع من قبرص',
  de: 'Der wöchentliche Newsletter aus Zypern',
  pl: 'Cotygodniowy przegląd z Cypru',
  ru: 'Еженедельная рассылка с Кипра',
};

// ── step 1: prepare drafts ───────────────────────────────────────────────────

export interface PrepareResult { week: string; created: string[]; refreshed: string[]; skipped: Record<string, string> }

/**
 * Create (or, with `regenerate`, refresh) this week's DRAFT for each edition. Idempotent. Sends nothing.
 * `force` also prepares an edition whose articles are identical to the last one sent.
 */
export async function prepareDigest(
  sb: SupabaseClient,
  opts: { only?: Locale; now?: Date; regenerate?: boolean; force?: boolean } = {},
): Promise<PrepareResult> {
  const now = opts.now ?? new Date();
  const week = isoWeekId(now);
  const locales = opts.only ? [opts.only] : [...LOCALES];
  const out: PrepareResult = { week, created: [], refreshed: [], skipped: {} };

  const today = now.toISOString().slice(0, 10);
  const { data: sponsorRows } = await sb.from('newsletter_sponsors')
    .select('*').eq('status', 'scheduled').or(`send_date.is.null,send_date.lte.${today}`);
  const sponsors = (sponsorRows || []) as Record<string, unknown>[];
  const sponsorFor = (loc: string) => sponsors.find((s) => s.target_language === loc) || sponsors.find((s) => s.target_language === 'all') || null;

  for (const locale of locales) {
    const { data: existing } = await sb.from('newsletter_campaigns')
      .select('id, status').eq('edition_week', week).eq('target_language', locale).maybeSingle();
    if (existing && existing.status !== 'draft') { out.skipped[locale] = `already ${existing.status} this week`; continue; }
    if (existing && !opts.regenerate) { out.skipped[locale] = 'draft already prepared'; continue; }

    const cards = await latestFor(sb, locale);
    if (cards.length === 0) { out.skipped[locale] = 'no published articles'; continue; }
    const slugs = cards.map((c) => c.slug);

    if (!opts.force) {
      const { data: last } = await sb.from('newsletter_campaigns').select('article_slugs')
        .eq('target_language', locale).eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle();
      if (last && sameSlugSet(slugs, (last.article_slugs as string[] | null) || [])) { out.skipped[locale] = 'nothing new since the last edition'; continue; }
    }

    const { count } = await sb.from('newsletter_subscribers').select('id', { count: 'exact', head: true })
      .eq('confirmed', true).eq('is_active', true).eq('language', locale);
    if (!count) { out.skipped[locale] = 'no confirmed subscribers'; continue; }

    const sp = sponsorFor(locale);
    const sponsorHtml = sp ? sponsorBlockHtml(sp) : '';
    const subject = DIGEST_SUBJECT[locale];
    const html = brandedEmail({
      locale, heading: subject, bodyHtml: sponsorHtml + digestHtml(locale, cards),
      preheader: escapeHtml(cards[0]?.title), unsubscribe: UNSUB_PLACEHOLDER,
    });
    const row = {
      subject, content: html, target_language: locale, recipient_count: count,
      article_slugs: slugs, sponsor_ids: sp && sponsorHtml ? [String(sp.id)] : [],
    };

    if (existing) {
      const { error } = await sb.from('newsletter_campaigns').update(row).eq('id', existing.id).eq('status', 'draft');
      if (error) out.skipped[locale] = `could not refresh: ${error.message}`; else out.refreshed.push(locale);
    } else {
      const { error } = await sb.from('newsletter_campaigns').insert({ ...row, status: 'draft', edition_week: week });
      if (!error) out.created.push(locale);
      else if (/duplicate|unique/i.test(error.message)) out.skipped[locale] = 'draft already prepared';   // lost a race with another run
      else out.skipped[locale] = `could not create: ${error.message}`;
    }
  }
  return out;
}

/** Tell the person who approves (env NEWSLETTER_APPROVER_EMAIL) that drafts are waiting. Best-effort. */
export async function notifyApprover(r: PrepareResult): Promise<boolean> {
  const to = (process.env.NEWSLETTER_APPROVER_EMAIL || '').trim();
  if (!to || r.created.length === 0) return false;
  const html = brandedEmail({
    locale: 'en', heading: 'The Friday newsletter is ready for your approval',
    bodyHtml: `<p>${r.created.length} edition(s) were prepared (${r.created.join(', ')}). <b>Nothing has been sent.</b> Review each edition, send yourself a test, then approve.</p>`,
    ctaLabel: 'Review & approve', ctaUrl: `${site()}/admin/newsletter`,
  });
  return (await sendEmail({ to, subject: `Newsletter ${r.week}: ready for approval`, html })).ok;
}

// ── step 2: approve / cancel / test ──────────────────────────────────────────

export type ApproveOutcome = { ok: true } | { ok: false; error: string };

export async function approveCampaign(sb: SupabaseClient, id: string, adminId: string | null): Promise<ApproveOutcome> {
  if (!unsubscribeSecret()) return { ok: false, error: 'No signing key for the unsubscribe links. Set NEWSLETTER_UNSUB_SECRET (or CRON_SECRET) in the server environment first.' };
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  const { data, error } = await sb.from('newsletter_campaigns')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', id).eq('status', 'draft').select('id').maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Only a draft can be approved (it may already be approved, sent or cancelled).' };
  return { ok: true };
}

export async function cancelCampaign(sb: SupabaseClient, id: string): Promise<boolean> {
  const { data } = await sb.from('newsletter_campaigns').update({ status: 'cancelled' })
    .eq('id', id).in('status', ['draft', 'approved']).select('id').maybeSingle();
  return !!data;
}

export async function sendTest(sb: SupabaseClient, id: string, to: string): Promise<{ ok: boolean; error?: string }> {
  const { data } = await sb.from('newsletter_campaigns').select('subject, content, target_language').eq('id', id).maybeSingle();
  if (!data?.content) return { ok: false, error: 'Campaign not found.' };
  const secret = unsubscribeSecret();
  const url = secret ? unsubscribeUrl(site(), to, String(data.target_language), secret) : `${site()}/`;
  return sendEmail({ to, subject: `[TEST] ${data.subject}`, html: personalise(String(data.content), url), headers: secret ? unsubscribeHeaders(url) : undefined });
}

// ── step 3: deliver approved campaigns (resumable) ───────────────────────────

export interface SendSummary { campaigns: number; sent: number; failed: number; finished: string[]; note?: string }

export async function sendApproved(sb: SupabaseClient, opts: { deadlineMs?: number } = {}): Promise<SendSummary> {
  const t0 = Date.now();
  const deadline = t0 + (opts.deadlineMs ?? 45_000);
  const summary: SendSummary = { campaigns: 0, sent: 0, failed: 0, finished: [] };

  const { data: camps } = await sb.from('newsletter_campaigns')
    .select('id, subject, content, target_language, status, sponsor_ids, edition_week')
    .in('status', ['approved', 'sending']).order('created_at', { ascending: true }).limit(10);
  if (!camps || camps.length === 0) return summary;

  const secret = unsubscribeSecret();
  if (!secret) { summary.note = 'no unsubscribe signing key — nothing sent'; await logServerError('newsletter-send', new Error(summary.note), {}, 'warn'); return summary; }

  for (const c of camps) {
    if (Date.now() >= deadline) break;
    const id = String(c.id);
    const locale = String(c.target_language);
    summary.campaigns++;
    await sb.from('newsletter_campaigns').update({ status: 'sending' }).eq('id', id).in('status', ['approved', 'sending']);
    await sb.from('newsletter_campaigns').update({ send_started_at: new Date().toISOString() }).eq('id', id).is('send_started_at', null);

    // Stale claims from a pass that died mid-way are released; everything else stays claimed.
    await sb.from('newsletter_deliveries').delete().eq('campaign_id', id).eq('status', 'queued')
      .lt('at', new Date(Date.now() - 15 * 60_000).toISOString());

    let q = sb.from('newsletter_subscribers').select('email').eq('confirmed', true).eq('is_active', true);
    if (locale !== 'all') q = q.eq('language', locale);
    const { data: subs } = await q;
    const { data: done } = await sb.from('newsletter_deliveries').select('email').eq('campaign_id', id);
    const pending = pendingRecipients(((subs || []) as { email: string }[]).map((s) => s.email), ((done || []) as { email: string }[]).map((d) => d.email));

    const content = String(c.content || '');
    const subject = String(c.subject || '');
    const link = (email: string) => unsubscribeUrl(site(), email, locale === 'all' ? 'en' : locale, secret);
    const message = (email: string): BatchMessage => ({ to: email, subject, html: personalise(content, link(email)), headers: unsubscribeHeaders(link(email)) });

    const ports: DeliveryPorts = {
      async claim(emails) {
        const { data } = await sb.from('newsletter_deliveries')
          .upsert(emails.map((email) => ({ campaign_id: id, email, status: 'queued' })), { onConflict: 'campaign_id,email', ignoreDuplicates: true })
          .select('email');
        return ((data || []) as { email: string }[]).map((r) => r.email);
      },
      async sendBatch(emails) { return sendEmailBatch(emails.map(message)); },
      async sendOne(email) { const m = message(email); return sendEmail({ to: m.to, subject: m.subject, html: m.html, headers: m.headers }); },
      async record(rows) {
        await sb.from('newsletter_deliveries').upsert(
          rows.map((r) => ({ campaign_id: id, email: r.email, status: r.status, error: r.error ?? null, at: new Date().toISOString() })),
          { onConflict: 'campaign_id,email' },
        );
      },
      async release(emails) { await sb.from('newsletter_deliveries').delete().eq('campaign_id', id).eq('status', 'queued').in('email', emails); },
      now: () => Date.now(),
    };

    const r = await deliver(pending, ports, { deadline });
    summary.sent += r.sent; summary.failed += r.failed;

    if (r.stoppedBy === 'done' && r.remaining === 0) {
      const { count: sentN } = await sb.from('newsletter_deliveries').select('email', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'sent');
      const { count: failN } = await sb.from('newsletter_deliveries').select('email', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'failed');
      // Only the pass that flips approved/sending → sent does the book-keeping (a second, overlapping pass finds it already done).
      const { data: closed } = await sb.from('newsletter_campaigns').update({
        status: 'sent', sent_at: new Date().toISOString(), recipient_count: sentN ?? 0, failed_count: failN ?? 0,
      }).eq('id', id).in('status', ['approved', 'sending']).select('id').maybeSingle();
      if (closed) {
        const sponsorIds = ((c.sponsor_ids as string[] | null) || []).filter(Boolean);
        if (sponsorIds.length) await sb.from('newsletter_sponsors').update({ status: 'sent' }).in('id', sponsorIds);
        summary.finished.push(id);
        await auditLog(sb, { action: 'newsletter.sent', table: 'newsletter_campaigns', rowId: id, summary: `${c.edition_week} ${locale}: ${sentN ?? 0} sent, ${failN ?? 0} failed` });
      }
    }
    if (r.stoppedBy === 'transient') summary.note = 'paused on a temporary mail-service error; the next pass resumes';
  }
  return summary;
}
