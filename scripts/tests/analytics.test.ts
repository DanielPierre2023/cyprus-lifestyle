// Coverage classification — decides full / partial / deferred for every concierge
// turn (roadmap item 02). Pure heuristic, no model call.
import { classifyCoverage } from '@/lib/concierge/analytics';
import { eq, report } from './_harness';

eq('no grounding → deferred/no_data',
  classifyCoverage(0, 0, 'Here is a long helpful answer with lots of words and detail.'),
  { coverage: 'deferred', reason: 'no_data' });

eq('strong grounding + substantial answer → full/ok',
  classifyCoverage(3, 1, 'The best beach is Finikoudes, right in Larnaca town, with soft sand and shallow water — great for families and easy to reach on foot.'),
  { coverage: 'full', reason: 'ok' });

eq('single hit → partial/thin',
  classifyCoverage(1, 0, 'A perfectly long answer that has more than forty characters in it for sure.'),
  { coverage: 'partial', reason: 'thin' });

eq('grounded but very short answer → partial/thin',
  classifyCoverage(2, 0, 'Try Finikoudes beach.'),
  { coverage: 'partial', reason: 'thin' });

eq('English defer phrase → partial/thin',
  classifyCoverage(3, 1, 'I could not find a specific pet shop nearby, but our desk will check and get back to you shortly with options.'),
  { coverage: 'partial', reason: 'thin' });

eq('Greek defer phrase → partial/thin',
  classifyCoverage(3, 0, 'Δυστυχώς δεν έχω αυτή τη στιγμή ακριβείς πληροφορίες για αυτό, θα επικοινωνήσουμε σύντομα μαζί σας.'),
  { coverage: 'partial', reason: 'thin' });

eq('German defer phrase → partial/thin',
  classifyCoverage(4, 1, 'Dazu liegen mir leider keine Informationen vor, aber ich kann das gerne für Sie klären lassen.'),
  { coverage: 'partial', reason: 'thin' });

eq('kb-only grounding counts → full/ok',
  classifyCoverage(0, 3, 'Non-EU buyers need Council of Ministers approval to purchase property, which typically takes a few months to process.'),
  { coverage: 'full', reason: 'ok' });

report('analytics.classifyCoverage');
