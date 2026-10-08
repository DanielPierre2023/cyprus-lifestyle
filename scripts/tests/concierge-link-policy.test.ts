// The concierge speaks as Cyprus Lifestyle: no other site named or linked as a source, every GetYourGuide link ours.
import { applyLinkPolicy, LinkPolicyStream, scrubSourceNames, isBlockedHost, isOfficialAuthorityUrl, hostOf, HOUSE_NAME } from '@/lib/concierge/linkPolicy';
import { gygPartnerIdFromEnv } from '@/lib/gyg';
import { eq, ok, report } from './_harness';

const P = gygPartnerIdFromEnv();
const run = (s: string) => applyLinkPolicy(s).text;

// 1. blocked sites: bare URLs
eq('a blocked URL is removed with its ": " lead', run('Troodos is lovely: https://mycypruslife.com/troodos'), 'Troodos is lovely');
eq('a blocked URL after a dash is removed with the dash', run('Troodos is lovely - https://www.visitcyprus.com/troodos'), 'Troodos is lovely');
eq('a bullet that only holds a blocked URL disappears', run('More:\n- https://visitcyprus.com/x\n- Our guide: https://cyprus-lifestyle.com/guide/y'), 'More:\n- Our guide: https://cyprus-lifestyle.com/guide/y');
eq('closing punctuation survives a removed URL', run('Read https://www.visitcyprus.com/events/. Then relax.'), 'Read. Then relax.');
eq('a URL in brackets leaves no empty brackets', run('Hours vary (https://cyprus-mail.com/x) so call ahead.'), 'Hours vary so call ahead.');
eq('a "(see URL)" leaves nothing behind', run('Hours vary (see https://cyprus-mail.com/x) so call ahead.'), 'Hours vary so call ahead.');
eq('two blocked URLs are counted', [applyLinkPolicy('see https://www.mycypruslife.com/a and https://in-cyprus.philenews.com/b').removedUrls], [2]);
eq('a bare domain without scheme is removed', run('Details at visitcyprus.com/events tonight.'), 'Details at tonight.');
ok('subdomain and www forms are blocked', isBlockedHost('www.mycypruslife.com') && isBlockedHost('blog.visitcyprus.com') && isBlockedHost('en.wikipedia.org'));
ok('tripadvisor on any tld is blocked', isBlockedHost('www.tripadvisor.co.uk') && isBlockedHost('tripadvisor.com'));
ok('look-alike hosts are not blocked', !isBlockedHost('notmycypruslife.com') && !isBlockedHost('mycypruslife.com.example.org') && !isBlockedHost('visitcyprus.example.com'));
eq('our own pages are untouched', run('Guide: https://cyprus-lifestyle.com/ro/guide/x'), 'Guide: https://cyprus-lifestyle.com/ro/guide/x');
eq('official government pages are untouched', run('Confirm on https://www.mof.gov.cy/tax'), 'Confirm on https://www.mof.gov.cy/tax');
eq('a business website is untouched', run('Booking: https://hotel-example.com/rooms'), 'Booking: https://hotel-example.com/rooms');

// 2. markdown links keep the label
eq('markdown link to a blocked site keeps only the label', run('Try [the Troodos guide](https://mycypruslife.com/x) first'), 'Try the Troodos guide first');
eq('markdown link labelled with the site name disappears', run('Read more on [Visit Cyprus](https://visitcyprus.com/x).'), 'Read more on.');
eq('markdown link to our site is kept', run('[guide](https://cyprus-lifestyle.com/guide/x)'), '[guide](https://cyprus-lifestyle.com/guide/x)');

