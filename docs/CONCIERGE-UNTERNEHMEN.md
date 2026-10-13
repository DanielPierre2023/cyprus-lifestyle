# Concierge und Unternehmen: so arbeitet er jetzt

Gehört zu `docs/PLAN-UNTERNEHMEN-CONCIERGE-VERKAUF.md`, Paket S (Schritte 1 bis 5). Stand: 13. Oktober 2026.

## Was sich ändert (kurz)

| Schritt | Vorher | Jetzt |
|---|---|---|
| S1 Namenssuche | Nur die 3.076 veröffentlichten Firmen; ein ganzer Satz fand nichts | Alle 17.747 (`published` und `listed`); der Name darf **mitten im Satz** stehen; Tippfehler werden toleriert; Allerwelts-Namen („Tavern“) treffen nicht jeden Satz |
| S2 Fakten | Der Concierge kannte nur Name, Art, Bezirk, Bewertung | Er bekommt **Adresse, Telefon, eigene Website** und eine kurze Übersicht, nur was wir wirklich haben. Öffnungszeiten nennt er nur, wenn welche gespeichert sind (heute bei keiner Firma), sonst: „bitte anrufen“ |
| S3 Stichwortsuche | Jedes Wort ab 4 Buchstaben, sortiert nach Bewertung (Firmen ohne Bewertung landeten hinten) | Füllwörter, Ortsnamen und Allerwelts-Wörter fallen weg; **Treffer im Namen zuerst**, dann bezahlte Stufe, geprüft, Bewertung |
| S4 Unbekannte Firma | Der Concierge konnte eine andere Firma als die gefragte darstellen | Er sagt **ehrlich**, dass die Firma noch nicht im Verzeichnis ist, bietet an, sie aufzunehmen, und nennt Alternativen **als Alternativen**. Jede solche Frage wird protokolliert: Admin → Analytics → „Businesses asked for but not in the directory“ |
| S5 Vertrauen | Nur „verified“ und „partner“ als Zusatz | **Drei Stufen** (siehe unten) und **Partner zuerst** in ihrer Kategorie |

## Die drei Vertrauensstufen

| Stufe | Quelle in der Datenbank | Was der Concierge sagt |
|---|---|---|
| **Partner** (bezahlt) | `commercial_rank` 1 bis 3, `commercial_tier`, oder `featured` | Nennt den Partner **zuerst** (bei vergleichbaren Firmen derselben Kategorie), empfiehlt ihn warm, sagt **einmal kurz**, dass es ein Partner (bezahlte Platzierung) ist. Behauptet nie „der Beste“, wenn eine nähere oder besser bewertete Firma existiert |
| **Geprüft** | `verified = true` | „Wir haben diese Firma geprüft und stehen dahinter“, empfiehlt sie sicher, nutzt trotzdem nur belegte Fakten |
| **Ungeprüft** | alles andere (heute alle 17.833) | Bietet sie trotzdem an, sagt **einmal pro Antwort**, dass die Redaktion sie noch nicht geprüft hat und die Angaben allgemein sind; verspricht nichts zu Qualität, Preis, Öffnungszeiten |

„Owner-verified“ (Firma hat über „Eintrag beanspruchen“ bestätigt) wird zusätzlich erwähnt („Angaben vom Inhaber bestätigt“), zählt aber **nicht** als redaktionell geprüft.

Reihenfolge bei vergleichbaren Firmen: Partner → geprüft → ungeprüft. Die Umstellung passiert nur **innerhalb der Kategorie**, die zur Frage passt; eine bezahlte Firma aus einer anderen Kategorie rutscht nie nach vorn. Eine Firma, die der Gast **namentlich** nennt, bleibt immer an erster Stelle. Solange niemand bezahlt, ändert sich an der Reihenfolge nichts.

## Datenbank: einspielen (einmalig)

