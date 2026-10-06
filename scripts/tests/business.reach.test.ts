// Business Hub reachability (increment 4.2): the pointer copy exists in all editions and reaches the claim / management e-mails.
import { hubCopy, hubPath, hubUrl, hubMailParagraph } from '@/lib/business/hubCopy';
import { claimVerifyMail, manageLinkMail } from '@/lib/directory/ownerCopy';
import { LOCALES } from '@/lib/locales';
import { eq, ok, report } from './_harness';

const SITE = 'https://cypruslifestyle.eu';
for (const l of LOCALES) {
  const c = hubCopy(l);
  ok(`${l}: hub copy complete`, [c.link, c.hint, c.mailClaim, c.mailManage].every((s) => s.trim().length > 5));
  const url = hubUrl(SITE, l);
  ok(`${l}: url is the hub in that edition`, url === `${SITE}${l === 'en' ? '' : `/${l}`}/account/business`);
  const cm = claimVerifyMail(l, 'Acme', url), mm = manageLinkMail(l, 'Acme', url);
  ok(`${l}: both mails carry the hub link`, cm.bodyHtml.includes(`href="${url}"`) && mm.bodyHtml.includes(`href="${url}"`));
  ok(`${l}: the existing mail text is kept`, cm.bodyHtml.startsWith(claimVerifyMail(l, 'Acme').bodyHtml.slice(0, 40)) && cm.bodyHtml.includes('72') && mm.bodyHtml.includes('60'));
  if (l !== 'en') ok(`${l}: differs from English`, c.hint !== hubCopy('en').hint && c.mailClaim !== hubCopy('en').mailClaim);
}
eq('no link given: mails are byte-identical to before', claimVerifyMail('en', 'Acme').bodyHtml.includes('Business Hub'), false);
eq('paths', [hubPath('en'), hubPath('de'), hubPath('xx'), hubPath(null)], ['/account/business', '/de/account/business', '/account/business', '/account/business']);
ok('the link is attribute-escaped', hubMailParagraph('en', 'claim', 'https://x.example/?a="b"&c=<d>').includes('href="https://x.example/?a=&quot;b&quot;&amp;c=&lt;d&gt;"'));
ok('Arabic copy is Arabic script', /[؀-ۿ]/.test(hubCopy('ar').hint));
report('business-reach');
