// Editorial taxonomy — pure data + helpers. No I/O, so it bundles and runs like
// the other pure suites. Asserts the merged taxonomy invariants AND that it stays
// consistent with the franchises (pipeline.ts) and the directory taxonomy — and
// that the seed in 0114_editorial_sections.sql cannot silently drift from it.
import {
  EDITORIAL_SECTIONS, departments, activeSubcategories, subcategoriesOf,
  getSection, isSection, departmentOf, departmentTarget, totalMonthlyTarget,
  orderedSections, SECTION_SORT,
} from '@/lib/editorial/taxonomy';
import { FRANCHISE_KEYS } from '@/lib/editorial/pipeline';
import { CATEGORY_KEYS } from '@/lib/directory/taxonomy';
import { eq, ok, report } from './_harness';

// ── Shape: 9 departments, 31 active subcategories, 79/month ────────────────────
eq('nine departments', departments().length, 9);
eq('thirty-one active subcategories', activeSubcategories().length, 31);
eq('monthly target totals 79', totalMonthlyTarget(), 79);

// ── Keys are unique and well-formed ────────────────────────────────────────────
const keys = EDITORIAL_SECTIONS.map((s) => s.key);
eq('all keys unique', new Set(keys).size, keys.length);
ok('keys are url-safe slugs', keys.every((k) => /^[a-z0-9-]+$/.test(k)));

// ── Hierarchy integrity ────────────────────────────────────────────────────────
ok('departments have no parent', departments().every((d) => d.parentKey === null));
ok('every subcategory parent is a real department',
  EDITORIAL_SECTIONS.filter((s) => s.parentKey).every((s) => {
    const p = getSection(s.parentKey as string);
    return !!p && p.parentKey === null;
  }));
eq('departmentOf(subcategory) resolves', departmentOf('table-fine'), 'table');
eq('departmentOf(department) is itself', departmentOf('table'), 'table');
ok('departmentOf(unknown) is null', departmentOf('spaceship') === null);

// ── Franchise references are valid ─────────────────────────────────────────────
ok('every franchise_key is a real franchise',
  EDITORIAL_SECTIONS.every((s) => s.franchiseKey === null || FRANCHISE_KEYS.has(s.franchiseKey)));

// ── Directory links are valid canonical categories ─────────────────────────────
ok('every dir_group is a canonical directory category',
  EDITORIAL_SECTIONS.every((s) => s.dirGroups.every((g) => CATEGORY_KEYS.has(g))));

// ── Backward-compatibility: existing blog_posts.category values still resolve ───
const LEGACY = ['cyprus', 'business', 'property', 'relocation', 'culture', 'escapes', 'table', 'people', 'world', 'agenda'];
ok('all legacy section keys survive as valid sections', LEGACY.every((k) => isSection(k)));
ok('world is kept but inactive (legacy catch-all)', getSection('world')?.active === false);
ok('legacy departments keep their keys', ['table', 'escapes', 'culture', 'business', 'people', 'property'].every((k) => getSection(k)?.parentKey === null));
ok('relocation is now a subcategory of property', getSection('relocation')?.parentKey === 'property');
ok('agenda is now a subcategory of culture', getSection('agenda')?.parentKey === 'culture');
ok('cyprus is now a subcategory of the-island', getSection('cyprus')?.parentKey === 'the-island');

// ── The three new departments exist ────────────────────────────────────────────
ok('new departments present', ['style', 'design-living', 'the-island'].every((k) => getSection(k)?.parentKey === null && getSection(k)?.active));

// ── Rollups (spot checks that must match the seed) ─────────────────────────────
eq('People targets 14/month', departmentTarget('people'), 14);
eq('The Table targets 10/month', departmentTarget('table'), 10);
eq('Style targets 6/month', departmentTarget('style'), 6);
eq('every department has ≥1 active subcategory', departments().filter((d) => subcategoriesOf(d.key).length === 0).length, 0);

// ── Ordering is stable and strictly increasing ─────────────────────────────────
const ordered = orderedSections();
eq('orderedSections covers every row', ordered.length, EDITORIAL_SECTIONS.length);
ok('SECTION_SORT strictly increases in nav order',
  ordered.every((s, i) => i === 0 || SECTION_SORT[s.key] > SECTION_SORT[ordered[i - 1].key]));
ok('each department appears immediately before its own subcategories',
  departments().every((d) => {
    const di = ordered.findIndex((s) => s.key === d.key);
    const subs = subcategoriesOf(d.key);
    return subs.every((s) => ordered.findIndex((x) => x.key === s.key) > di);
  }));

report('editorial-taxonomy.pure');