Datei: `supabase/migrations/20261013120000_concierge_name_search.sql`. Sie ersetzt `match_directory_name` und legt zwei kleine Hilfsfunktionen an (`cl_name_key`, `cl_name_is_generic`). Es werden **keine Daten** geändert.

1. Supabase → SQL Editor → Inhalt der Datei einfügen → Run.
2. Prüfen (jede Zeile muss die genannte Firma zeigen):

```sql
select * from public.match_directory_name('Do you have a phone number for A and M Solomou Signs in Kato Polemidia?', 5, array['solomou signs']);
select * from public.match_directory_name('Zya', 3);
select * from public.match_directory_name('what is the best italian restaurant in limassol', 5, array['italian']);  -- keine Zeile: richtig
```

**Reihenfolge:** Der Code funktioniert auch **vor** dem SQL (er fällt dann auf die alte Funktion zurück, nur `published`). Man kann also zuerst deployen und danach das SQL einspielen.

**Zurück (falls nötig):**

```sql
drop function if exists public.match_directory_name(text, integer, text[]);
create or replace function public.match_directory_name(q text, match_count integer default 12)
returns table(slug text, score real)
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  with scored as (
    select l.slug,
      greatest(word_similarity(q, coalesce(l.name_en, '')), word_similarity(q, coalesce(l.name_el, '')), word_similarity(q, coalesce(l.name_ru, '')),
               word_similarity(q, coalesce(l.name_ro, '')), word_similarity(q, coalesce(l.name_de, '')), word_similarity(q, coalesce(l.name_ar, '')),
               word_similarity(q, coalesce(l.name_pl, '')))::real as sim,
      (coalesce(l.name_en, '') ilike '%' || q || '%') as substr_hit
    from public.directory_listings l where l.status = 'published'
  )
  select slug, (case when substr_hit then greatest(sim, 0.95::real) else sim end) as score
  from scored where sim > 0.30 or substr_hit order by score desc limit greatest(1, match_count);
$$;
revoke all on function public.match_directory_name(text, integer) from public, anon, authenticated;
grant execute on function public.match_directory_name(text, integer) to service_role;
```

## Messwerte (Lesetest gegen die echte Datenbank, 13. Oktober)

| Frage | Ergebnis |
|---|---|
| „Telefonnummer von A and M Solomou Signs in Kato Polemidia?“ (nur `listed`) | gefunden, Wert 1,0 |
| „Tell me about Solymaris Beach Bar in Protaras“ | gefunden |
| „Расскажи про Компот в Лимассоле“ (kyrillischer Name, `listed`) | gefunden |
| „Zya“ (Kurzform) | „Zya Cafe“ |
| „solimaris beach bar“ (Tippfehler) | „Solymaris Beach Bar“ |
| „best italian restaurant in limassol“, „a lawyer in Paphos“ | **keine** Namenstreffer (richtig; Kategorie-Suche übernimmt) |
| „Xenos tavern in Paphos“ (gibt es nicht) | keine Treffer, wird als „nicht im Verzeichnis“ gemeldet |
| Zeit der Namenssuche | etwa 20 bis 100 ms (vorher bei gleichem Umfang 0,6 bis 1,4 s per Volltext) |

## Dateien

- `lib/concierge/names.ts` Wortlisten (7 Sprachen), `nameGrams`, `distinctiveTerms`, `askedNames`
- `lib/concierge/trust.ts` Stufen, Etikett, „Partner zuerst“
- `lib/concierge/facts.ts` Adresse, Telefon, eigene Website, Öffnungszeiten, Übersicht (bereinigt)
- `lib/concierge/brain.ts` Einbau (Suche, Reihenfolge, Kontext, System-Anweisung)
- `lib/concierge/analytics.ts` + `app/[locale]/admin/(panel)/analytics/page.tsx` Protokoll und Admin-Liste
- Tests: `scripts/tests/concierge-names.test.ts`, `scripts/tests/concierge-trust.test.ts`
