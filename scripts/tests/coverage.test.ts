// Concierge COVERAGE probe — the pure, breadth-baseline helpers. These grade what the
// retrieval layer returned (blind/thin/ok/strong) and roll it up into the scorecard the
// whole "make him smart" programme is measured against, so the grading must be exact.
import {
  COVERAGE_TOPICS, COVERAGE_PROBES, TOPIC_BY_KEY,
  coverageVerdict, coverageScore, overallCoverage, rollupByTopic, rollupByLocale, gaps,
  type ProbeResult, type CoverageVerdict, type CoverageTopic,
} from '@/lib/concierge/coverage';
import { eq, ok, report } from './_harness';

// ── Taxonomy integrity — the vision, made measurable ────────────────────────────
ok('every topic has a real English probe', COVERAGE_TOPICS.every((t) => typeof t.en === 'string' && t.en.length > 10));
ok('every topic has an English probe in the set', COVERAGE_TOPICS.every((t) => COVERAGE_PROBES.some((p) => p.topic === t.key && p.locale === 'en')));
ok('every probe maps to a known topic', COVERAGE_PROBES.every((p) => !!TOPIC_BY_KEY[p.topic]));
eq('TOPIC_BY_KEY covers all topics', Object.keys(TOPIC_BY_KEY).length, COVERAGE_TOPICS.length);
{
  const locs = new Set(COVERAGE_PROBES.map((p) => p.locale));
  ok('all seven languages are exercised', ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'].every((l) => locs.has(l)));
}
ok('the vision topics are present', ['fine-dining', 'casual-dining', 'museums', 'archaeology', 'diving', 'yachts', 'jewellery', 'fashion', 'nightlife', 'investing', 'prices', 'state-of-cyprus', 'home-services'].every((k) => !!TOPIC_BY_KEY[k]));

// ── coverageVerdict — a directory-only topic (beaches) ──────────────────────────
const beaches = TOPIC_BY_KEY['beaches'];
eq('nothing at all → blind', coverageVerdict(beaches, { dir: 0, kb: 0, articles: 0 }), 'blind');
eq('one listing → thin (total < 2)', coverageVerdict(beaches, { dir: 1, kb: 0, articles: 0 }), 'thin');
eq('two listings → ok', coverageVerdict(beaches, { dir: 2, kb: 0, articles: 0 }), 'ok');
eq('several listings → strong', coverageVerdict(beaches, { dir: 5, kb: 0, articles: 0 }), 'strong');

// ── a KB-only topic (weather): directory hits must NOT rescue a missing KB answer ──
const weather = TOPIC_BY_KEY['weather'];
eq('KB topic with only directory hits → thin', coverageVerdict(weather, { dir: 9, kb: 0, articles: 0 }), 'thin');
eq('KB topic with a KB answer → strong', coverageVerdict(weather, { dir: 0, kb: 3, articles: 0 }), 'strong');

// ── a multi-source topic (expects directory AND article) — synthetic, so this tests
// the AND logic itself and stays valid however the real taxonomy's flags evolve ──
const multi: CoverageTopic = { key: 'x', label: 'x', pillar: 'directory', expectDirectory: true, expectKb: false, expectArticle: true, en: 'x' };
eq('directory but no article → thin', coverageVerdict(multi, { dir: 5, kb: 0, articles: 0 }), 'thin');
eq('directory + one article → ok', coverageVerdict(multi, { dir: 5, kb: 0, articles: 1 }), 'ok');
eq('directory + several articles → strong', coverageVerdict(multi, { dir: 5, kb: 0, articles: 3 }), 'strong');

// ── unknown topic → graded on the pooled total ──────────────────────────────────
eq('unknown topic, empty → blind', coverageVerdict(undefined, { dir: 0, kb: 0, articles: 0 }), 'blind');
eq('unknown topic, a couple of hits → ok', coverageVerdict(undefined, { dir: 2, kb: 0, articles: 0 }), 'ok');

// ── coverageScore (blind 0, thin 0.34, ok 0.70, strong 1.00) ────────────────────
eq('empty score is 0', coverageScore([]), 0);
eq('all strong → 100', coverageScore(['strong', 'strong']), 100);
eq('all blind → 0', coverageScore(['blind', 'blind']), 0);
eq('mixed set scores correctly', coverageScore(['strong', 'ok', 'thin', 'blind']), 51);

// ── rollups + gaps ──────────────────────────────────────────────────────────────
const mk = (topic: string, locale: string, verdict: CoverageVerdict): ProbeResult => ({
  topic, locale, q: 'x', dir: 0, kb: 0, articles: 0, category: null, district: null, categoryHit: false, verdict,
});
const sample: ProbeResult[] = [
  mk('fine-dining', 'en', 'strong'), mk('fine-dining', 'el', 'strong'),
  mk('nightlife', 'en', 'blind'), mk('nightlife', 'ru', 'blind'),
  mk('diving', 'en', 'thin'),
];
{
  const all = overallCoverage(sample);
  eq('overall counts n', all.n, 5);
  eq('overall counts strong', all.strong, 2);
  eq('overall counts blind', all.blind, 2);
  const byTopic = rollupByTopic(sample);
  eq('fine-dining topic score is 100', byTopic['fine-dining'].score, 100);
  eq('nightlife topic score is 0', byTopic['nightlife'].score, 0);
  const byLocale = rollupByLocale(sample);
  eq('en locale rolled up', byLocale['en'].n, 3);
  const g = gaps(sample);
  eq('two topics are gaps (< 70)', g.length, 2);
  eq('worst gap first', g[0].topic, 'nightlife');
  eq('next gap second', g[1].topic, 'diving');
}

report('coverage.pure');
