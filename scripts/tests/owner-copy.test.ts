// lib/directory/ownerCopy.ts + lib/i18n/notices.ts — claim/owner/newsletter-confirm/DSAR copy in 7 editions.
import { claimVerifyMail, manageLinkMail, pageCopy, withBiz, withBizText } from '../../lib/directory/ownerCopy';
import { confirmPageCopy, dsarAckCopy } from '../../lib/i18n/notices';
import { LOCALES } from '../../lib/locales';
import { eq, ok, report } from './_harness';

const BIZ = 'Café <Zephyr> & Sons';
for (const l of LOCALES) {
  const c = claimVerifyMail(l, BIZ), m = manageLinkMail(l, BIZ);
  ok(`${l}: claim mail complete`, [c.subject, c.heading, c.bodyHtml, c.ctaLabel, c.preheader].every((s) => s.trim().length > 3));
  ok(`${l}: manage mail complete`, [m.subject, m.heading, m.bodyHtml, m.ctaLabel, m.preheader].every((s) => s.trim().length > 3));
  ok(`${l}: business name HTML-escaped in body + heading`, !c.bodyHtml.includes('<Zephyr>') && c.bodyHtml.includes('Café &lt;Zephyr&gt; &amp; Sons') && !c.heading.includes('<Zephyr>'));
  ok(`${l}: no unfilled placeholder`, ![c, m].some((x) => /\{biz\}/.test(JSON.stringify(x))));
  ok(`${l}: 72h / 60min validity stated`, /72/.test(c.bodyHtml) && /60/.test(m.bodyHtml));
  const p = pageCopy(l);
  ok(`${l}: every page string non-empty`, Object.values(p).every((s) => typeof s === 'string' && s.trim().length > 2));
  ok(`${l}: confirm page has {biz} slots`, p.confirmH.includes('{biz}') && p.confirmP1.includes('{biz}') && p.confirmTitle.includes('{biz}'));
  const n = confirmPageCopy(l), a = dsarAckCopy(l);
  ok(`${l}: notices complete`, [n.ok, n.bad, n.home, a.subject, a.heading, a.body].every((s) => s.trim().length > 3));
  if (l !== 'en') {
    ok(`${l}: differs from English`, c.heading !== claimVerifyMail('en', BIZ).heading && p.linkH !== pageCopy('en').linkH && n.ok !== confirmPageCopy('en').ok);
  }
}
eq('subject is plain text (not escaped) and single-line', claimVerifyMail('en', 'A & B\r\nBcc: x@y.z').subject, 'Verify your claim — A & B Bcc: x@y.z');
eq('English claim mail keeps the original wording', claimVerifyMail('en', 'Acme').heading, 'Confirm your claim of Acme');
ok('English manage mail keeps original CTA', manageLinkMail('en', 'Acme').ctaLabel === 'Open listing editor');
eq('unknown locale falls back to English', claimVerifyMail('xx', 'Acme'), claimVerifyMail('en', 'Acme'));
eq('withBiz escapes', withBiz('x {biz}', '<b>'), 'x &lt;b&gt;');
eq('withBizText keeps raw (the shell escapes the title)', withBizText('x {biz}', '<b>'), 'x <b>');
ok('Arabic copy is Arabic script', /[؀-ۿ]/.test(claimVerifyMail('ar', 'X').heading));
report('owner-copy');
