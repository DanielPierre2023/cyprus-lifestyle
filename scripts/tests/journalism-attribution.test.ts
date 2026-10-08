// "The magazine contacted no one": a piece never says that someone spoke to Cyprus Lifestyle or to "us". High severity, seven languages,
// with clean controls so that an ordinary quotation is not caught.
import { dataTells, tellCompileErrors } from '@/lib/voice/tells';
import type { Lang } from '@/lib/antiAi';
import { eq, ok, report } from './_harness';

const L: Lang[] = ['en', 'de', 'pl', 'ro', 'ru', 'el', 'ar'];
const bad: Record<Lang, string> = {
  en: 'The minister told Cyprus Lifestyle that the fee would rise in March.',
  de: 'Der Minister sagte gegenüber dieser Redaktion, die Gebühr steige im März.',
  pl: 'Minister powiedział naszej redakcji, że opłata wzrośnie w marcu.',
  ro: 'Ministrul a declarat redacției noastre că taxa va crește în martie.',
  ru: 'Министр заявил нам, что сбор вырастет в марте.',
  el: 'Ο υπουργός δήλωσε στο Cyprus Lifestyle ότι το τέλος θα αυξηθεί τον Μάρτιο.',
  ar: 'قال الوزير لنا إن الرسوم سترتفع في مارس.',
};
const good: Record<Lang, string> = {
  en: 'The minister said the fee would rise in March, and the harbour authority confirmed the date. "Nobody told us," a berth holder said.',
  de: 'Der Minister sagte, die Gebühr steige im März, und die Hafenbehörde bestätigte den Termin.',
  pl: 'Minister powiedział, że opłata wzrośnie w marcu, a urząd portowy potwierdził termin.',
  ro: 'Ministrul a declarat că taxa va crește în martie, iar autoritatea portuară a confirmat data.',
  ru: 'Министр заявил, что сбор вырастет в марте, а портовое управление подтвердило дату.',
  el: 'Ο υπουργός δήλωσε ότι το τέλος θα αυξηθεί τον Μάρτιο και η λιμενική αρχή επιβεβαίωσε την ημερομηνία.',
  ar: 'قال الوزير إن الرسوم سترتفع في مارس، وأكدت هيئة الميناء الموعد.',
};
for (const l of L) {
  const hit = dataTells(bad[l], l).find((t) => t.key === 'source_own_contact');
  ok(`${l}: a claim of contact with the magazine is found, and it is high`, !!hit && hit.severity === 'high');
  ok(`${l}: an ordinary attribution is not caught`, !dataTells(good[l], l).some((t) => t.key === 'source_own_contact'));
  eq(`${l}: every detector compiles`, tellCompileErrors(l), []);
}
ok('en: "we asked" is found', dataTells('We asked the ministry about the fee.', 'en').some((t) => t.key === 'source_own_contact'));
ok('en: "in an exclusive interview with us" is found', dataTells('In an exclusive interview with us, the mayor said the plan stands.', 'en').some((t) => t.key === 'source_own_contact'));
report('journalism-attribution');
