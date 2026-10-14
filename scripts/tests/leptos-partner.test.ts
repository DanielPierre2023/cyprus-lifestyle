// The Leptos profile: data, texts in seven languages, the SQL derived from them, map spreading and the concierge brief. Offline, deterministic.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '@/lib/locales';
import {
  AREA, AREA_OF_PLACE, AREA_ORDER, ENTITY_ROLE, FEATURE, HISTORY, HISTORY_INTRO, HISTORY_TODAY, HUB_SUMMARY, KIND, LEPTOS_ABROAD, LEPTOS_ALL_SLUGS,
  LEPTOS_AWARDS, LEPTOS_ENTITIES, LEPTOS_GREECE, LEPTOS_NEW_GROUP_ROWS, LEPTOS_NEW_PROJECTS, LEPTOS_OFFICES, LEPTOS_PROJECTS, LEPTOS_SLUG, OFFICE_NOTE,
  PLACE, REASONS, SECTOR, SECTOR_ORDER, UI, hubSummary, kindLabel, leptosBrief, leptosMentioned, leptosRole, officeSummary, placeName, projectSummary,
} from '@/lib/partners/leptos';
import { leptosSqlFiles } from '@/lib/partners/leptos.sql';
import { distM, fanOut } from '@/lib/partners/geo';
import { groundingBlock, type ConciergeContext } from '@/lib/concierge/brain';
import { factsOf } from '@/lib/concierge/facts';
import { eq, ok, report } from './_harness';

const root = process.cwd();
const all7 = (name: string, v: Record<string, string>) => {
  ok(`${name}: seven editions`, LOCALES.every((l) => typeof v[l] === 'string' && v[l].trim().length > 0));
};

