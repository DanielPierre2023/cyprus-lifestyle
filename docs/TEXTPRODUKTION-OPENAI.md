# Textproduktion auf OpenAI (gpt-6-luna) — Übergabe

Stand: Oktober 2026. Diese Datei beschreibt, was sich geändert hat, in welcher Reihenfolge es eingespielt wird, was es kostet, wie man es abschaltet und was **noch nicht live geprüft** werden konnte.

## 1. Was sich geändert hat

Alles, was Text schreibt, läuft jetzt über **OpenAI, Modell `gpt-6-luna`**. Nichts davon geht mehr an Claude oder Gemini.

| Bereich | Wo | Zustand |
|---|---|---|
| Artikel-Redaktion (Scraper-Artikel → 7 Sprachen) | Edge-Funktion `process-scraped-article` | **neu gebaut** (Faktenkern → 7 eigenständige Fassungen → Redaktion → Faktencheck → Veröffentlichungs-Tor) |
| Redaktionsstudio (Interview-Fragen, Interview-Artikel, Rezension) | Edge-Funktion `ai-editorial` | **neu gebaut**, mit Zitat- und Zahlenprüfung |
| Cover-Foto-Brief | Edge-Funktion `search-cover-photos` | von Gemini auf OpenAI umgestellt |
| Übersetzung, Transcreation, Korrektorat, Social-Posts, Verzeichnis-Anreicherung, Scraper-Helfer (Events/Regelungen/Projekte), Kommentar-Antworten, Ideen-Planer mit Websuche, Voice-Wächter (Umschreiben) | Next.js-App (`lib/…`, `app/api/…`) | auf `callAI` / OpenAI umgestellt |
| Python-Scraper (`tools/scraper/scrape.py`) | lokal / CI | KI-Fallback auf OpenAI (`OPENAI_API_KEY`) |
| **Noch auf Claude** | Concierge, Mail-Assistent, Gesundheits-Check | kommt mit der **zweiten Lieferung** |

**`gpt-5.5` ist im Code gesperrt** (Auftrag: „auf keinen Fall, für nix“). Auch wenn jemand `OPENAI_MODEL_LUNA=gpt-5.5` setzt, wird es ignoriert und `gpt-6-luna` benutzt; der Client sendet die Anfrage nicht einmal ab. **Sol** (`gpt-6.1-sol`) ist standardmäßig aus (`AI_SOL_ENABLED`).

## 2. Reihenfolge beim Einspielen (wichtig)

1. **Supabase → Edge Functions → Secrets:** `OPENAI_API_KEY` eintragen (Pflicht). Den Schlüssel trägst du selbst ein; er gehört nie in einen Chat.
2. **Supabase → SQL Editor:** `supabase/migrations/20261010090000_generation_logs_meta.sql` ausführen (legt die Spalte `meta` in `generation_logs` an; ohne sie läuft die Funktion auch, nur ohne Protokoll-Details).
3. **Supabase → Edge Functions:** drei Funktionen ersetzen. Jeweils den **kompletten Inhalt** der Datei einfügen und deployen:
   - `process-scraped-article` ← `supabase/functions/process-scraped-article/index.ts` (große Datei, ca. 555 KB, in einem Stück einfügen)
   - `ai-editorial` ← `supabase/functions/ai-editorial/index.ts` (ca. 465 KB)
   - `search-cover-photos` ← `supabase/functions/search-cover-photos/index.ts`
4. **Vercel → Environment Variables:** `OPENAI_API_KEY` (Production) eintragen. `CLAUDE_API_KEY` bleibt noch stehen, bis die zweite Lieferung eingespielt ist (Concierge, Mail).
5. **ZIP in GitHub hochladen** (Vercel baut danach automatisch).
6. **Prüfen:** Admin → AI → **„Run AI health check“**. Grün heißt: OpenAI antwortet im strikten und im einfachen JSON-Modus, Budget ist frei.
7. **Einen Artikel von Hand erzeugen** (Admin → AI → Warteschlange → *Generate*). Dauer: zwei bis drei Minuten. Danach unter Admin → Startseite die Zeile „AI spend · today“ ansehen: das sind die echten Kosten für einen Artikel.
8. **Erst dann** den automatischen Prozessor an lassen (Admin → AI → „AI processor“) und, wenn gewünscht, den Voice-Wächter einschalten (`supabase/data/voice_engine_on_v2_20261008.sql`, 40 Fassungen pro Tag am Anfang).

