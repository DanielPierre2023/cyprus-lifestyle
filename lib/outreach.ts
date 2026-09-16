// Cyprus Lifestyle — outreach engine.
// Walks each enrolled business through the cadence (Day 0 → +N), rendering the
// step template and either SENDING (when sending is switched on and a from-
// address is set) or PREVIEWING (rendering only, no send, no state change).
//
// Nothing is ever emailed unless crm_settings.sending_enabled is true, a
// from_email is set, and RESEND_API_KEY exists. Preview mode is read-only, so
// running it never "burns" a step. Only a committed run advances the cadence.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { brandedEmail, sendEmail } from '@/lib/email';

const GAP_DEFAULT = [4, 4, 6]; // days after step 1→2, 2→3, 3→4
const MAX_CAP = 200;

const VERTICAL_LABEL: Record<string, string> = {
  'law-relocation': 'relocation & law',
  'car-rental-prestige': 'prestige car rental',
  'beauty-spa': 'beauty & spa',
  'luxury-retail': 'luxury retail',
  'fine-dining': 'fine dining',
  'luxury-realestate': 'luxury real estate',
  'interior-design': 'interior design',
  'yacht-marine': 'yachting & marine',
  'art-culture': 'art & galleries',
  'private-health': 'private healthcare',
  gourmet: 'gourmet & fine wine',
};

const FOLLOWUP_ANGLE = 'With the season picking up, this is when new readers discover places for the first time.';

type Row = Record<string, any>;

function render(tpl: string, vars: Record<string, string>): string {
  return (tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : ''));
}

export interface OutreachResult {
  live: boolean;
  commit: boolean;
  processed: number;
  sent: number;
  previewed: number;
  skipped: number;
  done: number;
  errors: string[];
  preview: Array<{ business: string; email: string; step: number; subject: string }>;
  note?: string;
}

/**
 * Run the cadence.
 * @param opts.commit  false = preview only (no send, no state change); true = send + advance
 * @param opts.max     cap the batch (defaults to settings.daily_cap)
 */
export async function runOutreach(sb: SupabaseClient, opts: { commit: boolean; max?: number }): Promise<OutreachResult> {
  const out: OutreachResult = { live: false, commit: opts.commit, processed: 0, sent: 0, previewed: 0, skipped: 0, done: 0, errors: [], preview: [] };

  const { data: sRow } = await sb.from('crm_settings').select('*').eq('id', 1).maybeSingle();
  const settings = (sRow || {}) as Row;
  const hasKey = !!process.env.RESEND_API_KEY;
  out.live = !!settings.sending_enabled && !!settings.from_email && hasKey;

  if (opts.commit && !out.live) {
    out.note = !settings.sending_enabled
      ? 'Sending is switched off — turn it on in Sponsors → Outreach settings.'
      : !settings.from_email
      ? 'No from-address set yet — add one in Sponsors → Outreach settings.'
      : 'RESEND_API_KEY is not configured on the server.';
    return out;
  }

  const cap = Math.min(opts.max ?? Number(settings.daily_cap) ?? 40, MAX_CAP);
  const gaps: number[] = Array.isArray(settings.gap_days) ? settings.gap_days : GAP_DEFAULT;
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://cyprus-lifestyle.vercel.app';
  const senderName = settings.from_name || 'Cyprus Lifestyle';
  const fromAddr = settings.from_email
    ? (settings.from_name ? `${settings.from_name} <${settings.from_email}>` : String(settings.from_email))
    : undefined;

  const { data: dueRows } = await sb
    .from('crm_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_send_at', new Date().toISOString())
    .order('next_send_at', { ascending: true })
    .limit(cap);
  const due = (dueRows || []) as Row[];
  if (!due.length) { out.note = 'No businesses are due right now.'; return out; }

  const { data: tplRows } = await sb.from('crm_templates').select('*').eq('active', true);
  const templates = new Map<number, Row>((tplRows || []).map((t: Row) => [t.step, t]));
  const { data: hookRows } = await sb.from('crm_hooks').select('*');
  const hooks = new Map<string, string>((hookRows || []).map((h: Row) => [h.category, h.hook]));

  for (const e of due) {
    out.processed++;
    const nextStep = (e.step || 0) + 1;
    if (nextStep > 4) {
      if (opts.commit) await sb.from('crm_enrollments').update({ status: 'done' }).eq('id', e.id);
      out.done++;
      continue;
    }
    const tpl = templates.get(nextStep);
    if (!tpl) { out.skipped++; out.errors.push(`step ${nextStep}: no template`); continue; }

    const { data: org } = await sb.from('crm_orgs').select('id,name,category').eq('id', e.org_id).maybeSingle();
    if (!org) { out.skipped++; continue; }

    const { data: contactRows } = await sb
      .from('crm_contacts').select('*').eq('org_id', e.org_id)
      .order('is_role_address', { ascending: false });
    const contact = ((contactRows || []) as Row[]).find((c) => c.email);
    if (!contact || !contact.email) {
      if (opts.commit) await sb.from('crm_enrollments').update({ status: 'paused' }).eq('id', e.id);
      out.skipped++; out.errors.push(`${org.name}: no email on file`);
      continue;
    }

    const email = String(contact.email).toLowerCase();
    const domain = email.split('@')[1] || '';
    const { data: supp } = await sb
      .from('crm_suppression').select('id')
      .or(`email.eq.${email},domain.eq.${domain}`).limit(1);
    if (supp && supp.length) {
      if (opts.commit) await sb.from('crm_enrollments').update({ status: 'unsubscribed' }).eq('id', e.id);
      out.skipped++;
      continue;
    }

    const vars: Record<string, string> = {
      first_name: (contact.name ? String(contact.name).split(' ')[0] : '') || 'there',
      business: org.name || '',
      vertical_label: VERTICAL_LABEL[org.category] || org.category || 'your',
      hook: hooks.get(org.category) || '',
      followup_angle: FOLLOWUP_ANGLE,
      sender_name: senderName,
    };
    const subject = render(tpl.subject, vars);
    const innerHtml = render(tpl.body, vars);
    const unsubUrl = `${site}/api/unsubscribe?c=${contact.id}&t=${contact.unsub_token}`;
    const html = brandedEmail({ locale: 'en', heading: subject.replace(/[?]+$/, ''), bodyHtml: innerHtml, preheader: subject })
      .split('{{unsubscribe}}').join(unsubUrl);

    out.preview.push({ business: org.name, email: contact.email, step: nextStep, subject });

    if (!opts.commit) { out.previewed++; continue; }

    // committed send
    let logType = 'email';
    let note: string | null = null;
    const sent = await sendEmail({ to: contact.email, subject, html, replyTo: settings.reply_to || undefined, from: fromAddr });
    if (sent.ok) { out.sent++; }
    else { logType = 'email-failed'; note = sent.error || 'send failed'; out.errors.push(`${org.name}: ${sent.error}`); }

    await sb.from('crm_activities').insert({
      org_id: e.org_id, contact_id: contact.id, type: logType,
      sequence_id: `default:${nextStep}`, subject, body: note,
    });

    const patch: Row = { step: nextStep, last_send_at: new Date().toISOString() };
    if (nextStep >= 4) patch.status = 'done';
    else patch.next_send_at = new Date(Date.now() + (gaps[nextStep - 1] ?? 5) * 86400000).toISOString();
    await sb.from('crm_enrollments').update(patch).eq('id', e.id);
  }

  return out;
}