// ── projects ─────────────────────────────────────────────────────────────────
eq('42 projects in Cyprus', LEPTOS_PROJECTS.length, 42);
eq('14 projects in Greece are linked', LEPTOS_GREECE.length, 14);
eq('40 new project rows, 2 existing', [LEPTOS_NEW_PROJECTS.length, LEPTOS_PROJECTS.length - LEPTOS_NEW_PROJECTS.length], [40, 2]);
eq('keys are unique', new Set(LEPTOS_PROJECTS.map((p) => p.key)).size, 42);
eq('slugs are unique', new Set(LEPTOS_PROJECTS.map((p) => p.slug)).size, 42);
ok('new slugs follow the scraper convention leptos-estates-<name>', LEPTOS_NEW_PROJECTS.every((p) => p.slug.startsWith('leptos-estates-')));
ok('official pages are https leptosestates.com', LEPTOS_PROJECTS.every((p) => /^https:\/\/www\.leptosestates\.com\/project\/[a-z0-9-]+$/.test(p.url)));
ok('Greek links are https leptosestates.com', LEPTOS_GREECE.every((g) => /^https:\/\/www\.leptosestates\.com\/project\//.test(g.url)));
ok('every project has a place, a kind and an area', LEPTOS_PROJECTS.every((p) => PLACE[p.place] && KIND[p.kind] && AREA_OF_PLACE[p.place]));
ok('every area has projects', AREA_ORDER.every((a) => LEPTOS_PROJECTS.some((p) => AREA_OF_PLACE[p.place] === a)));
ok('precision is town or geocoded', LEPTOS_PROJECTS.every((p) => p.precision === 'town' || p.precision === 'geocoded'));
// the points are in the Republic: Paphos and Limassol districts (the south and the west of the island)
ok('every project point lies in the Paphos or Limassol districts', LEPTOS_PROJECTS.every((p) => p.lat > 34.6 && p.lat < 35.1 && p.lng > 32.25 && p.lng < 33.15));
ok('every project is in 7 sentence frames (no unresolved placeholder)', LEPTOS_PROJECTS.every((p) => LOCALES.every((l) => !/[{}]/.test(projectSummary(l, p)) && projectSummary(l, p).includes(p.name))));
ok('project summaries stay short', LEPTOS_PROJECTS.every((p) => LOCALES.every((l) => projectSummary(l, p).length <= 420)));
ok('a project with beds only where the range is sensible', LEPTOS_PROJECTS.every((p) => !p.beds || /^\d(–\d)?$/.test(p.beds)));

// ── images shipped with the code ─────────────────────────────────────────────
for (const p of LEPTOS_PROJECTS) {
  const big = join(root, 'public/partners/leptos/p', `${p.key}.jpg`), small = join(root, 'public/partners/leptos/t', `${p.key}.jpg`);
  if (p.noImage) { ok(`${p.key}: no picture, none shipped`, !existsSync(big) && !existsSync(small)); continue; }
  ok(`${p.key}: both pictures exist`, existsSync(big) && existsSync(small));
  if (existsSync(big)) ok(`${p.key}: picture is a sensible size`, statSync(big).size > 20_000 && statSync(big).size < 260_000);
  if (existsSync(small)) ok(`${p.key}: thumbnail is small`, statSync(small).size < 90_000);
}
ok('the head-office cover exists', existsSync(join(root, 'public/partners/leptos/cover.jpg')));

// ── offices and group rows ───────────────────────────────────────────────────
eq('three offices in Cyprus', LEPTOS_OFFICES.map((o) => o.id), ['paphos', 'nicosia', 'limassol']);
ok('the head office is the head-office row', LEPTOS_OFFICES[0].slug === LEPTOS_SLUG);
ok('office points lie in the Republic (Nicosia south of the line)', LEPTOS_OFFICES.every((o) => o.lat > 34.6 && o.lat < 35.17 && o.lng > 32.3 && o.lng < 33.4));
eq('ten offices abroad', LEPTOS_ABROAD.length, 10);
eq('20 group entries besides the group itself (the workbook counts the group as the 21st)', LEPTOS_ENTITIES.length, 20);
ok('every entity has a role line in 7 languages', LEPTOS_ENTITIES.every((e) => ENTITY_ROLE[e.id] && LOCALES.every((l) => ENTITY_ROLE[e.id][l].length > 10)));
ok('every sector has entities and a name', SECTOR_ORDER.every((s) => LEPTOS_ENTITIES.some((e) => e.sector === s) && LOCALES.every((l) => SECTOR[s][l])));
eq('four new group rows', LEPTOS_NEW_GROUP_ROWS.length, 4);
ok('all slugs are unique across hub, offices, group, projects', new Set(LEPTOS_ALL_SLUGS).size === LEPTOS_ALL_SLUGS.length);
eq('roles', [leptosRole(LEPTOS_SLUG), leptosRole('leptos-estates-limassol'), leptosRole('leptos-estates-kamares-village'), leptosRole('thalassa-3l4tp3'), leptosRole('some-cafe')], ['hub', 'office', 'project', 'group', null]);
ok('33 award pages, merged list is shorter and carries years', LEPTOS_AWARDS.length > 20 && LEPTOS_AWARDS.length < 33 && LEPTOS_AWARDS.some((a) => a.year === '2025'));

// ── texts: seven editions, no unresolved parts, house style ───────────────────
all7('hub summary', HUB_SUMMARY);
all7('history intro', HISTORY_INTRO);
all7('history today', HISTORY_TODAY);
HISTORY.forEach((h, i) => all7(`history ${i}`, h.text));
eq('twelve reasons', REASONS.length, 12);
REASONS.forEach((r, i) => { all7(`reason ${i} title`, r.title); all7(`reason ${i} text`, r.text); });
Object.entries(PLACE).forEach(([k, v]) => { all7(`place ${k} name`, v.name); all7(`place ${k} in`, v.in); });
Object.entries(KIND).forEach(([k, v]) => { all7(`kind ${k} label`, v.label); all7(`kind ${k} frame`, v.frame); ok(`kind ${k} frame has name and place`, LOCALES.every((l) => v.frame[l].includes('{name}') && v.frame[l].includes('{in}'))); });
Object.entries(FEATURE).forEach(([k, v]) => all7(`feature ${k}`, v));
Object.entries(AREA).forEach(([k, v]) => all7(`area ${k}`, v));
Object.entries(OFFICE_NOTE).forEach(([k, v]) => all7(`office note ${k}`, v));
{
  const en = Object.keys(UI.en);
  ok('every interface string exists in every edition', LOCALES.every((l) => JSON.stringify(Object.keys(UI[l])) === JSON.stringify(en)));
  const flat = (o: unknown): string[] => (typeof o === 'string' ? [o] : Object.values(o as Record<string, unknown>).flatMap(flat));
  ok('no interface string is empty', LOCALES.every((l) => flat(UI[l]).every((s) => s.trim().length > 0)));
  ok('projects intro carries the count placeholder in every edition', LOCALES.every((l) => UI[l].projectsIntro.includes('{n}')));
}
{
  // house style: no long dashes in running text
  const texts: string[] = [];
  const push = (v: Record<string, string>) => LOCALES.forEach((l) => texts.push(v[l]));
  push(HUB_SUMMARY); push(HISTORY_INTRO); push(HISTORY_TODAY); HISTORY.forEach((h) => push(h.text));
  REASONS.forEach((r) => { push(r.title); push(r.text); });
  Object.values(KIND).forEach((k) => push(k.frame)); Object.values(FEATURE).forEach(push); Object.values(ENTITY_ROLE).forEach(push); Object.values(OFFICE_NOTE).forEach(push);
  ok('no em dash in any text', texts.every((t) => !t.includes('—')));
  ok('no spaced en dash in any text', texts.every((t) => !t.includes(' – ')));
}
{
  // what the concierge sees of the summary is cut at 260 characters: the key facts must be inside
  const cut = factsOf({ summary: hubSummary('en'), name: 'Leptos Estates' }).overview || '';
  ok('concierge overview names luxury, Leptos Group and 1960', /luxury/i.test(cut) && /Leptos Group/.test(cut) && /1960/.test(cut));
  ok('summary for the directory stays a summary', LOCALES.every((l) => hubSummary(l).length <= 420));
  ok('Arabic texts carry Arabic letters', /[؀-ۿ]/.test(hubSummary('ar')) && /[؀-ۿ]/.test(projectSummary('ar', LEPTOS_PROJECTS[0])) && /[؀-ۿ]/.test(placeName('ar', 'paphos')));
  ok('Greek and Russian place names are in their script', /[Ͱ-Ͽ]/.test(placeName('el', 'chloraka')) && /[Ѐ-ӿ]/.test(placeName('ru', 'chloraka')));
  eq('kind label', kindLabel('de', LEPTOS_PROJECTS[0]), 'Villen');
  eq('office note exists', officeSummary('en', 'nicosia').includes('Armonia Estates Ltd'), true);
  eq('example summary (en)', projectSummary('en', LEPTOS_PROJECTS.find((p) => p.key === 'coral-seas-villas')!),
    'Coral Seas Villas is a Leptos Estates development of villas in Coral Bay. Gated community of 63 freehold detached villas, most with private pools, all within walking distance of the sea.');
}

// ── the SQL files are the output of this data ────────────────────────────────
{
  const files = leptosSqlFiles();
  eq('eight SQL files', Object.keys(files).length, 8);
  for (const [name, sql] of Object.entries(files)) {
    const p = join(root, 'supabase/data', name);
    ok(`${name}: committed file equals the generated one (run node scripts/leptos-sql.mjs)`, existsSync(p) && readFileSync(p, 'utf8') === sql);
    ok(`${name}: no begin/commit (the editor runs one transaction)`, !/^\s*(begin|commit|start transaction)\s*;/im.test(sql));
  }
  const projects = files['20261014-53-leptos-projekte.sql'];
  ok('every new project slug is inserted once', LEPTOS_NEW_PROJECTS.every((p) => projects.split(`'${p.slug}'`).length >= 2));
  ok('no price, no completion date, no status is written for a project', !/price_from|price_to|completion|dev_status/.test(projects));
  ok('projects keep the picture path of the repository', LEPTOS_NEW_PROJECTS.every((p) => p.noImage || projects.includes(`'/partners/leptos/p/${p.key}.jpg'`)));
  ok('the project file inserts with on conflict do nothing (safe to repeat)', /on conflict do nothing/.test(projects));
  const konzern = files['20261014-52-leptos-konzern.sql'];
  ok('head office becomes a company with the luxury flag', /type = 'vendor'/.test(konzern) && /luxury = true/.test(konzern));
  ok('the head-office text is the one of the page (7 editions)', LOCALES.every((l) => konzern.includes(hubSummary(l).replace(/'/g, "''"))));
  const back = files['20261014-54-leptos-rueckgaengig.sql'];
  ok('rollback deletes only the new slugs', LEPTOS_NEW_PROJECTS.every((p) => back.includes(`'${p.slug}'`)));
  ok('the pre-check is read only', !/\b(insert|update|delete|alter|drop|create)\b/i.test(files['20261014-50-leptos-vorpruefung.sql'].replace(/^--.*$/gm, '')));
  ok('the coordinates template changes nothing as it stands (every new row carries the stored values)', LEPTOS_NEW_PROJECTS.every((p) => files['20261014-57-leptos-lage-nachtragen.sql'].includes(`('${p.slug}', ${p.lat}::double precision, ${p.lng}::double precision, '${p.precision}')`)));
  ok('the template never overwrites an exact point', /coords_precision in \('town', 'geocoded'\)/.test(files['20261014-57-leptos-lage-nachtragen.sql']));
  ok('the check file is read only', !/\b(insert|update|delete|alter|drop|create)\b/i.test(files['20261014-56-leptos-kontrolle.sql'].replace(/^--.*$/gm, '')));
}

// ── map: pins sharing a village are spread, nothing else moves ────────────────
{
  const pts = LEPTOS_PROJECTS.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name }));
  const out = fanOut(pts);
  eq('same order, same count', out.map((p) => p.name), pts.map((p) => p.name));
  let minGap = Infinity; let maxMove = 0;
  for (let i = 0; i < out.length; i++) {
    maxMove = Math.max(maxMove, distM(pts[i], out[i]));
    for (let j = i + 1; j < out.length; j++) minGap = Math.min(minGap, distM(out[i], out[j]));
  }
  ok(`no two pins closer than 90 m (min ${Math.round(minGap)} m)`, minGap > 90);
  ok(`no pin moved more than 500 m (max ${Math.round(maxMove)} m)`, maxMove < 500);
  const lone = [{ lat: 34.7, lng: 32.4, name: 'a' }, { lat: 34.9, lng: 32.5, name: 'b' }];
  eq('single points stay where they are', fanOut(lone), lone);
  eq('the first pin of a group keeps the centre', fanOut([{ lat: 34.7, lng: 32.4 }, { lat: 34.7, lng: 32.4 }])[0], { lat: 34.7, lng: 32.4 });
}

// ── concierge: who is "about Leptos", and what it is told ─────────────────────
ok('Leptos Developers', leptosMentioned('Tell me about Leptos Developers'));
ok('Leptos Estates', leptosMentioned('Is Leptos Estates a good developer?'));
ok('a project', leptosMentioned('Who built Kamares Village?'));
ok('a project with a typo in case', leptosMentioned('price of coral seas villas'));
ok('the web address', leptosMentioned('I found leptosestates.com, is it real?'));
ok('Russian spelling', leptosMentioned('Расскажи про Лептос'));
ok('Arabic spelling', leptosMentioned('أخبرني عن ليبتوس'));
ok('legal entity', leptosMentioned('Armonia Estates Ltd Nicosia'));
ok('a named place of the group (from the name search) triggers it', leptosMentioned('where is it?', ['leptos-estates-kamares-village']));
ok('an unrelated named place does not', !leptosMentioned('where is it?', ['some-cafe-123']));
ok('a category question does not', !leptosMentioned('best restaurant in Paphos'));
ok('a generic project name alone does not', !leptosMentioned('Paphos Gardens apartments for rent'));
ok('the Greek word for thin is not the brand', !leptosMentioned('λεπτός καφές'));
ok('a business that only shares the surname does not switch the brief on', !leptosMentioned('Tell me about Leptos Bathroom Designs in Paphos'));
ok('...unless the guest also names the developer', leptosMentioned('Leptos Bathroom Designs or Leptos Estates, who built Coral Seas Villas?'));
{
  const b = leptosBrief();
  ok('brief calls it a luxury developer', /luxury property developer/.test(b));
  ok('brief names every Cyprus project', LEPTOS_PROJECTS.every((p) => b.includes(p.name)));
  ok('brief has the seven sectors', SECTOR_ORDER.every((s) => b.includes(SECTOR[s].en)));
  ok('brief names the offices and the head office', /Paphos/.test(b) && /Nicosia/.test(b) && /Limassol/.test(b) && /111 Apostolou Pavlou/.test(b));
  ok('brief carries the company figures as statements', /LEPTOS|stated by Leptos/i.test(b) && /350/.test(b) && /25,000/.test(b) && /75 countries/.test(b));
  ok('brief forbids prices and "best"', /Never state a price/.test(b) && /Never call it the best/.test(b));
  ok('brief keeps the trust rule (partner only when tagged)', /OUR PARTNER/.test(b));
  ok('brief keeps other Leptos-named businesses apart', /Leptos Bathroom Designs/.test(b) && /NOT PART OF THE GROUP/.test(b));
  ok('brief has no euro amount', !/€|EUR\s?\d/.test(b));
  ok('brief is a reasonable size', b.length > 2500 && b.length < 7000);
  const ctx: ConciergeContext = { candidates: [], picks: [], guides: [], articles: [], kb: [], canRoute: false, luxury: false, brand: { id: 'leptos', text: b } };
  ok('the grounding block carries the brief', groundingBlock(ctx, 'en').includes('BRAND BRIEF: LEPTOS'));
  ok('without a brand the block is unchanged', !groundingBlock({ ...ctx, brand: null }, 'en').includes('BRAND BRIEF'));
}

report('leptos-partner');