Reihenfolge nicht umdrehen: Die neue Vercel-Route weckt die **neue** Edge-Funktion.

## 3. Welches Modell mit welchem Denkaufwand („Effort“)

Alles läuft auf Luna. Eine schwerere Aufgabe denkt länger, sie wechselt nicht zu einem teureren Modell.

| Aufgabe | Aufwand |
|---|---|
| Quelle in den Faktenkern lesen | high |
| Artikel schreiben (je Sprache) und Faktencheck | Routine **medium** · komplex **high** · anspruchsvoll **xhigh** · investigativ **max** |
| Redaktion, Reparatur nach Faktencheck | medium (anspruchsvoll: high) |
| Voice-Wächter, Umschreiben | 1. Versuch high, 2. xhigh, ab 3. max |
| Übersetzung, Extraktion, kurze Texte, Einstufung, Mail-Entwurf | medium (bei komplexen Texten high) |
| Ideen-Planer mit Websuche | high |
| Concierge-Chat und Helfer (zweite Lieferung) | low (der Gast wartet) |

**Die Laufzeit begrenzt den Aufwand — das ist ehrlich zu sagen.** Ein Aufruf mit hohem Aufwand dauert Minuten. Deshalb senkt `effortForBudget` den Aufwand automatisch auf das, was die Zeit hergibt:

- **Vercel-Routen (Hobby, 60 s):** praktisch höchstens **medium**. Steuerbar mit `AI_APP_BUDGET_MS` (Standard 48000); mehr Zeit gibt es nur mit Vercel Pro.
- **Redaktionsstudio:** 48 s Fenster (`EDITORIAL_DEADLINE_MS`), weil die Vercel-Route nach 55 s aufgibt: medium.
- **Artikel-Edge-Funktion:** 180 s weiches Limit (`EDGE_SOFT_LIMIT_MS`). Das Schreiben bekommt die Zeit **minus 45 s Reserve** für Redaktion und Faktencheck; ein langes Nachdenken darf die Prüfzeit nie aufbrauchen (ein ungeprüfter Artikel wird nicht veröffentlicht). Praktisch heißt das: `high` ist normal, `xhigh`/`max` nur, wenn das Limit deutlich höher gesetzt wird.

Wer „Max/Extra“ für anspruchsvolle Stücke wirklich will, braucht entweder Vercel Pro (bis 300 s) oder ein höheres `EDGE_SOFT_LIMIT_MS` (nur sinnvoll, wenn dein Supabase-Plan so lange Laufzeiten erlaubt; die alte Funktion hielt sich unter 200 s). Nach den ersten echten Läufen sieht man in `ai_spend_log.meta` (`effort`, `reasoning`) und in `generation_logs.meta` (`ms`), was tatsächlich gelaufen ist.

## 4. Kosten

Preise Luna (pro 1 Mio. Token): Eingabe 0,10 USD · gecachte Eingabe 0,01 USD · Ausgabe 0,50 USD (Denk-Token zählen als Ausgabe). `ai_spend_log` schreibt jeden Aufruf mit **25 % Aufschlag** (`COST_MARKUP_PCT`); die App-Limits zählen diese Werte und greifen deshalb etwas früher als das Limit bei OpenAI (gewollt).

Schätzung für **einen Artikel in 7 Sprachen** (ca. 16 bis 25 Aufrufe): grob **5 bis 15 Cent**, mit Aufschlag etwas mehr. **Das ist eine Rechnung, keine Messung** — ich hatte keinen Schlüssel und konnte nie live testen. Der echte Wert steht nach dem ersten Artikel auf der Admin-Startseite.

Limits (Standard): **6 USD pro Tag, 60 USD pro Monat** (`AI_DAILY_BUDGET_USD`, `AI_MONTHLY_BUDGET_USD`; 0 = kein Limit). Bei vielen Artikeln pro Tag ist das Monatslimit schnell erreicht. Stellschrauben, von der wirksamsten:

1. `AI_MAX_EFFORT=medium` (Obergrenze für alle Aufgaben, spart am meisten),
2. `MAX_EDIT_PASSES=1` (eine Redaktionsrunde weniger pro Sprache),
3. `AI_FLEX_EDGE=on` (halber Preis, aber langsamer und manchmal nicht verfügbar; Voreinstellung aus),
4. den Takt von `cl-process` verlängern.

**Notbremse:** `AI_KILL_SWITCH=1` (Vercel und/oder Supabase) stoppt jeden Aufruf sofort.

## 5. Was mit einem Artikel passiert (Qualität)

