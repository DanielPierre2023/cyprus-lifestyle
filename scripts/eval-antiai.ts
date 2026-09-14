/* Cyprus Lifestyle — anti-AI evaluation harness.
 *
 * Runs a small golden set through the deterministic AI-tell scorer and humaniser,
 * per language, and reports: score before → after, level, and top tells. It also
 * checks two invariants — "AI-heavy" samples must score above zero and improve
 * after humanising; "clean" samples must read clean/low — and exits non-zero if
 * an invariant fails, so it can gate CI.
 *
 * Run:  npx tsx scripts/eval-antiai.ts
 */
import { scoreAiTells, humanizeText, deShoutTitle, type Lang } from '../lib/antiAi';

type Sample = { lang: Lang; label: string; expect: 'ai' | 'clean'; title: string; content: string };

const GOLDEN: Sample[] = [
  { lang: 'en', label: 'AI-heavy', expect: 'ai', title: 'A SEAMLESS TESTAMENT',
    content: "In today's fast-paced world, this meticulous, cutting-edge project boasts a rich tapestry of seamless experiences. Nestled in the heart of the city, it is a testament to innovation — delving into a myriad of possibilities." },
  { lang: 'en', label: 'clean', expect: 'clean', title: "Limassol's marina towers redraw the skyline",
    content: 'Ten years ago the seafront was a working coastline. Today it is a row of glass towers with berths at their feet, and apartments that change hands before the concrete has cured.' },
  { lang: 'el', label: 'AI-heavy', expect: 'ai', title: 'ΜΙΑ ΑΨΟΓΗ ΜΑΡΤΥΡΙΑ',
    content: 'Σε έναν κόσμο που εξελίσσεται ραγδαία, το έργο αυτό αποτελεί απόδειξη καινοτομίας — μια πλούσια ταπισερί εμπειριών.' },
  { lang: 'el', label: 'clean', expect: 'clean', title: 'Οι πύργοι της μαρίνας Λεμεσού',
    content: 'Πριν από δέκα χρόνια το παραλιακό μέτωπο ήταν μια ακτή εργασίας. Σήμερα είναι μια σειρά από γυάλινους πύργους.' },
  { lang: 'ro', label: 'AI-heavy', expect: 'ai', title: 'O MĂRTURIE IMPECABILĂ',
    content: 'Într-o lume în continuă schimbare, acest proiect este o dovadă a inovației — o tapiserie bogată de experiențe impecabile.' },
  { lang: 'ro', label: 'clean', expect: 'clean', title: 'Turnurile marinei din Limassol',
    content: 'Acum zece ani, faleza era o coastă de lucru. Astăzi este un șir de turnuri de sticlă.' },
  { lang: 'ar', label: 'AI-heavy', expect: 'ai', title: 'شهادة سلسة',
    content: 'في عالمٍ سريع التغير، يُعدّ هذا المشروع شهادةً على الابتكار — نسيجٌ غنيٌّ من التجارب السلسة.' },
  { lang: 'ar', label: 'clean', expect: 'clean', title: 'أبراج مارينا ليماسول',
    content: 'قبل عشر سنوات كانت الواجهة ساحلاً عاملاً. اليوم هي صفٌّ من الأبراج الزجاجية.' },
];

function pad(s: string, n: number) { return (s + ' '.repeat(n)).slice(0, n); }

let failures = 0;
console.log('\n  Cyprus Lifestyle — anti-AI evaluation\n');
console.log('  ' + pad('LANG', 6) + pad('SAMPLE', 11) + pad('BEFORE', 9) + pad('AFTER', 9) + pad('LEVEL', 15) + 'RESULT');
console.log('  ' + '-'.repeat(64));

for (const s of GOLDEN) {
  const before = scoreAiTells({ title: s.title, content: s.content, lang: s.lang });
  const after = scoreAiTells({ title: deShoutTitle(s.title), content: humanizeText(s.content, s.lang), lang: s.lang });

  let ok: boolean;
  if (s.expect === 'ai') ok = before.score > 0 && after.score < before.score;
  else ok = before.level === 'clean' || before.level === 'low';
  if (!ok) failures++;

  console.log('  ' + pad(s.lang, 6) + pad(s.label, 11) + pad(String(before.score), 9) + pad(String(after.score), 9) + pad(`${before.level} → ${after.level}`, 15) + (ok ? 'PASS' : 'FAIL'));
  if (s.expect === 'ai' && before.tells.length) {
    console.log('  ' + pad('', 6) + 'tells: ' + before.tells.slice(0, 3).map((t) => `${t.label}(${t.count})`).join(', '));
  }
}

console.log('  ' + '-'.repeat(64));
console.log(`  ${GOLDEN.length - failures}/${GOLDEN.length} checks passed\n`);
process.exit(failures ? 1 : 0);