// 3. names and attribution phrases (all seven languages)
eq('"(via My Cyprus Life): URL" disappears', run('Hidden villages of Troodos (via My Cyprus Life): https://mycypruslife.com/t'), 'Hidden villages of Troodos');
eq('"according to Visit Cyprus," disappears', run('Entry is free, according to Visit Cyprus, until noon.'), 'Entry is free, until noon.');
eq('"according to the Cyprus Mail" disappears', run('Prices rose, according to the Cyprus Mail.'), 'Prices rose.');
eq('German "laut" disappears', run('Der Eintritt ist frei, laut Visit Cyprus.'), 'Der Eintritt ist frei.');
eq('German "Quelle:" disappears', run('Der Eintritt ist frei. Quelle: My Cyprus Life'), 'Der Eintritt ist frei.');
eq('Romanian "potrivit" disappears', run('Intrarea este gratuită, potrivit Visit Cyprus.'), 'Intrarea este gratuită.');
eq('Polish "według" disappears', run('Wstęp jest bezpłatny, według Cyprus Mail.'), 'Wstęp jest bezpłatny.');
eq('Russian "по данным" disappears', run('Вход бесплатный, по данным Visit Cyprus.'), 'Вход бесплатный.');
eq('Greek "σύμφωνα με" disappears', run('Η είσοδος είναι δωρεάν, σύμφωνα με το Visit Cyprus.'), 'Η είσοδος είναι δωρεάν.');
eq('Arabic "بحسب" disappears', run('الدخول مجاني، بحسب Visit Cyprus.'), 'الدخول مجاني.');
eq('a publication in an attribution phrase disappears', run('Rents rose, according to Reuters, last year.'), 'Rents rose, last year.');
eq('"via the Visit Cyprus website" disappears', run('Book in advance via the Visit Cyprus website.'), 'Book in advance.');
eq('"on <site>" goes with the site', run('I read it on My Cyprus Life yesterday.'), 'I read it yesterday.');
eq('"bei <site>" and "pe <site>" go with the site', [run('Das stand bei Cyprus Mail heute.'), run('Am citit pe My Cyprus Life azi.')], ['Das stand heute.', 'Am citit azi.']);
eq('a site name that is the subject becomes our own name', run('My Cyprus Life is a popular blog.'), `${HOUSE_NAME} is a popular blog.`);
eq('residual names are reported', applyLinkPolicy('My Cyprus Life is a popular blog.').residualNames, ['my cyprus life']);
eq('"<site> writes that …" becomes the plain statement', run('My Cyprus Life writes that the villages are quiet.'), 'The villages are quiet.');
eq('the same mid-sentence keeps its case', run('Yes, and Cyprus Mail says that rents rose.'), 'Yes, and rents rose.');
eq('a sentence that begins with an attribution and no comma keeps its grammar', run('Laut Visit Cyprus ist der Eintritt frei. Mehr Infos: https://www.visitcyprus.com/events/jazz-night'), `Laut ${HOUSE_NAME} ist der Eintritt frei.`);
eq('with a comma it is simply dropped and the next word capitalised', [run('Potrivit My Cyprus Life, plaja este liniștită.'), run('According to Wikipedia, Aphrodite\'s Rock is near Kouklia.')], ['Plaja este liniștită.', 'Aphrodite\'s Rock is near Kouklia.']);
eq('"Source: <site>" lines vanish, bold or not', [run('Stay hydrated.\n\nSource: Visit Cyprus'), run('**Source:** Visit Cyprus (https://www.visitcyprus.com/health)\n\nStay hydrated.')], ['Stay hydrated.', 'Stay hydrated.']);
eq('a "More info:" lead-in goes with its URL', [run('Hidden villages are lovely. More info: https://mycypruslife.com/x'), run('Mehr Infos: https://www.visitcyprus.com/x'), run('Подробнее — https://www.visitcyprus.com/ru/x')], ['Hidden villages are lovely.', '', '']);
eq('an "and" before a removed URL goes with it', run('Zobacz https://www.getyourguide.com/x-t1/ i https://www.tripadvisor.com/Attraction_Review-g190371').replace(/\?.*$/, ''), 'Zobacz https://www.getyourguide.com/x-t1/');
eq('a "More info:" lead-in before a kept URL stays', run('More info: https://hotel.example.com/book'), 'More info: https://hotel.example.com/book');
eq('a link label that names the site loses the name', run('Check out [this article on Cyprus Mail](https://cyprus-mail.com/x) for more.'), 'Check out this article for more.');
eq('a bracket that names a site but is not a link target is removed', run('Villages [My Cyprus Life] are lovely.'), 'Villages are lovely.');
eq('a capitalised "Visit Cyprus" in mid-sentence is the tourism board and becomes our name', run('Check the opening times — see Visit Cyprus for details.'), `Check the opening times — see ${HOUSE_NAME} for details.`);
eq('"visit Cyprus" as an ordinary phrase is untouched', run('The best time to visit Cyprus is spring. Visit Cyprus in April!'), 'The best time to visit Cyprus is spring. Visit Cyprus in April!');
eq('plain text without sources is unchanged', run('Try the harbour at sunset. It is quiet in October.'), 'Try the harbour at sunset. It is quiet in October.');
eq('empty and null input are safe', [applyLinkPolicy('').text, applyLinkPolicy(null as unknown as string).text], ['', '']);
eq('idempotent', run(run('Go (via Visit Cyprus): https://visitcyprus.com/a now')), run('Go (via Visit Cyprus): https://visitcyprus.com/a now'));
eq('a normal list with dashes and colons is untouched', run('Tips:\n- Go early\n- Bring water: it is hot'), 'Tips:\n- Go early\n- Bring water: it is hot');

