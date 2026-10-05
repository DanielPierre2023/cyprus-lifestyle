// Small pure helpers behind Admin → Members / Audit log / revalidate.
import { auditRow } from '@/lib/audit';
import { checkGrant, isComp, memberStats, membersCsv, type MemberRow } from '@/lib/membersAdmin';
import { pathsFor, tagsFor } from '@/lib/revalidatePaths';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-05T12:00:00Z');
const m = (o: Partial<MemberRow>): MemberRow => ({ id: 'x', email: 'a@b.co', tier: 'concierge', status: 'active', created_at: '2026-09-01T00:00:00Z', current_period_end: null, cancel_at_period_end: false, stripe_subscription_id: 'sub_1', profile: null, ...o });

// audit
{
  const r = auditRow({ actor: 'u1', actorEmail: 'a@b.co', action: 'newsletter.approve', table: 'newsletter_campaigns', rowId: 'c1', summary: 's'.repeat(500), changes: { k: 1 } });
  eq('audit row', [r.source, r.action, r.table_name, r.row_id, r.actor_email], ['api', 'newsletter.approve', 'newsletter_campaigns', 'c1', 'a@b.co']);
  eq('summary is capped', (r.summary as string).length, 300);
  eq('missing fields become null', auditRow({ action: 'x' }), { actor: null, actor_email: null, source: 'api', action: 'x', table_name: null, row_id: null, summary: null, changes: null });
}

// members
{
  const rows = [
    m({ id: '1' }), m({ id: '2', cancel_at_period_end: true }), m({ id: '3', stripe_subscription_id: null }),
    m({ id: '4', status: 'canceled' }), m({ id: '5', created_at: '2026-10-01T00:00:00Z' }),
  ];
  eq('stats (monthly €19)', memberStats(rows, 19, 'month', NOW), { activePaid: 3, activeComp: 1, cancelling: 1, canceled: 1, new30d: 1, mrrGross: 57 });
  eq('yearly price is normalised to a month', memberStats([m({})], 120, 'year', NOW).mrrGross, 10);
  ok('complimentary = no Stripe subscription', isComp({ stripe_subscription_id: null }) && !isComp({ stripe_subscription_id: 'sub_1' }));
  eq('grant: ok and normalised', checkGrant('  New@Example.COM ', []), { ok: true, email: 'new@example.com' });
  ok('grant: invalid address refused', !checkGrant('nope', []).ok && !checkGrant(undefined, []).ok);
  ok('grant: already active refused (case-insensitive)', !checkGrant('A@B.co', [{ email: 'a@b.CO', status: 'active' }]).ok);
  ok('grant: a canceled member can be granted again', checkGrant('a@b.co', [{ email: 'a@b.co', status: 'canceled' }]).ok);
  const csv = membersCsv([m({ email: '=HYPERLINK("x")' }), m({ email: 'q"uote@b.co', stripe_subscription_id: null })]);
  ok('csv neutralises spreadsheet formulas', csv.includes(`"'=HYPERLINK(""x"")"`));
  ok('csv escapes quotes and marks complimentary', csv.includes('"q""uote@b.co"') && csv.includes('"complimentary"'));
}

// revalidate paths
{
  const p = pathsFor({ slug: 'my-article-1', category: 'property' });
  eq('7 editions × (home + category + article)', p.length, 21);
  ok('default edition has no prefix, others do', p.includes('/') && p.includes('/article/my-article-1') && p.includes('/de/property') && p.includes('/ar'));
  eq('unsafe values are ignored (no path traversal)', pathsFor({ slug: '../../admin', category: 'a/b' }).length, 7);
  eq('nothing given → just the home pages', pathsFor({}).length, 7);
  eq('publish also refreshes by tag: article + home + category', tagsFor({ slug: 'my-article-1', category: 'property' }), ['article:my-article-1', 'home', 'cat:property']);
  eq('no slug / unsafe slug → no tags', [tagsFor({}), tagsFor({ slug: '../x' })], [[], []]);
}

report('admin.helpers');