1. **Faktenkern:** die Quelle wird nach bestätigten Fakten, Behauptungen, Vorwürfen, Zitaten, Zahlen und Daten sortiert. Die Schreibmodelle sehen **nur den Kern**, nie den Quelltext.
2. **Zypern-Tor:** kommt die Insel in der Geschichte nicht vor, wird der Artikel übersprungen.
3. **Sieben eigenständige Fassungen** (EN · EL · RO · AR · DE · PL · RU), jede direkt in der Sprache geschrieben, jede mit anderem Einstieg (Rotation nach Artikel und Sprache).
4. **Originalität:** nicht mehr als 12 % gleiche 5-Wort-Folgen mit der Quelle; sonst Umschreiben.
5. **Redaktion nach Messwerten:** die Voice-Engine misst den Text (Satzrhythmus, Absatzanfänge, Sprechverben, Substantivstil, Datum/„Ich“/unscharfe Mengen im Einstieg, Floskeln je Sprache, Quellennennung, eigene Kontaktangaben, …). Die Befunde gehen als **konkrete Arbeitsliste** an den Redakteur. Eine Überarbeitung wird nur übernommen, wenn der Wert besser wird **und** keine Zahl/kein Zitat verändert wurde. Der Schreib-Prompt enthält nur Absichten, keine Quoten.
6. **Kurze Felder** (Titel, Excerpt, Zusammenfassung, SEO-Titel/-Beschreibung) werden mit denselben Maßstäben geprüft, inklusive „erfundene Zahl“.
7. **Faktencheck je Sprache** gegen den Kern, danach Reparatur und erneute Prüfung.
8. **Veröffentlichungs-Tor:** automatisch veröffentlicht wird nur, wenn **alle sieben** Fassungen bestehen. Sonst wird der Artikel als **Entwurf mit Begründung** gespeichert (Admin → Artikel).

Keine Tricks gegen KI-Erkennung (keine unsichtbaren Zeichen, keine absichtlichen Fehler, keine Paraphrasen-Ketten), und **keine Garantie**, dass ein externer Detektor einen Text als „menschlich“ einstuft. Gemessen wird, ob der Text sauber, konkret und redaktionell ist.

Im **Redaktionsstudio** gilt zusätzlich: Jedes wörtliche Zitat muss **Wort für Wort im Transkript** stehen, Zahlen müssen im Material vorkommen, das Zugstück (Pull-Quote) muss ein echter Satz der Person sein. Was die Funktion nicht klären konnte, steht oben als Hinweis („Please check before saving“).

## 6. Rückfall

- **Sofort stoppen:** `AI_KILL_SWITCH=1`, oder in Admin → AI den „AI processor“ ausschalten.
- **Alte Version:** die Dateien des Stands vor dieser Lieferung liegen in GitHub (Commit `d5c8577` und älter). Zurück heißt: alten Stand hochladen und die alte Edge-Funktion wieder einfügen. Dazu müssen `CLAUDE_API_KEY` und `SONNET_MODEL` in Supabase stehen bleiben (sie werden nicht gelöscht).
- Bricht das System einen Lauf ab (Zeitlimit), blieb der Artikel früher für immer auf „rewriting“ stehen. Jetzt gibt die Edge-Funktion eine Reservierung, die älter als 20 Minuten ist, beim nächsten Lauf frei: das erste Mal zurück in die Warteschlange, das zweite Mal als „failed“ (dann von Hand öffnen und neu starten), damit ein Artikel, der immer zu lange braucht, nicht bei jedem Takt Geld kostet.

## 7. Umgebungsvariablen

**Supabase (Edge-Funktionen)** — Pflicht: `OPENAI_API_KEY`. Optional: `UNSPLASH_ACCESS_KEY` (Cover), `AI_DAILY_BUDGET_USD` (6), `AI_MONTHLY_BUDGET_USD` (60), `AI_KILL_SWITCH`, `AI_MAX_EFFORT` (max), `AI_EFFORT_<AUFGABE>` (z. B. `AI_EFFORT_WRITE=medium`), `AI_SOL_ENABLED`, `OPENAI_MODEL_LUNA`, `EDGE_SOFT_LIMIT_MS` (180000), `EDITORIAL_DEADLINE_MS` (48000), `OVERLAP_MAX` (0.12), `MAX_EDIT_PASSES` (2), `RELEVANCE_GATE` (on), `COST_MARKUP_PCT` (25), `AI_FLEX_EDGE` (off), `SITE_URL` + `REVALIDATE_SECRET` (Seite sofort neu rendern nach Veröffentlichung).

