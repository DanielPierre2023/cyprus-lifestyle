// lib/newsletterPlan.ts
// Pure, I/O-free parts of the newsletter workflow (safe to import from the browser and from tests):
// the ISO-week id of an edition, recipient bookkeeping, and the delivery loop with its guarantees.
// The server module lib/newsletterDigest.ts plugs the database and the mail service into it.

/** ISO-8601 week of a date (UTC), e.g. "2026-W41". The unit a campaign belongs to. */
export function isoWeekId(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));          // the Thursday of this week decides the year
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
export const isFridayUtc = (d: Date) => d.getUTCDay() === 5;

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Subscribers still to be handled: de-duplicated (case-insensitive) and minus everyone already handled. */
export function pendingRecipients(all: string[], handled: Iterable<string>): string[] {
  const done = new Set<string>();
  for (const h of handled) done.add(String(h).toLowerCase());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of all) {
    const e = String(raw || '').trim().toLowerCase();
    if (!e || done.has(e) || seen.has(e)) continue;
    seen.add(e); out.push(e);
  }
  return out;
}

export function sameSlugSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

/** A failure that says nothing about the ADDRESS (rate limit, timeout, outage): try again later, don't write it off. */
export function isTransientSendError(message: string | undefined): boolean {
  return /rate.?limit|too many|429|timeout|timed out|abort|network|fetch failed|econn|enotfound|temporar|unavailable|5\d\d\b|not configured/i.test(String(message || ''));
}

// ── delivery loop (pure orchestration — I/O is injected so the guarantees can be tested) ─────────────

export interface DeliveryPorts {
  /** Claim these addresses; returns only those THIS pass now owns (another pass may have claimed some). */
  claim(emails: string[]): Promise<string[]>;
  sendBatch(emails: string[]): Promise<{ ok: boolean; error?: string }>;
  sendOne(email: string): Promise<{ ok: boolean; error?: string }>;
  record(rows: { email: string; status: 'sent' | 'failed'; error?: string }[]): Promise<void>;
  /** Give claimed addresses back (temporary failure) so the next pass retries them. */
  release(emails: string[]): Promise<void>;
  now(): number;
}
export interface DeliveryResult { sent: number; failed: number; remaining: number; stoppedBy: 'done' | 'deadline' | 'transient' }

export async function deliver(pending: string[], ports: DeliveryPorts, opts: { deadline: number; batchSize?: number }): Promise<DeliveryResult> {
  const size = Math.max(1, Math.min(100, opts.batchSize ?? 50));
  let sent = 0, failed = 0, handled = 0;
  const total = pending.length;
  for (const group of chunk(pending, size)) {
    if (ports.now() >= opts.deadline) return { sent, failed, remaining: total - handled, stoppedBy: 'deadline' };
    const mine = await ports.claim(group);
    handled += group.length - mine.length;                              // somebody else owns those; not ours to count
    if (mine.length === 0) continue;

    const batch = await ports.sendBatch(mine);
    if (batch.ok) {
      await ports.record(mine.map((email) => ({ email, status: 'sent' as const })));
      sent += mine.length; handled += mine.length;
      continue;
    }
    if (isTransientSendError(batch.error)) {                            // nothing was mailed; leave them for the next pass
      await ports.release(mine);
      return { sent, failed, remaining: total - handled, stoppedBy: 'transient' };
    }
    // The batch was refused (e.g. one invalid address spoils a Resend batch): find the culprit one by one.
    for (let i = 0; i < mine.length; i++) {
      const email = mine[i];
      if (ports.now() >= opts.deadline) { await ports.release(mine.slice(i)); return { sent, failed, remaining: total - handled, stoppedBy: 'deadline' }; }
      const r = await ports.sendOne(email);
      if (r.ok) { await ports.record([{ email, status: 'sent' }]); sent++; handled++; }
      else if (isTransientSendError(r.error)) { await ports.release(mine.slice(i)); return { sent, failed, remaining: total - handled, stoppedBy: 'transient' }; }
      else { await ports.record([{ email, status: 'failed', error: String(r.error || 'rejected').slice(0, 200) }]); failed++; handled++; }
    }
  }
  return { sent, failed, remaining: total - handled, stoppedBy: 'done' };
}

/** Stands in for the unsubscribe link inside the stored newsletter HTML; each reader's own link replaces it at send time. */
export const UNSUB_PLACEHOLDER = '{{UNSUB_URL}}';
export const personalise = (html: string, url: string) => html.split(UNSUB_PLACEHOLDER).join(url);
