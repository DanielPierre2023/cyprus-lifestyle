# Concierge und Unternehmen: so arbeitet er jetzt

Gehört zu `docs/PLAN-UNTERNEHMEN-CONCIERGE-VERKAUF.md`, Paket S (Schritte 1 bis 6). Stand: 13. Oktober 2026.

## Was sich ändert (kurz)

| Schritt | Vorher | Jetzt |
|---|---|---|
| S1 Namenssuche | Nur die 3.076 veröffentlichten Firmen; ein ganzer Satz fand nichts | Alle 17.747 (`published` und `listed`); der Name darf **mitten im Satz** stehen; Tippfehler werden toleriert; Allerwelts-Namen („Tavern“) treffen nicht jeden Satz |
| S2 Fakten | Der Concierge kannte nur Name, Art, Bezirk, Bewertung | Er bekommt **Adresse, Telefon, eigene Website** und eine kurze Übersicht, nur was wir wirklich haben. Öffnungszeiten nennt er nur, wenn welche gespeichert sind (heute bei keiner Firma), sonst: „bitte anrufen“ |
| S3 Stichwortsuche | Jedes Wort ab 4 Buchstaben, sortiert nach Bewertung (Firmen ohne Bewertung landeten hinten) | Füllwörter, Ortsnamen und Allerwelts-Wörter fallen weg; **Treffer im Namen zuerst**, dann bezahlte Stufe, geprüft, Bewertung |
| S4 Unbekannte Firma | Der Concierge konnte eine andere Firma als die gefragte darstellen | Er sagt **ehrlich**, dass die Firma noch nicht im Verzeichnis ist, bietet an, sie aufzunehmen, und nennt Alternativen **als Alternativen**. Jede solche Frage wird protokolliert: Admin → Analytics → „Businesses asked for but not in the directory“ |
| S5 Vertrauen | Nur „verified“ und „partner“ als Zusatz | **Drei Stufen** (siehe unten) und **Partner zuerst** in ihrer Kategorie |
| S6 Sensible Rubriken | Alles wurde gleich behandelt | Erotik-Läden, Wettbüros, Casinos, Lotterie und Waffengeschäfte bleiben im Verzeichnis und auf der Karte, der Concierge nennt sie aber **nicht ungefragt** (siehe unten) |

## Sensible Rubriken (S6)

Rubriken (`subtype`): `sex-shops`, `escort-agencies`, `betting-agencies`, `casino`, `lottery-shops`; bei `gaming-guns-and-equipment` nur Geschäfte, deren Name Waffen nennt (dieselbe Rubrik enthält auch Brettspiel- und Spielzeugläden).
Der Concierge nennt sie nur, wenn

- der Gast sie **namentlich** nennt, oder
- der Gast nach dieser Art von Geschäft **fragt** (Wörter in allen sieben Sprachen, z. B. Casino, Wettbüro, Sexshop, καζίνο, kasyno, cazinou, казино, كازينو).

Auf „bester Laden in Nikosia“ erscheint also kein Waffengeschäft. Escort-Einträge sind gar nicht öffentlich (Status `hidden`, siehe `docs/VEROEFFENTLICHUNG-UNTERNEHMEN.md`).

## Die drei Vertrauensstufen

| Stufe | Quelle in der Datenbank | Was der Concierge sagt |
|---|---|---|
| **Partner** (bezahlt) | `commercial_rank` 1 bis 3, `commercial_tier`, oder `featured` | Nennt den Partner **zuerst** (bei vergleichbaren Firmen derselben Kategorie), empfiehlt ihn warm, sagt **einmal kurz**, dass es ein Partner (bezahlte Platzierung) ist. Behauptet nie „der Beste“, wenn eine nähere oder besser bewertete Firma existiert |
| **Geprüft** | `verified = true` | „Wir haben diese Firma geprüft und stehen dahinter“, empfiehlt sie sicher, nutzt trotzdem nur belegte Fakten |
| **Ungeprüft** | alles andere (heute alle 17.833) | Bietet sie trotzdem an, sagt **einmal pro Antwort**, dass die Redaktion sie noch nicht geprüft hat und die Angaben allgemein sind; verspricht nichts zu Qualität, Preis, Öffnungszeiten |

„Owner-verified“ (Firma hat über „Eintrag beanspruchen“ bestätigt) wird zusätzlich erwähnt („Angaben vom Inhaber bestätigt“), zählt aber **nicht** als redaktionell geprüft.

Reihenfolge bei vergleichbaren Firmen: Partner → geprüft → ungeprüft. Die Umstellung passiert nur **innerhalb der Kategorie**, die zur Frage passt; eine bezahlte Firma aus einer anderen Kategorie rutscht nie nach vorn. Eine Firma, die der Gast **namentlich** nennt, bleibt immer an erster Stelle. Solange niemand bezahlt, ändert sich an der Reihenfolge nichts.

## Datenbank: einspielen (einmalig)

Dateien:
- `supabase/migrations/20261013120000_concierge_name_search.sql` legt **neben** der bestehenden `match_directory_name(q, match_count)` eine zweite Funktion mit drei Argumenten an (`…, grams`) und zwei kleine Hilfsfunktionen (`cl_name_key`, `cl_name_is_generic`). Die alte Funktion bleibt unverändert; es wird nichts gelöscht und es werden **keine Daten** geändert.
- `supabase/migrations/20261013121000_directory_facets.sql` legt `directory_facets()` an (Zählung für die Verzeichnis-Seiten).
- `supabase/migrations/20261013122000_directory_address_source.sql` fügt `directory_listings.address_source` hinzu (woher eine Adresse stammt).

1. Supabase → SQL Editor → Inhalt der Datei einfügen → Run.
2. Prüfen (jede Zeile muss die genannte Firma zeigen):

```sql
select * from public.match_directory_name('Do you have a phone number for A and M Solomou Signs in Kato Polemidia?', 5, array['solomou signs']);
select * from public.match_directory_name('Zya', 3, array['zya']);
select * from public.match_directory_name('what is the best italian restaurant in limassol', 5, array['italian']);  -- keine Zeile: richtig
```

**Reihenfolge:** Der Code funktioniert auch **vor** dem SQL (er fällt dann auf die alte Funktion zurück, nur `published`). Man kann also zuerst deployen und danach das SQL einspielen.

**Zurück (falls nötig):** Die alte Funktion ist nie angefasst worden. Es reicht, die neue zu entfernen (der Code fällt dann auf die alte zurück):

```sql
drop function if exists public.match_directory_name(text, integer, text[]);
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
- `lib/concierge/sensitive.ts` sensible Rubriken, Erkennung der direkten Frage (7 Sprachen)
- `lib/concierge/facts.ts` Adresse, Telefon, eigene Website, Öffnungszeiten, Übersicht (bereinigt)
- `lib/concierge/brain.ts` Einbau (Suche, Reihenfolge, Kontext, System-Anweisung)
- `lib/concierge/analytics.ts` + `app/[locale]/admin/(panel)/analytics/page.tsx` Protokoll und Admin-Liste
- Tests: `scripts/tests/concierge-names.test.ts`, `scripts/tests/concierge-trust.test.ts`, `scripts/tests/concierge-sensitive.test.ts`