// 4. GetYourGuide
{
  const r = applyLinkPolicy('Book here: https://www.getyourguide.com/limassol-l32399/blue-lagoon-t123/ today');
  const url = r.text.match(/https:\/\/\S+/)![0];
  ok('a raw GetYourGuide URL gets our partner id', new URL(url).searchParams.get('partner_id') === P && r.taggedGyg === 1);
  eq('and the concierge campaign tag', new URL(url).searchParams.get('cmp'), 'cl-concierge');
  ok('a foreign partner id is replaced by ours', new URL(run('https://www.getyourguide.com/x-t1/?partner_id=EVIL')).searchParams.get('partner_id') === P);
  ok('a markdown GetYourGuide link is tagged too', /\(https:\/\/www\.getyourguide\.com\/x-t1\/\?[^)]*partner_id=/.test(run('[Book](https://www.getyourguide.com/x-t1/)')));
  ok('an already tagged link stays tagged exactly once', (run(run('https://www.getyourguide.com/x-t1/')).match(/partner_id=/g) || []).length === 1);
  ok('a localised GetYourGuide host is tagged', /partner_id=/.test(run('https://www.getyourguide.de/zypern-l169006/')));
  eq('an explicit partner id wins', new URL(applyLinkPolicy('https://www.getyourguide.com/x-t1/', { partnerId: 'ZZZ9' }).text).searchParams.get('partner_id'), 'ZZZ9');
}

// 5. titles / snippets from scraped pages
eq('title suffix " - My Cyprus Life" is cut', scrubSourceNames('Frangipani. The newcomer in Cyprus is loved by everybody - My Cyprus Life'), 'Frangipani. The newcomer in Cyprus is loved by everybody');
eq('title suffix " | Visit Cyprus" is cut', scrubSourceNames('Troodos Mountains | Visit Cyprus'), 'Troodos Mountains');
eq('title prefix "Visit Cyprus - " is cut', scrubSourceNames('Visit Cyprus - Troodos Mountains'), 'Troodos Mountains');
eq('snippet mention is cut', scrubSourceNames('A winter tattoo - My Cyprus Life — could make a good souvenir'), 'A winter tattoo — could make a good souvenir');
eq('"visit Cyprus" inside a title is kept', scrubSourceNames('Best time to visit Cyprus'), 'Best time to visit Cyprus');
eq('text without a name is unchanged', scrubSourceNames('Kykkos is the best known monastery in Cyprus'), 'Kykkos is the best known monastery in Cyprus');
ok('official authority hosts', isOfficialAuthorityUrl('https://www.tax.gov.cy/en') && isOfficialAuthorityUrl('https://eur-lex.europa.eu/x') && !isOfficialAuthorityUrl('https://visitcyprus.com') && !isOfficialAuthorityUrl('https://evilgov.cy.example.com'));
eq('hostOf strips www', hostOf('https://WWW.Example.com/a'), 'example.com');