**Vercel** — Pflicht: `OPENAI_API_KEY`. Optional wie oben, dazu `AI_APP_BUDGET_MS` (48000) und `AI_FLEX` (off = kein Flex für Hintergrundjobs). Vollständige Liste mit Erklärungen: `.env.example`.

## 8. Durchsatz

Der Prozessor nimmt **einen Artikel pro Lauf** (ein zweiter beginnt nur, wenn der erste früh fertig war). Bei 15 Minuten Takt sind das bis zu vier Artikel pro Stunde. Schneller geht durch einen kürzeren Takt (zum Beispiel alle 5 Minuten); jeder Artikel wird vor der Bearbeitung exklusiv reserviert, zwei Läufe nehmen also nie denselben.

## 9. Offen / nicht live geprüft

- **Keine einzige Anfrage ging an OpenAI.** Alles ist mit einem geskripteten Modell getestet (Tests laufen ohne Schlüssel). Wie lange Luna in der Praxis denkt, wie viele Denk-Token sie braucht und was ein Artikel wirklich kostet, zeigen erst die ersten Läufe (`ai_spend_log.meta`, `generation_logs.meta`).
- **Websuche des Ideen-Planers:** der Preis pro Suchaufruf ist mit 0,01 USD angesetzt und nicht bestätigt (`OPENAI_PRICES_JSON` überschreibt Preise).
- **Sprachqualität:** die Messwerte sind ein Hilfsmittel, kein Ersatz für Muttersprachler. Für RO, PL, EL, AR und RU lohnt eine Stichprobe durch Muttersprachler.
- **KI-Kennzeichnung (EU-KI-Verordnung, Art. 50):** nach meinem Kenntnisstand müssen KI-erzeugte Texte, die die Öffentlichkeit über Themen von öffentlichem Interesse informieren, als solche gekennzeichnet werden, **außer** sie werden redaktionell geprüft und eine Person trägt die redaktionelle Verantwortung. Die Artikel erscheinen unter den Namen der Autorenliste (`AUTHOR_NAME` in der Edge-Funktion, Autorenseiten `/author/…`) und werden bei eingeschalteter Auto-Veröffentlichung ohne menschliche Freigabe veröffentlicht. Wenn diese Namen keine realen Personen sind, die die Texte verantworten, kommt ein zweites Problem dazu (Irreführung der Leser). Das ist eine **Entscheidung für dich** (Kennzeichnung oder tatsächliche redaktionelle Freigabe), am besten mit juristischer Beratung; ich habe daran nichts geändert.
- **Zweite Lieferung:** Concierge, Mail-Assistent, Gesundheits-Check, Datenschutztexte in 7 Sprachen, Entfernen der Claude-Reste.

## 10. Dateien, die nicht mehr gebraucht werden

Ein ZIP kann Dateien überschreiben, aber nicht löschen. Deshalb sind die alten Dateien durch leere Hüllen ersetzt. Du kannst sie in GitHub löschen (Datei öffnen → Papierkorb-Symbol), musst aber nicht; nichts im Code ruft sie noch auf.

| Datei | Zustand |
|---|---|
| `lib/desk/pipeline.ts` | leere Hülle (der alte Desk: englischer Entwurf, in sechs Sprachen übersetzt, ohne Faktencheck) |
| `lib/desk/queue.ts` | leere Hülle (die Warteschlange liegt jetzt in der Edge-Funktion) |
| `lib/desk/prompts.ts`, `lib/desk/cover.ts` | werden von nichts mehr importiert |

## 11. Wo was steht

- Quellcode der beiden Edge-Funktionen: `scripts/edge/*.src.ts`. Die Dateien in `supabase/functions/…/index.ts` sind **erzeugt** (`node scripts/build-edge-journalism.mjs`); ein Test schlägt fehl, wenn sie nicht zum Quellcode passen. Nie von Hand ändern.
- Modelle, Aufwand, Preise: `lib/journalism/models.ts`. OpenAI-Client: `lib/journalism/openai.ts`. Ablauf eines Artikels: `lib/journalism/pipeline.ts`. Schreib-Prompts: `lib/journalism/prompts.ts`.
- Messung der Sprache: `lib/voice/*` (siehe `docs/VOICE-ENGINE.md`).
- Tests: `node scripts/tests/run.mjs` (alles, rund 40 Sekunden, ohne Schlüssel und ohne Kosten).
