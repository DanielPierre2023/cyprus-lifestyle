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

report('kb.content');