// 6. streaming: pieces joined equal the whole, even when a URL, a bracket or a two-word name is cut in half
{
  const samples = [
    'Hidden villages (via My Cyprus Life): https://mycypruslife.com/troodos and book at https://www.getyourguide.com/x-t1/ now. Enjoy! My Cyprus Life is a blog, and on [Visit Cyprus](https://visitcyprus.com/z) too, laut Cyprus Mail. Laut Visit Cyprus ist es ruhig.\nMehr Infos: https://www.visitcyprus.com/y\nDone.',
    'Troodos is cool in summer.\n\nhttps://mycypruslife.com/x\n\nThe villages are quiet in October, according to Visit Cyprus, and the roads are good.',
    'Tips:\n- Go early\n- https://visitcyprus.com/x\n- Bring water (see https://cyprus-mail.com/y)\n- Book via [GetYourGuide](https://www.getyourguide.com/z-t2/)\nEnjoy!',
    'Potrivit My Cyprus Life, plaja este liniștită. Vizitați https://www.getyourguide.com/pafos-l426/ astăzi!',
    '**Source:** Visit Cyprus (https://www.visitcyprus.com/health)\n\nStay hydrated: it is hot in August.',
  ];
  samples.forEach((whole, n) => {
    const expected = applyLinkPolicy(whole).text;
    for (const size of [1, 2, 3, 4, 5, 7, 8, 13, 40, 400]) {
      const s = new LinkPolicyStream(); let out = '';
      for (let i = 0; i < whole.length; i += size) out += s.push(whole.slice(i, i + size));
      out += s.flush();
      eq(`sample ${n + 1}: stream in pieces of ${size} equals the whole`, out, expected);
    }
  });
  const first = applyLinkPolicy(samples[0]).text;
  ok('the first sample exercises every rule', !/mycypruslife|visitcyprus|Cyprus Mail|via My/i.test(first) && /partner_id=/.test(first) && first.includes(HOUSE_NAME) && first.includes(`Laut ${HOUSE_NAME} ist`));
  const s2 = new LinkPolicyStream(); const a = s2.push('Visit https://mycypr'); const b = s2.push('uslife.com/x now'); const c = s2.flush();
  ok('a half URL is never released', !a.includes('mycypr') && !(a + b + c).includes('mycypruslife'));
  { // an unfinished sentence is held; a finished one is released at once (so the chat still fills sentence by sentence)
    const t = new LinkPolicyStream();
    const a1 = t.push('Troodos is cool in summer. The villages are');
    const a2 = t.push(' quiet in October.');
    const a3 = t.flush();
    eq('a finished sentence is released before the reply ends', a1, 'Troodos is cool in summer.');
    eq('the unfinished one waits for its end, the flush releases the rest', [a2, a3], ['', ' The villages are quiet in October.']);
    const u = new LinkPolicyStream();
    eq('a piece that ends in a colon waits for what follows (the URL after it may be removed with it)', [u.push('Hidden villages:\n'), u.push('https://visitcyprus.com/x\nEnjoy.'), u.flush()], ['', 'Hidden villages', '\nEnjoy.']);
    const plain = 'First line.\nSecond line, with a comma.\n- item one\n- item two\nEnd';
    const v = new LinkPolicyStream(); let o = ''; for (const ch of plain) o += v.push(ch); o += v.flush();
    eq('plain text passes through unchanged, character by character', o, plain);
  }
}
report('concierge-link-policy');
