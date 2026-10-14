// lib/partners/leptos.sql.ts: the Leptos SQL files, generated from the same data and texts the page uses (so page, rows and concierge never
// disagree). Pure: returns { fileName: sql }. scripts/leptos-sql.mjs writes them to supabase/data/; scripts/tests/leptos-partner.test.ts checks
// that the committed files equal this output.
import {
  LEPTOS_SLUG, LEPTOS_SITE, LEPTOS_OFFICES, LEPTOS_NEW_PROJECTS, LEPTOS_PROJECTS, LEPTOS_NEW_GROUP_ROWS,
  PLACE_CENTRE, hubSummary, officeSummary, projectSummary, groupRowSummary, entitySummary, placeName,
} from '@/lib/partners/leptos';

export function leptosSqlFiles(): Record<string, string> {
const files: Record<string, string> = {};
const LOCS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (xs: string[]): string => `array[${xs.map(q).join(', ')}]::text[]`;
const COLS7 = (pre: string) => LOCS.map((l) => `${pre}_${l}`);

const HEADER = (name: string, purpose: string, extra: string[] = []) => [
  `-- ${name}`,
  '-- ---------------------------------------------------------------------------------------------------------------------',
  `-- ${purpose}`,
  ...extra.map((e) => `-- ${e}`),
  '-- Läuft im Supabase SQL Editor: ganze Datei einfügen, Run. Alles oder nichts (eine Transaktion). Unten steht eine Zahlentabelle.',
  '-- ---------------------------------------------------------------------------------------------------------------------',
  '',
].join('\n');

const HQ = LEPTOS_OFFICES[0], NIC = LEPTOS_OFFICES[1], LIM = LEPTOS_OFFICES[2];
const COMMON_TAGS = ['leptos', 'leptos estates', 'leptos group'];
const SOCIALS = { facebook: 'https://www.facebook.com/leptosestates', instagram: 'https://www.instagram.com/leptos_estates/', linkedin: 'https://www.linkedin.com/company/leptos-estates' };

// ── slugs that exist already and are changed (backup + rollback) ────────────────────────────────
const CHANGED_EXISTING = [
  LEPTOS_SLUG, NIC.slug,
  'coral-beach-hotel-and-resort', 'thalassa-3l4tp3', 'paphos-gardens-fvm4nm', 'basilica-4oa6krw', 'neapolis-university-pafos-paphos', 'iasis-private-hospital-4757',
  ...LEPTOS_PROJECTS.filter((p) => p.existing).map((p) => p.slug),
  'leptos-paphos-gardens-hotel---cyprus-8720', 'thalassa-hotel-8814',
];
const NEW_SLUGS = [LIM.slug, ...LEPTOS_NEW_GROUP_ROWS.map((g) => g.slug), ...LEPTOS_NEW_PROJECTS.map((p) => p.slug)];
const list = (xs: string[]) => xs.map(q).join(', ');

// ── 50 · pre-check (read only) ──────────────────────────────────────────────────────────────────
{
  const targets: { slug: string; type: string; name: string; lat: number; lng: number }[] = [
    { slug: HQ.slug, type: 'vendor', name: 'Leptos Estates', lat: HQ.lat, lng: HQ.lng },
    { slug: NIC.slug, type: 'vendor', name: NIC.name, lat: NIC.lat, lng: NIC.lng },
    { slug: LIM.slug, type: 'vendor', name: LIM.name, lat: LIM.lat, lng: LIM.lng },
    ...LEPTOS_NEW_GROUP_ROWS.map((g) => ({ slug: g.slug, type: g.type, name: g.name, lat: g.lat, lng: g.lng })),
    ...LEPTOS_NEW_PROJECTS.map((p) => ({ slug: p.slug, type: 'development', name: p.name, lat: p.lat, lng: p.lng })),
  ];
  const sql = [
    HEADER('20261014-50-leptos-vorpruefung.sql', 'Nur lesen. Vorher einmal ausführen: zeigt, ob etwas von Leptos schon in der Datenbank steht (Dubletten) und ob eine neue Zeile mit einer vorhandenen kollidieren würde.', ['Es wird nichts geändert. Die Antwort ist EINE Tabelle:', 'Zeilen „1 …“ und „2 …“ sollten fehlen (= keine Probleme); Zeilen „3 …“ sind vorhandene Leptos-nahe Einträge zum Ansehen.']),
    'with target(slug, type, name, lat, lng) as (values',
    targets.map((t) => `  (${q(t.slug)}, ${q(t.type)}, ${q(t.name)}, ${t.lat}::double precision, ${t.lng}::double precision)`).join(',\n'),
    '),',
    'c1 as (',
    "  select '1 Kollision mit der Dubletten-Sperre (muss leer sein)'::text as pruefung, t.slug::text as zeile, o.slug::text as andere_zeile, o.name_en::text as name, o.status::text as status",
    '    from target t',
    '    join public.directory_listings o',
    '      on public.directory_dedup_key(o.type, o.name_en, o.lat, o.lng) = public.directory_dedup_key(t.type, t.name, t.lat, t.lng)',
    '     and o.slug <> t.slug',
    '),',
    'c2 as (',
    "  select '2 Adresse (slug) ist schon vergeben (muss leer sein)'::text, slug::text, ''::text, name_en::text, status::text",
    `    from public.directory_listings where slug in (${list(NEW_SLUGS)})`,
    '),',
    'c3 as (',
    "  select '3 vorhandener Eintrag, der zu Leptos gehören könnte (ansehen)'::text, slug::text, coalesce(url, '')::text, name_en::text, (type || ' / ' || status)::text",
    '    from public.directory_listings',
    "   where name_en ilike any (array['%leptos%','%armonia estates%','%vesta holidays%','%resitour%','%chestertons%','%arena sports%','%arena dmc%','%pandora%','%kamares%','%neapolis%','%iasis%','%coral beach%','%thalassa%','%basilica%','%paphos gardens%','%aphrodite gardens%','%paradise gardens%','%limassol del mar%'])",
    "      or url ilike any (array['%leptos%','%vestaholidays%','%resitour%','%chestertons.com.cy%','%arena-sports%','%pandora.com.cy%','%kamaresvillage%','%coral.com.cy%','%thalassa.com.cy%','%paphosgardens%','%basilicaresort%','%nup.ac.cy%','%iasishospital%'])",
    "      or email ilike any (array['%leptos%','%vestaholidays%','%coral.com.cy%','%thalassa.com.cy%'])",
    ')',
    'select * from c1 union all select * from c2 union all select * from c3',
    ' order by 1, 2;',
    '',
  ].join('\n');
  files['20261014-50-leptos-vorpruefung.sql'] = sql;
}

// ── 51 · backup ─────────────────────────────────────────────────────────────────────────────────
{
  const sql = [
    HEADER('20261014-51-leptos-sicherung.sql', 'Sichert die vorhandenen Zeilen, die die Leptos-Dateien ändern (Rückweg: -54-). Vor -52- und -53- einmal ausführen.', ['Die Sicherung wird nicht überschrieben, wenn die Datei ein zweites Mal läuft (der erste Stand bleibt).']),
    'create schema if not exists backup_20261014_leptos;',
    'create table if not exists backup_20261014_leptos.directory_listings as',
    `  select * from public.directory_listings where slug in (${list(CHANGED_EXISTING)});`,
    '',
    'select count(*) as gesicherte_zeilen from backup_20261014_leptos.directory_listings;',
    '',
  ].join('\n');
  files['20261014-51-leptos-sicherung.sql'] = sql;
}

// ── 52 · head office, offices, group rows ───────────────────────────────────────────────────────
{
  const parts: string[] = [];
  parts.push(HEADER('20261014-52-leptos-konzern.sql', 'Leptos Estates (Hauptsitz Paphos), Büros Nikosia und Limassol, Konzernfirmen. Danach -53- (Projekte).', ['Vorher: -51- (Sicherung). Setzt Hauptsitz auf Art „vendor“ (Unternehmen) und „luxury“.']));

  // hub
  const hubName = 'Leptos Estates';
  parts.push('-- 1) Hauptsitz: bestehende Zeile `leptos-estates` aktualisieren');
  parts.push(`update public.directory_listings set
  type = 'vendor', category_group = 'realestate', subtype = 'property-developer', canonical_category = 'property-developer',
  district = 'paphos', luxury = true,
  ${COLS7('name').map((c) => `${c} = ${q(hubName)}`).join(', ')},
  ${LOCS.map((l) => `summary_${l} = ${q(hubSummary(l))}`).join(',\n  ')},
  address = ${q(HQ.address)}, lat = ${HQ.lat}, lng = ${HQ.lng}, coords_precision = ${q(HQ.precision)},
  phone = ${q(HQ.phone)}, email = ${q(HQ.email)}, url = ${q(LEPTOS_SITE)},
  image = '/partners/leptos/cover.jpg', image_credit = 'Leptos Estates',
  socials = ${q(JSON.stringify(SOCIALS))}::jsonb,
  tags = ${arr([...COMMON_TAGS, 'leptos developers', 'luxury developer', 'property developer', 'real estate', 'villas', 'apartments', 'paphos', 'nicosia', 'limassol', 'cyprus', 'greece'])},
  source_url = ${q('https://www.leptosestates.com/')}, fetched_at = now(), updated_at = now()
 where slug = ${q(LEPTOS_SLUG)};`);
  parts.push('');

  // Nicosia (existing row Armonia Estates Ltd)
  parts.push('-- 2) Büro Nikosia: bestehende Zeile `armonia-estates-ltd-12525` (Armonia Estates Ltd ist die juristische Person von Leptos Estates)');
  parts.push(`update public.directory_listings set
  type = 'vendor', category_group = 'realestate', subtype = 'real-estate-agency', canonical_category = 'real-estate-agency',
  district = 'nicosia', luxury = true,
  ${COLS7('name').map((c) => `${c} = ${q(NIC.name)}`).join(', ')},
  ${LOCS.map((l) => `summary_${l} = ${q(officeSummary(l, 'nicosia'))}`).join(',\n  ')},
  address = ${q(NIC.address)}, lat = ${NIC.lat}, lng = ${NIC.lng}, coords_precision = ${q(NIC.precision)},
  phone = ${q(NIC.phone)}, email = ${q(NIC.email)}, url = ${q(LEPTOS_SITE)},
  image = '/partners/leptos/cover.jpg', image_credit = 'Leptos Estates', developer_slug = ${q(LEPTOS_SLUG)},
  tags = ${arr([...COMMON_TAGS, 'armonia estates', 'estate agent', 'nicosia', 'cyprus'])},
  source_url = ${q('https://www.leptosestates.com/')}, fetched_at = now(), updated_at = now()
 where slug = ${q(NIC.slug)};`);
  parts.push('');

  // new rows: Limassol office + group rows
  const insCols = ['slug', 'type', 'district', 'category_group', 'subtype', 'canonical_category', 'luxury',
    ...COLS7('name'), ...COLS7('summary'),
    'address', 'lat', 'lng', 'coords_precision', 'url', 'phone', 'email', 'image', 'image_credit', 'tags', 'developer_slug',
    'source_url', 'fetched_at', 'status', 'published_at', 'north'];
  const rows: string[] = [];
  rows.push(`(${[
    q(LIM.slug), q('vendor'), q('limassol'), q('realestate'), q('real-estate-agency'), q('real-estate-agency'), 'true',
    ...LOCS.map(() => q(LIM.name)), ...LOCS.map((l) => q(officeSummary(l, 'limassol'))),
    q(LIM.address), String(LIM.lat), String(LIM.lng), q(LIM.precision), q(LEPTOS_SITE), q(LIM.phone), q(LIM.email), q('/partners/leptos/cover.jpg'), q('Leptos Estates'),
    arr([...COMMON_TAGS, 'estate agent', 'limassol', 'agios tychonas', 'cyprus']), q(LEPTOS_SLUG),
    q('https://www.leptosestates.com/'), 'now()', q('published'), 'now()', 'false',
  ].join(', ')})`);
  for (const g of LEPTOS_NEW_GROUP_ROWS) {
    const canon = g.slug === 'leptos-chestertons-cyprus' ? 'real-estate-agency' : g.slug === 'leptos-resitour-holiday-residences' ? 'apartment-rental' : g.slug === 'leptos-arena-sports' ? 'tour-activity' : null;
    rows.push(`(${[
      q(g.slug), q(g.type), q(g.district), q(g.group), q(g.subtype), q(canon), 'false',
      ...LOCS.map(() => q(g.name)), ...LOCS.map((l) => q(groupRowSummary(l, g.slug))),
      q(g.address), String(g.lat), String(g.lng), q(g.precision), q(g.url), q(g.phone), q(g.email), 'null', 'null',
      arr(g.tags), q(LEPTOS_SLUG),
      q(g.url), 'now()', q('published'), 'now()', 'false',
    ].join(', ')})`);
  }
  parts.push('-- 3) Neue Zeilen: Büro Limassol und Konzernfirmen (Vesta Holidays, Chestertons, Resitour, Arena Sports). Gibt es eine Zeile schon, wird sie übersprungen.');
  parts.push(`insert into public.directory_listings (${insCols.join(', ')})\nvalues\n${rows.join(',\n')}\non conflict do nothing;`);
  parts.push('');

  // existing group rows: texts in 7 languages for the four whose text was a generic stub or a third-party snippet
  const refresh: [string, string][] = [
    ['iasis-private-hospital-4757', 'iasis'], ['basilica-4oa6krw', 'basilica'], ['paphos-gardens-fvm4nm', 'paphosgardens'], ['thalassa-3l4tp3', 'thalassa'],
  ];
  parts.push('-- 4) Vorhandene Konzernzeilen: eigene, faktenbasierte Texte (7 Sprachen) statt automatischer Kurztexte; Basilica war als Restaurant geführt, ist ein Hotel');
  for (const [slug, id] of refresh) {
    parts.push(`update public.directory_listings set ${LOCS.map((l) => `summary_${l} = ${q(entitySummary(l, id))}`).join(', ')}, updated_at = now() where slug = ${q(slug)};`);
  }
  parts.push(`update public.directory_listings set type = 'hotel', category_group = 'stays' where slug = 'basilica-4oa6krw';`);
  parts.push(`update public.directory_listings set address = coalesce(nullif(address, ''), '2 Danais Avenue, 8042 Paphos') where slug = 'neapolis-university-pafos-paphos';`);
  parts.push('');
  parts.push('-- 5) Fehlende Koordinaten der Konzernzeilen ergänzen (vorhandene Koordinaten bleiben unberührt)');
  parts.push(`update public.directory_listings l set lat = coalesce(l.lat, v.lat), lng = coalesce(l.lng, v.lng),
  coords_precision = case when l.lat is null or l.lng is null then 'geocoded' else l.coords_precision end
  from (values
    ('coral-beach-hotel-and-resort', 34.857098::double precision, 32.362959::double precision),
    ('thalassa-3l4tp3', 34.854956, 32.363914),
    ('paphos-gardens-fvm4nm', 34.753236, 32.424643),
    ('neapolis-university-pafos-paphos', 34.749421, 32.426605),
    ('iasis-private-hospital-4757', 34.762628, 32.438487)
  ) v(slug, lat, lng)
 where l.slug = v.slug and (l.lat is null or l.lng is null);`);
  parts.push('');
  parts.push('-- 6) Büro Nikosia und Krankenhaus Iasis sind noch „listed“ (nicht öffentlich). Sie gehören zur Leptos-Seite und werden jetzt veröffentlicht.');
  parts.push(`update public.directory_listings set status = 'published', published_at = coalesce(published_at, now()) where slug in (${list([NIC.slug, 'iasis-private-hospital-4757'])}) and status = 'listed';`);
  parts.push('');
  parts.push('-- 7) Herkunft der Koordinaten notieren, falls die Spalte existiert (Migration vom 14.10.)');
  parts.push(`do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'directory_listings' and column_name = 'coords_source') then
    execute $q$ update public.directory_listings set coords_source = 'osm'
      where slug in (${list([LEPTOS_SLUG, NIC.slug, LIM.slug, ...LEPTOS_NEW_GROUP_ROWS.map((g) => g.slug)])}) $q$;
  end if;
end $$;`);
  parts.push('');
  parts.push('-- Kontrolle');
  parts.push(`select slug, type, status, name_en, district, lat, lng, coords_precision, luxury
  from public.directory_listings
 where slug in (${list([LEPTOS_SLUG, NIC.slug, LIM.slug, ...LEPTOS_NEW_GROUP_ROWS.map((g) => g.slug), 'basilica-4oa6krw'])})
 order by slug;`);
  parts.push('');
  files['20261014-52-leptos-konzern.sql'] = parts.join('\n');
}

// ── 53 · projects ───────────────────────────────────────────────────────────────────────────────
{
  const insCols = ['slug', 'type', 'district', 'category_group', 'luxury', ...COLS7('name'), ...COLS7('summary'),
    'address', 'lat', 'lng', 'coords_precision', 'url', 'phone', 'email', 'image', 'image_credit', 'tags', 'bedrooms', 'developer_slug',
    'source_url', 'fetched_at', 'status', 'published_at', 'north'];
  const rows = LEPTOS_NEW_PROJECTS.map((p) => {
    const c = PLACE_CENTRE[p.place];
    const addr = p.place === 'paphos' ? 'Paphos' : c.district === 'limassol' ? placeName('en', p.place) : `${placeName('en', p.place)}, Paphos`;
    const tags = ['leptos', 'leptos estates', 'new development', p.kind === 'villas' ? 'villas' : p.kind === 'apartments' ? 'apartments' : 'residential', placeName('en', p.place).toLowerCase()];
    return `(${[
      q(p.slug), q('development'), q(c.district), q('realestate'), p.luxury ? 'true' : 'false',
      ...LOCS.map(() => q(p.name)), ...LOCS.map((l) => q(projectSummary(l, p))),
      q(addr), String(p.lat), String(p.lng), q(p.precision), q(p.url), q(HQ.phone), q(HQ.email),
      p.noImage ? 'null' : q(`/partners/leptos/p/${p.key}.jpg`), q('Leptos Estates'),
      arr(Array.from(new Set(tags))), q(p.beds ?? null), q(LEPTOS_SLUG),
      q(p.url), 'now()', q('published'), 'now()', 'false',
    ].join(', ')})`;
  });
  const parts: string[] = [];
  parts.push(HEADER('20261014-53-leptos-projekte.sql', `Alle ${LEPTOS_PROJECTS.length} Leptos-Projekte auf Zypern: ${LEPTOS_NEW_PROJECTS.length} neue Zeilen, ${LEPTOS_PROJECTS.length - LEPTOS_NEW_PROJECTS.length} vorhandene (Aphrodite Gardens, Limassol Del Mar) werden verknüpft.`, ['Vorher: -51- und -52-. Texte nur aus den Beschreibungen auf leptosestates.com; keine Preise, keine Termine.', 'Koordinaten: Genauigkeit „geocoded“ = OpenStreetMap-Treffer gleichen Namens; „town“ = Ortsmitte des Dorfes oder der Stadt (genaue Lage kommt von Leptos).']));
  parts.push('-- 1) Neue Projekte. Gibt es eine Zeile schon (gleicher slug oder Dubletten-Sperre), wird sie übersprungen.');
  parts.push(`insert into public.directory_listings (${insCols.join(', ')})\nvalues\n${rows.join(',\n')}\non conflict do nothing;`);
  parts.push('');
  parts.push('-- 2) Vorhandene Projekt-Zeilen mit dem Entwickler verknüpfen (nur wenn noch kein Entwickler eingetragen ist)');
  const existing = LEPTOS_PROJECTS.filter((p) => p.existing);
  parts.push(`update public.directory_listings set developer_slug = ${q(LEPTOS_SLUG)} where slug in (${list(existing.map((p) => p.slug))}) and developer_slug is null;`);
  parts.push(`update public.directory_listings l set lat = coalesce(l.lat, v.lat), lng = coalesce(l.lng, v.lng),
  coords_precision = case when l.lat is null or l.lng is null then 'geocoded' else l.coords_precision end
  from (values ${existing.map((p) => `(${q(p.slug)}, ${p.lat}::double precision, ${p.lng}::double precision)`).join(', ')}) v(slug, lat, lng)
 where l.slug = v.slug and (l.lat is null or l.lng is null);`);
  parts.push('');
  parts.push('-- 3) Herkunft der Koordinaten notieren, falls die Spalte existiert');
  parts.push(`do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'directory_listings' and column_name = 'coords_source') then
    execute $q$ update public.directory_listings set coords_source = case when coords_precision = 'town' then 'town' else 'osm' end
      where slug in (${list(LEPTOS_NEW_PROJECTS.map((p) => p.slug))}) $q$;
  end if;
end $$;`);
  parts.push('');
  parts.push('-- Kontrolle: erwartet alle Projekte, davon neu angelegt ' + LEPTOS_NEW_PROJECTS.length);
  parts.push(`select count(*) as projekte_in_der_datenbank,
       count(*) filter (where slug in (${list(LEPTOS_NEW_PROJECTS.map((p) => p.slug))})) as neu_angelegt,
       count(*) filter (where coords_precision = 'town') as lage_ortsmitte,
       count(*) filter (where coords_precision = 'geocoded') as lage_openstreetmap
  from public.directory_listings
 where slug in (${list(LEPTOS_PROJECTS.map((p) => p.slug))});`);
  parts.push('');
  files['20261014-53-leptos-projekte.sql'] = parts.join('\n');
}

// ── 54 · rollback ───────────────────────────────────────────────────────────────────────────────
{
  const restore = ['type', 'category_group', 'subtype', 'canonical_category', 'district', 'luxury', ...COLS7('name'), ...COLS7('summary'), 'address', 'lat', 'lng', 'coords_precision',
    'phone', 'email', 'url', 'image', 'image_credit', 'socials', 'tags', 'developer_slug', 'source_url', 'fetched_at', 'status'];
  const sql = [
    HEADER('20261014-54-leptos-rueckgaengig.sql', 'NUR BEI BEDARF: nimmt alles zurück, was -52-, -53- und -55- geändert oder angelegt haben.', ['Stellt die vorhandenen Zeilen aus der Sicherung (-51-) wieder her und löscht die neu angelegten.']),
    `delete from public.directory_listings where slug in (${list(NEW_SLUGS)});`,
    '',
    'update public.directory_listings l set',
    restore.map((c) => `  ${c} = b.${c}`).join(',\n') + ',',
    '  updated_at = now()',
    '  from backup_20261014_leptos.directory_listings b',
    ' where b.id = l.id;',
    '',
    `select (select count(*) from public.directory_listings where slug in (${list(NEW_SLUGS)})) as neue_zeilen_uebrig,`,
    `       (select count(*) from backup_20261014_leptos.directory_listings) as gesicherte_zeilen;`,
    '',
  ].join('\n');
  files['20261014-54-leptos-rueckgaengig.sql'] = sql;
}

// ── 55 · optional: hide two duplicates ──────────────────────────────────────────────────────────
{
  const sql = [
    HEADER('20261014-55-leptos-doubletten-verbergen.sql', 'OPTIONAL: versteckt zwei Dubletten ohne eigenen Inhalt (gleiche Hotels wie im Konzern, schon vorhanden): „Leptos Paphos Gardens Hotel - Cyprus“ und „Thalassa Hotel“.', ['Die Zeilen bleiben erhalten (Status hidden); Rückweg über -54- (die Zeilen sind in der Sicherung).']),
    `update public.directory_listings set status = 'hidden' where slug in ('leptos-paphos-gardens-hotel---cyprus-8720', 'thalassa-hotel-8814');`,
    '',
    `select slug, status, name_en from public.directory_listings where slug in ('leptos-paphos-gardens-hotel---cyprus-8720', 'thalassa-hotel-8814');`,
    '',
  ].join('\n');
  files['20261014-55-leptos-doubletten-verbergen.sql'] = sql;
}

// ── 56 · check (read only) ──────────────────────────────────────────────────────────────────────
{
  const all = [LEPTOS_SLUG, ...NEW_SLUGS, ...CHANGED_EXISTING.filter((s) => !NEW_SLUGS.includes(s))];
  const sql = [
    HEADER('20261014-56-leptos-kontrolle.sql', 'Nur lesen. Zeigt nach -52- und -53-, ob alles da ist. Die Antwort ist EINE Tabelle.'),
    `select 'A Projekte veröffentlicht (erwartet ${LEPTOS_PROJECTS.length})'::text as pruefung, count(*)::text as wert, ''::text as detail`,
    `  from public.directory_listings where slug in (${list(LEPTOS_PROJECTS.map((p) => p.slug))}) and status = 'published'`,
    'union all',
    `select 'B Büros veröffentlicht (erwartet 3)', count(*)::text, '' from public.directory_listings where slug in (${list([LEPTOS_SLUG, NIC.slug, LIM.slug])}) and status = 'published'`,
    'union all',
    `select 'C neue Konzernzeilen veröffentlicht (erwartet ${LEPTOS_NEW_GROUP_ROWS.length})', count(*)::text, '' from public.directory_listings where slug in (${list(LEPTOS_NEW_GROUP_ROWS.map((g) => g.slug))}) and status = 'published'`,
    'union all',
    "select 'D fehlende neue Zeilen (erwartet: keine; sonst wurde sie wegen einer Dublette übersprungen)', coalesce(string_agg(s.slug, ', '), 'keine'), ''",
    `  from unnest(array[${list(NEW_SLUGS)}]) as s(slug)`,
    ' where not exists (select 1 from public.directory_listings d where d.slug = s.slug)',
    'union all',
    "select 'E ' || type || ' / ' || status, slug, coalesce(district, '-') || ' / ' || coalesce(coords_precision, '-') || ' / ' || round(lat::numeric, 4)::text || ',' || round(lng::numeric, 4)::text || ' / Bild: ' || (image is not null)::text",
    '  from public.directory_listings',
    `  where slug in (${list(all)})`,
    ' order by 1, 2;',
    '',
  ].join('\n');
  files['20261014-56-leptos-kontrolle.sql'] = sql;
}
// ── 57 · template: exact project points from Leptos ──────────────────────────────────────────────
{
const sql = [
  HEADER('20261014-57-leptos-lage-nachtragen.sql', 'VORLAGE für später: genaue Projektpunkte, sobald Leptos sie liefert (Google Maps: Rechtsklick auf die Anlage, oben die Zahlen kopieren).', ['So benutzen: in der Liste unten bei einem Projekt lat und lng ersetzen und aus \'town\' oder \'geocoded\' das Wort \'exact\' machen. Zeilen, die nicht geändert werden, können stehen bleiben (sie schreiben dieselben Werte).', 'Ungeänderte Datei = keine Änderung der Daten. Genaue Punkte werden auf der Karte nicht mehr aufgefächert, wenn sie verschieden sind.']),
  'update public.directory_listings l',
  '   set lat = v.lat, lng = v.lng, coords_precision = v.prec, updated_at = now()',
  '  from (values',
  LEPTOS_NEW_PROJECTS.map((p, i) => `    (${q(p.slug)}, ${p.lat}::double precision, ${p.lng}::double precision, ${q(p.precision)})${i < LEPTOS_NEW_PROJECTS.length - 1 ? ',' : ''}  -- ${p.name}, ${placeName('en', p.place)}`).join('\n'),
  '  ) v(slug, lat, lng, prec)',
  ' where l.slug = v.slug',
  "   and l.coords_precision in ('town', 'geocoded')   -- ein bereits genauer Punkt wird nie überschrieben",
  '   and (l.lat is distinct from v.lat or l.lng is distinct from v.lng or l.coords_precision is distinct from v.prec)',
  '   and v.lat between 34.5 and 35.2 and v.lng between 32.2 and 33.2;',
  '',
  "select count(*) filter (where coords_precision = 'exact') as genau, count(*) filter (where coords_precision = 'geocoded') as openstreetmap, count(*) filter (where coords_precision = 'town') as ortsmitte",
  '  from public.directory_listings',
  ` where slug in (${list(LEPTOS_NEW_PROJECTS.map((p) => p.slug))});`,
  '',
].join('\n');
files['20261014-57-leptos-lage-nachtragen.sql'] = sql;
}
return files;
}
