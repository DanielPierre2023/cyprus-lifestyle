// Knowledge-base content (CI-4a) — the three entries the baseline showed were blind:
// investing, Cypriot culture, and the current state of Cyprus. This locks in that they
// exist, are RETRIEVABLE by the concierge's keyword retrieval (not just present in the
// data), and each carries a citable source — so a future edit can't silently drop them.
import { retrieveKnowledge, QA_INDEX } from '@/lib/knowledge/qa';
import { ok, report } from './_harness';

const has = (id: string, q: string) => retrieveKnowledge(q, 8).some((h) => h.item.id === id);

ok('investing entry exists', !!QA_INDEX['investing-in-cyprus']);
ok('culture entry exists', !!QA_INDEX['cypriot-culture']);
ok('state-of-cyprus entry exists', !!QA_INDEX['state-of-cyprus']);

ok('investing is retrievable', has('investing-in-cyprus', 'is Cyprus a good place to invest and how do foreigners start'));
ok('culture is retrievable', has('cypriot-culture', 'tell me about Cypriot culture and the traditions'));
ok('situation is retrievable', has('state-of-cyprus', 'what is the current situation and economy in Cyprus right now'));

ok('all three carry a citable source', ['investing-in-cyprus', 'cypriot-culture', 'state-of-cyprus'].every((id) => !!QA_INDEX[id]?.item.source));

// ── CI-4b editorial taste entries ────────────────────────────────────────────────
ok('fine-dining is retrievable', has('fine-dining', 'where can I find fine dining for a special dinner in Limassol'));
ok('nightlife is retrievable', has('nightlife', 'where is the best nightlife and party areas in Cyprus'));
ok('museums is retrievable', has('museums', 'which museums are worth visiting in Cyprus'));
ok('archaeological-sites is retrievable', has('archaeological-sites', 'which ancient archaeological sites should I see in Cyprus'));
ok('fashion-shopping is retrievable', has('fashion-shopping', 'where is the best fashion shopping and designer boutiques'));
ok('theatre-arts is retrievable', has('theatre-arts', 'what is the theatre and live performance scene like in Cyprus'));
ok('editorial entries all carry a citable source', ['fine-dining', 'nightlife', 'museums', 'archaeological-sites', 'fashion-shopping', 'theatre-arts'].every((id) => !!QA_INDEX[id]?.item.source));

report('kb.content');
