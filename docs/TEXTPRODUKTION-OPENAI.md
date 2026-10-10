# Textproduktion auf OpenAI (gpt-6-luna) — Übergabe

Stand: Oktober 2026, nach der **zweiten Lieferung**. Diese Datei beschreibt, was sich geändert hat, in welcher Reihenfolge es eingespielt wird, was es kostet, wie man es abschaltet und was **noch nicht live geprüft** werden konnte. Die Artikel-Seite (Redaktion, Studio, Übersetzung und so weiter) steht in den Abschnitten 1 bis 2b; die Concierge-Seite (Concierge, Mail-Assistent, Aufräumen, Datenschutztexte) in Abschnitt 2c. Beides liegt in **einem** ZIP.

## 1. Was sich geändert hat

Alles, was Text schreibt oder versteht, läuft jetzt über **OpenAI, Modell `gpt-6-luna`**. Im Code gibt es keinen Aufruf an Claude oder Gemini mehr (ein Test prüft das bei jedem Bauen).

| Bereich | Wo | Zustand |
|---|---|---|
| Artikel-Redaktion (Scraper-Artikel → 7 Sprachen) | Edge-Funktion `process-scraped-article` | **neu gebaut** (Faktenkern → 7 eigenständige Fassungen → Redaktion → Faktencheck → Veröffentlichungs-Tor); die Qualitätsprüfung holt sie bei der Website ab (`/api/desk/assess`) |
| Redaktionsstudio (Interview-Fragen, Interview-Artikel, Rezension) | Edge-Funktion `ai-editorial` | **neu gebaut**, mit Zitat- und Zahlenprüfung |
| Cover-Foto-Brief | Edge-Funktion `search-cover-photos` | von Gemini auf OpenAI umgestellt |
| Übersetzung, Transcreation, Korrektorat, Social-Posts, Verzeichnis-Anreicherung, Scraper-Helfer (Events/Regelungen/Projekte), Kommentar-Antworten, Ideen-Planer mit Websuche, Voice-Wächter (Umschreiben) | Next.js-App (`lib/…`, `app/api/…`) | auf `callAI` / OpenAI umgestellt |
| Python-Scraper (`tools/scraper/scrape.py`) | lokal / CI | KI-Fallback auf OpenAI (`OPENAI_API_KEY`) |
| **Concierge** (Chat auf der Website, „Ask the island“-Box, WhatsApp, Telegram) | `lib/concierge/…`, `app/api/concierge/…` | **zweite Lieferung:** der Chat zeigt die Antwort, **während sie geschrieben wird** (Streaming, Satz für Satz); Gedächtnis, Begrüßung, Suchverständnis, Umsortierung und die Qualitätsauswertung laufen mit demselben Modell |
| **Mail-Assistent** (Entwurf bei Eingang und per Knopf) | `lib/mail/assist.ts` | **zweite Lieferung:** Luna „medium“; ein zweiter Versuch mit weniger Denkaufwand, wenn der erste scheitert |
| Verzeichnis-Einstufung (Kategorien) | `app/api/concierge/normalize-directory` | **zweite Lieferung** |
| Gesundheits-Prüfungen | `/api/health`, `/api/concierge/selftest`, Admin → AI | **zweite Lieferung:** prüfen den OpenAI-Schlüssel; der Selbsttest misst die Zeit bis zum ersten Wort des Modells (der Gast sieht jeden Satz, sobald er fertig ist) |
| Datenschutzerklärung (7 Sprachen), Register der Verarbeitungstätigkeiten | `lib/legal/docs/privacy.*.ts`, `messages/*.json`, Migration `20261011090000_…` | **zweite Lieferung:** OpenAI statt Anthropic und Google (KI) |

**`gpt-5.5` ist im Code gesperrt** (Auftrag: „auf keinen Fall, für nix“). Auch wenn jemand `OPENAI_MODEL_LUNA=gpt-5.5` setzt, wird es ignoriert und `gpt-6-luna` benutzt; der Client sendet die Anfrage nicht einmal ab. **Sol** (`gpt-6.1-sol`) ist standardmäßig aus (`AI_SOL_ENABLED`).

## 2. Reihenfolge beim Einspielen (wichtig)

Es gibt **ein** ZIP. Es enthält alles, was auf GitHub noch fehlt: die erste Lieferung in ihrer verbesserten Fassung (Qualitätsprüfung auf der Website, Abschnitt 2a) und die zweite (Concierge, Mail-Assistent, Aufräumen, Datenschutztexte, Abschnitt 2c). Die Artikel-Funktion in Supabase lässt ihre Qualitätsprüfung von der Website machen. Deshalb zuerst die Website, dann die Funktion.

1. **ZIP in GitHub hochladen** (Vercel baut danach automatisch). GitHub nimmt pro Hochladen höchstens 100 Dateien an: das ZIP hat 78, also reicht ein Durchgang. Die versteckte Datei `.env.example` (nur Dokumentation, nichts läuft damit) nehmen Browser beim Ordner-Hochladen oft nicht mit; sie fehlt auch schon nach der ersten Lieferung. Wer sie auf GitHub haben möchte, lädt sie einzeln hoch; für den Betrieb ist sie unnötig.
2. **Supabase → Edge Functions → Secrets** prüfen, mit diesen vier Namen (fehlende trägst du selbst ein; Schlüssel gehören nie in einen Chat):
   - `OPENAI_API_KEY`: Pflicht. Steht er schon (die alte Artikel-Funktion hat ihn gelesen), nichts tun.
   - `SITE_URL`: die Adresse der Website, `https://cypruslifestyle.eu`. **Ohne ihn zeigt der Health-Check „style check: FAIL (not configured: SITE_URL is not set)“ und „site_url=NO“**, und die Artikel bleiben in der Warteschlange.
   - `ENRICH_SECRET`: **derselbe Wert wie in Vercel.** Die Edge-Funktionen `enrich-directory` und `events-ingest` lesen ihn schon, er steht also vermutlich da.
   - `UNSPLASH_ACCESS_KEY`: optional (Cover-Bilder).
3. **Supabase → SQL Editor:** die Datei `SQL-fuer-Supabase.sql` (liegt neben dem ZIP) enthält beide Teile: ganz einfügen, einmal „Run“. Sie darf wiederholt werden. Es sind dieselben Inhalte wie diese zwei Dateien im ZIP:
   - `supabase/migrations/20261010090000_generation_logs_meta.sql` (legt die Spalte `meta` in `generation_logs` an; ohne sie läuft die Funktion auch, nur ohne Protokoll-Details). Lief sie schon, passiert nichts.
   - `supabase/migrations/20261011090000_privacy_register_openai.sql` (trägt OpenAI statt Anthropic im Register der Verarbeitungstätigkeiten ein; ändert nur zwei Zeilen, löscht nichts).
4. **Supabase → Edge Functions:** Jeweils den **kompletten Inhalt** der Datei einfügen und deployen:
   - `process-scraped-article` ← `supabase/functions/process-scraped-article/index.ts` (ca. 218 KB). **Pflicht**: diese Fassung trägt die Qualitätsprüfung nicht mehr selbst, sondern holt sie bei der Website ab (sonst riskierst du das Rechenzeit-Limit von 2 Sekunden), und sie enthält die Korrektur für den reinen JSON-Modus (Abschnitt 2d).
   - `search-cover-photos` ← `supabase/functions/search-cover-photos/index.ts`. **Pflicht** wegen derselben Korrektur (ohne sie fiel der Cover-Brief still auf die Ersatzlösung zurück).
   - `ai-editorial` ← `supabase/functions/ai-editorial/index.ts` (ca. 465 KB): nur zur Ordnung; die laufende Fassung arbeitet richtig (sie ruft den reinen JSON-Modus nie ohne das Wort JSON auf).
5. **Vercel → Environment Variables:** `OPENAI_API_KEY` muss auch dort stehen, weil Übersetzung, Social, Verzeichnis, Scraper-Helfer, Korrektorat, Planer, Concierge und Mail-Assistent in der Website laufen (Vercel sieht die Supabase-Geheimnisse nicht und umgekehrt). Steht er schon (die Concierge-Suche liest ihn dort), musst du nichts tun: `https://cypruslifestyle.eu/api/health` zeigt bei „Semantic search & embeddings“ `ready: true`. `ENRICH_SECRET` steht dort ebenfalls (die Wartungs-Routen brauchen ihn). Die alten Claude-Schlüssel lässt du **stehen**, bis Punkt 9 erledigt ist.
6. **Prüfen:** Admin → AI → **„Run AI health check“**. Grün heißt: OpenAI antwortet im strikten und im einfachen JSON-Modus, die Qualitätsprüfung auf der Website antwortet („style check: ok“), der **Concierge-Chat antwortet** („concierge chat: ok“, mit der Zeit bis zum ersten Wort), das Budget ist frei. Rot nennt den Grund (zum Beispiel „ENRICH_SECRET differs between Supabase and the website“, „the website has not been updated yet“ oder „billing: …“).
7. **Einen Artikel von Hand erzeugen** (Admin → AI → Warteschlange → *Generate*). Dauer: zwei bis drei Minuten, die Seite wartet geduldig (Abschnitt 2b). Danach unter Admin → Startseite die Zeile „AI spend · today“ ansehen: das sind die echten Kosten für einen Artikel.
8. **Erst dann** den automatischen Prozessor an lassen (Admin → AI → „AI processor“) und, wenn gewünscht, den Voice-Wächter einschalten (`supabase/data/voice_engine_on_v2_20261008.sql`, 40 Fassungen pro Tag am Anfang).
9. **Aufräumen, erst nach grünem Test und ein paar ruhigen Tagen:** siehe Abschnitt 2c, Punkt 3.

Ist die Website noch nicht aktualisiert oder nicht erreichbar, passiert nichts Schlimmes: Die Artikel-Funktion prüft das **vor** dem ersten Modell-Aufruf, lässt den Artikel in der Warteschlange und kostet nichts.

### 2a. Warum die Qualitätsprüfung auf der Website läuft

Supabase erlaubt einer Edge-Funktion nur **2 Sekunden reine Rechenzeit pro Aufruf** (Warten auf das Modell zählt nicht; die Laufzeit ist mit 150 s im Free-Plan und 400 s in den Bezahlplänen großzügig). Die Prüf-Engine (die Erkennungsmuster in sieben Sprachen) braucht für **einen** Artikel etwa 1,9 Sekunden, weil sie bei der ersten Benutzung je Sprache ihre Muster übersetzt. Das hätte Läufe mittendrin abbrechen können (gemessen, nicht auf Supabase live getestet). Darum trägt die Artikel-Funktion die Engine nicht mehr: Sie schickt jede Fassung an `/api/desk/assess`, die Website urteilt mit **derselben** Engine (Vercel hat keine Rechenzeit-Grenze; mit Fluid Compute sind bis zu 300 s Laufzeit möglich), und die Funktion braucht selbst nur etwa eine Viertelsekunde Rechenzeit. Sie ist dadurch auch um 60 % kleiner (217 statt 556 KB).

### 2b. Die „Generate“-Taste und die 150 Sekunden

Das Gateway von Supabase bricht eine Anfrage, die 150 Sekunden lang kein Byte bekommt, mit einem Fehler 504 ab, auch wenn die Arbeit weiterläuft. Die Funktion antwortet deshalb sofort und schickt alle 15 Sekunden ein Leerzeichen, bis das Ergebnis da ist; die Admin-Seite liest das Ergebnis wie bisher. Ein erfolgreicher Lauf wird so nicht mehr als Fehler angezeigt.

## 2c. Was die zweite Lieferung zusätzlich enthält (Concierge, Mail, Aufräumen, Datenschutz)

Das steht im selben ZIP und braucht, über Abschnitt 2 hinaus, nur diese Punkte:

1. **Prüfen:** (a) Admin → AI → „Run AI health check“: die Zeile „concierge chat“ muss „ok“ zeigen. (b) Auf der Website dem Concierge etwas fragen; die Antwort erscheint satzweise. (c) Admin → Mail → bei einer Nachricht „✦ Draft with AI“ drücken. (d) `https://cypruslifestyle.eu/api/health` zeigt beim Concierge `ready: true`. (e) Wer mehr Einzelheiten will: `https://cypruslifestyle.eu/api/concierge/selftest` im Browser öffnen, solange du im Admin angemeldet bist (zeigt unter anderem `first_word_ms`). Rot nennt immer den Grund (Schlüssel, Guthaben, Budget, Modellname, Zeitüberschreitung).
2. **Datenschutz:** Die Datenschutzerklärung nennt jetzt OpenAI als einzigen KI-Dienstleister (in allen sieben Sprachen), und „zuletzt geändert“ steht auf dem 9. Oktober 2026. Ich bin kein Rechtsanwalt: lass die neuen Absätze 4 und 6 von deiner Rechtsberatung gegenlesen, bevor du dich darauf verlässt.
3. **Aufräumen, erst nach grünem Test:** in **Vercel** die Variablen `CLAUDE_API_KEY`, `SONNET_MODEL`, `CLAUDE_HAIKU` und `GEMINI_API_KEY` löschen; in **Supabase → Edge Functions → Secrets** dasselbe (`CLAUDE_API_KEY`, `SONNET_MODEL`, `GEMINI_API_KEY`). In Supabase die **Edge-Funktion `concierge` löschen** (wird von nichts mehr aufgerufen; im Code ist sie eine leere Hülle). Bis dahin kannst du jederzeit zum alten Stand zurück (Abschnitt 6).

**Was der Concierge-Chat jetzt macht:** Er schickt die Frage mit dem bisherigen Gespräch (als echte Nachrichten, nicht als Textblock) und mit den gefundenen Betrieben, Ratgebern und Quellen an `gpt-6-luna` und zeigt die Antwort an, während sie geschrieben wird. Jedes Stück Text läuft vor der Anzeige durch die Link-Regeln (keine fremden Seiten genannt oder verlinkt). Scheitert der Strom, bevor das erste Wort da ist, wird erneut versucht; danach folgt **eine** Antwort in einem Stück, wenn die Zeit der Route (55 s) es noch erlaubt. Der Gast sieht nur „es hat nicht geklappt“; der Grund steht im Server-Protokoll (Vercel → Logs, Stichwort `[concierge]`). Ein abgelehnter Schlüssel, fehlendes Guthaben oder das Budget-Limit führen **nicht** zu einem zweiten Versuch (er würde gleich scheitern).

**Was sich für dich sonst ändert:**

- **Kosten des Chats stehen jetzt im Ausgabenprotokoll** (`ai_spend_log`, Stichwort `concierge-chat`) und zählen ins Tageslimit von 6 USD. Vorher war der Chat dort nicht erfasst. Rechnung (keine Messung): ein Gesprächsschritt mit rund 6.000 Eingabe-Token und rund 900 Ausgabe-Token (inklusive Denken auf „low“) kostet etwa **0,1 Cent**, mit Aufschlag 0,13 Cent. Die öffentliche Obergrenze von 6.000 Chat-Anfragen pro Tag (`AI_PUBLIC_DAILY_CALLS`) wären also höchstens rund 8 USD; wer früher bremsen will, setzt dort einen kleineren Wert.
- **Tempo des Chats einstellen:** `AI_EFFORT_CHAT` (Vercel). Voreinstellung `low`. Wirkt die erste Antwort zu langsam (`first_word_ms` im Selbsttest), `minimal` setzen; das ist schneller und etwas weniger gründlich.
- **Mail bei Eingang:** der Entwurf bekommt höchstens 40 Sekunden (danach folgen noch Kunden-Verknüpfung und Buchungszuordnung in derselben 60-Sekunden-Funktion). Schafft er es nicht, steht in den Vercel-Logs `[mail-assist] draft-on-arrival failed`, und der Knopf „✦ Draft with AI“ im Admin erzeugt ihn von Hand (dann mit dem vollen Zeitfenster).
- **Alte Doku:** die Setup-Dateien im Hauptverzeichnis (`CONCIERGE-FIX.md`, `FIX-MOBILE-CONCIERGE.md`, `DEPLOY-increment-3*.md` und weitere) tragen oben einen Hinweis, dass ihre Angaben zu Claude veraltet sind; `RUNBOOK.md`, `DR-RUNBOOK.md`, `MEMBERS-SETUP.md` und die `PHASE-…`-Anleitungen sind korrigiert.

## 2d. Der reine JSON-Modus und das Wort „JSON“ (Fehler aus dem ersten echten Health-Check, behoben)

OpenAI lehnt den reinen JSON-Modus mit einem Fehler 400 ab, wenn das Wort „JSON“ nicht in der **Nachricht** steht („Response input messages must contain the word 'json'…“); in den Anweisungen allein zählt es nicht. Mein Testersatz für OpenAI kannte diese Regel nicht, deshalb fiel es erst beim echten Aufruf auf (Health-Check: „plain JSON mode: FAIL“). Betroffen waren alle Aufrufe im reinen JSON-Modus, deren Nachricht das Wort nicht enthielt: der Test selbst, die Übersetzung, die Scraper-Helfer, die Concierge-Helfer, die Auswertung, der Cover-Brief und der Python-Scraper. Der gemeinsame Client hängt jetzt bei Bedarf einen Satz an die letzte Nachricht an („Respond with a single JSON object…“); die zwei Aufrufer außerhalb des Clients (Cover-Brief, Python-Scraper) nennen das Wort selbst. Der Testersatz lehnt seither alles ab, was das echte OpenAI ablehnen würde (JSON-Wort, Regeln für strikte Schemas), und ein Test prüft alle unsere Schemas gegen diese Regeln.

## 2e. Der erste echte Artikel-Lauf (9.10.2026) und was Lieferung 3 daran geändert hat

Drei Artikel liefen durch die neue Pipeline (Technopolis Jazz Festival, Alkoholkonsum Zypern/EU, Vogelgrippe Athalassa): 94 bis 178 Sekunden, rund 0,04 bis 0,08 US-$ je Artikel, alle als Entwurf gehalten (automatisches Veröffentlichen ist aus; das Tor nannte die Gründe im Protokoll). Was das Protokoll (`generation_logs.meta`) zeigte und was daraus wurde:

1. **Der Deckel von 100 versteckte Fortschritt.** Bei Griechisch und Russisch des Alkohol-Artikels lief die Redaktion, nahm aber keinen Durchgang an (`passes.edit` = 0, der Wert blieb 100). Im Test lässt sich genau das nachstellen: eine Fassung mit acht schweren Befunden, die der Redaktor auf vier kürzt, zeigt weiter 100, und die Regel „Wert niedriger“ warf sie weg. Polnisch nahm zwei Durchgänge an und stand trotzdem am Ende bei 100; dort hat vermutlich die Fakten-Reparatur danach das „Według danych …“ wieder eingebracht (nicht belegt). Neu: `lib/journalism/progress.ts` (`isImprovement`): zählt der Wert und, bei gleichem Wert, das **Gewicht der Befunde** (ohne Deckel). Dieselbe Regel gilt in der Redaktion der Pipeline, in Clean, im Hintergrund-Worker und bei Rewrite. Gleich ist nicht besser.
2. **Der Faktenkern hatte 1 bestätigten Fakt** (Typ „brief“), weil alle Eurostat-Zahlen als „attributed_claims“ einsortiert wurden. Die Schreiber sollen laut Prompt „sagen, wer es behauptet“, also schrieben EL/PL/RU in jedem Absatz „Σύμφωνα με στοιχεία της Eurostat“ (×8). Neu: amtlich veröffentlichte Zahlen (Statistikamt, Register, Gericht, Regulierer, Zentralbank) und der Inhalt von Beschlüssen/Gesetzen/Eingaben sind **bestätigte Fakten**; „attributed_claims“ sind nur, was jemand sagt, glaubt, verspricht, vorhersagt oder schätzt. Wer genannt wird, wird als Handelnder mit schlichtem Verb genannt (einmal), nie mit „laut …“. Gilt auch für die Fakten-Reparatur.
3. **Gleich lange Absätze** wurden erkannt, aber nicht repariert: das Modell bekam „CV 0.00“ und „teile, wo die Geschichte dreht“. Neu: der Befund trägt die **gemessenen Größen** (Wörter bzw. Sätze je Absatz, dazu das kürzeste Nachbarpaar), die Anweisung lautet „Nachbarn mit einem Gedanken zu EINEM volleren Absatz zusammenziehen; ein harter Fakt darf allein stehen; nie zusammenlegen oder teilen, nur um eine Größe zu erreichen“. Die Clean-Taste (Voice-Engine) bekommt dazu erstmals den Teil „HOW TO FIX“; die Schreib-Anweisung bremst kurze Absätze nicht mehr.
4. **Zeit.** Der Vogelgrippe-Artikel brauchte 178 s von 180 s (weiches Limit `EDGE_SOFT_LIMIT_MS`). Wo die Zeit knapp wird, entfallen Redaktion, Fakten-Reparatur oder zweiter Faktencheck einzelner Sprachen. Empfehlung bei Supabase Pro (400 s Laufzeit): `EDGE_SOFT_LIMIT_MS=300000` setzen (Secret, kein Deploy).
5. **Rewrite** kannte die Hausregel „keine Quellen“ nicht (übernahm „laut …“ aus der Quellfassung) und speicherte bei 100 Punkten jede Neufassung. Neu: Hausregel im Prompt; gespeichert wird nur bei echter Verbesserung (oder wenn eine viel zu kurze/lange Fassung wieder auf Linie kommt).

Ob das im echten Lauf reicht, zeigt erst der nächste Lauf: In `generation_logs.meta` sollten `passes.<sprache>.edit` bei vorher auf 100 stehenden Fassungen über 0 liegen und `style` je Sprache sinken; die Tor-Gründe stehen in `error_msg`.

## 3. Welches Modell mit welchem Denkaufwand („Effort“)

Alles läuft auf Luna. Eine schwerere Aufgabe denkt länger, sie wechselt nicht zu einem teureren Modell.

| Aufgabe | Aufwand |
|---|---|
| Quelle in den Faktenkern lesen | high |
| Artikel schreiben (je Sprache) und Faktencheck | Routine **medium** · komplex **high** · anspruchsvoll **xhigh** · investigativ **max** |
| Redaktion, Reparatur nach Faktencheck | medium (anspruchsvoll: high) |
| Voice-Wächter, Umschreiben | 1. Versuch high, 2. xhigh, ab 3. max |
| Übersetzung, Extraktion, kurze Texte, Einstufung (auch Verzeichnis), Mail-Entwurf | medium (bei komplexen Texten high) |
| Ideen-Planer mit Websuche | high |
| Concierge-Chat (gestreamt) und Helfer (Suchverständnis, Umsortierung, Gedächtnis, Begrüßung) | low (der Gast wartet) |
| Qualitätsurteil der Concierge-Auswertung (Admin, nur auf Knopfdruck) | medium |

**Die Laufzeit begrenzt den Aufwand — das ist ehrlich zu sagen.** Ein Aufruf mit hohem Aufwand dauert Minuten. Deshalb senkt `effortForBudget` den Aufwand automatisch auf das, was die Zeit hergibt:

- **Vercel-Routen:** im Code stehen 60 s (`maxDuration`) und ein Zeitfenster von 48 s (`AI_APP_BUDGET_MS`), damit ist praktisch **medium** die Obergrenze. Das ist eine Voreinstellung, keine Grenze der Plattform: Auf deinem Hobby-Plan sind mit **Fluid Compute (bei dir an)** bis zu **300 s** erlaubt. Wer dort mehr Denkaufwand will (zum Beispiel für den Voice-Wächter und den Ideen-Planer), hebt `maxDuration` der betreffenden Routen und `AI_APP_BUDGET_MS` gemeinsam an; das ist nicht Teil dieser Lieferung.
- **Redaktionsstudio:** 48 s Fenster (`EDITORIAL_DEADLINE_MS`), weil die Vercel-Route nach 55 s aufgibt: medium.
- **Artikel-Edge-Funktion:** 180 s weiches Limit (`EDGE_SOFT_LIMIT_MS`; dein Supabase-Plan erlaubt 400 s, bei Free wären es nur 150 s). Das Schreiben bekommt die Zeit **minus 45 s Reserve** für Redaktion und Faktencheck; ein langes Nachdenken darf die Prüfzeit nie aufbrauchen (ein ungeprüfter Artikel wird nicht veröffentlicht). Praktisch heißt das: `high` ist normal, `xhigh`/`max` nur, wenn das Limit deutlich höher gesetzt wird.

Wer „Max/Extra“ für anspruchsvolle Stücke wirklich will, setzt in Supabase `EDGE_SOFT_LIMIT_MS=300000` (dein Bezahlplan erlaubt 400 s Laufzeit). Das Schreiben bekommt dann die Zeit minus 45 s Reserve, und `xhigh` (100 s nötig) und `max` (160 s) werden für anspruchsvolle und investigative Stücke möglich. Das kostet mehr Zeit und Geld pro Artikel; nur für diese Stücke lohnt es sich. Nach den ersten echten Läufen sieht man in `ai_spend_log.meta` (`effort`, `reasoning`) und in `generation_logs.meta` (`ms`), was tatsächlich gelaufen ist.

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
- **Alte Version:** der Stand vor diesem ZIP liegt in GitHub (Commit `7ab0813`; vor der ersten Lieferung: Commit `d5c8577`). Zurück heißt: alten Stand hochladen (und die alte Edge-Funktion wieder einfügen). Dazu müssen die alten Schlüssel (`CLAUDE_API_KEY`, `SONNET_MODEL`) noch stehen: **lösche sie deshalb erst nach grünem Test und ein paar Tagen Betrieb** (Abschnitt 2c, Punkt 3).
- Bricht das System einen Lauf ab (Zeitlimit), blieb der Artikel früher für immer auf „rewriting“ stehen. Jetzt gibt die Edge-Funktion eine Reservierung, die älter als 20 Minuten ist, beim nächsten Lauf frei: das erste Mal zurück in die Warteschlange, das zweite Mal als „failed“ (dann von Hand öffnen und neu starten), damit ein Artikel, der immer zu lange braucht, nicht bei jedem Takt Geld kostet.

## 7. Umgebungsvariablen

**Supabase (Edge-Funktionen)** — Pflicht: `OPENAI_API_KEY`, `SITE_URL`, `ENRICH_SECRET` (die letzten beiden für die Qualitätsprüfung auf der Website). Optional: `UNSPLASH_ACCESS_KEY` (Cover), `AI_DAILY_BUDGET_USD` (6), `AI_MONTHLY_BUDGET_USD` (60), `AI_KILL_SWITCH`, `AI_MAX_EFFORT` (max), `AI_EFFORT_<AUFGABE>` (z. B. `AI_EFFORT_WRITE=medium`), `AI_SOL_ENABLED`, `OPENAI_MODEL_LUNA`, `EDGE_SOFT_LIMIT_MS` (180000), `EDITORIAL_DEADLINE_MS` (48000), `OVERLAP_MAX` (0.12), `MAX_EDIT_PASSES` (2), `RELEVANCE_GATE` (on), `COST_MARKUP_PCT` (25), `AI_FLEX_EDGE` (off), `SITE_URL` + `REVALIDATE_SECRET` (Seite sofort neu rendern nach Veröffentlichung).

**Vercel** — Pflicht: `OPENAI_API_KEY` (jetzt auch für den Concierge und die Mail). Optional wie oben, dazu `AI_APP_BUDGET_MS` (48000), `AI_FLEX` (off = kein Flex für Hintergrundjobs), `AI_EFFORT_CHAT` / `AI_EFFORT_HELPER` / `AI_EFFORT_MAIL` (Denkaufwand von Chat, Helfern, Mail), `AI_PUBLIC_DAILY_CALLS` (6000 öffentliche Chat-Anfragen pro Tag), `CONCIERGE_LLM_UNDERSTAND=1` (Suchverständnis, aus) und `CONCIERGE_RERANK=1` (Umsortierung, aus). **Nicht mehr gebraucht:** `CLAUDE_API_KEY`, `SONNET_MODEL`, `CLAUDE_HAIKU`, `GEMINI_API_KEY`. Vollständige Liste mit Erklärungen: `.env.example`.

## 8. Durchsatz

Der Prozessor nimmt **einen Artikel pro Lauf** (ein zweiter beginnt nur, wenn der erste früh fertig war). Bei 15 Minuten Takt sind das bis zu vier Artikel pro Stunde. Schneller geht durch einen kürzeren Takt (zum Beispiel alle 5 Minuten); jeder Artikel wird vor der Bearbeitung exklusiv reserviert, zwei Läufe nehmen also nie denselben.

## 9. Offen / nicht live geprüft

- **Rechenzeit-Messung:** Die 1,9 Sekunden (und die 0,25 Sekunden der Funktion ohne Engine) sind in Node auf meiner Maschine gemessen. Auf Supabase kann der Wert anders ausfallen; der große Abstand zur Grenze von 2 Sekunden ist der Grund für die Auslagerung. Ob das Gateway die Leerzeichen der „Generate“-Antwort so durchreicht wie erwartet, habe ich nicht live geprüft (sonst zeigt die Admin-Seite im schlimmsten Fall wie früher einen Fehler 504, obwohl der Artikel fertig wird; er steht dann trotzdem in den Entwürfen).
- **Was live bestätigt ist (erster Health-Check, Oktober 2026):** der strikte Modus (Schema) antwortet in etwa einer Sekunde; der Concierge-Chat im Strom zeigt das erste Wort nach 1,0 s und ist nach 1,2 s fertig. Der reine JSON-Modus scheiterte (Ursache und Korrektur: Abschnitt 2d). **Noch nicht live geprüft:** ein ganzer Artikel (Faktenkern, sieben Fassungen, Redaktion, Faktencheck mit den echten, großen Schemas), die höheren Denkstufen, die Websuche und Flex. Der Rest ist mit einem geskripteten Modell getestet, das seit Abschnitt 2d dieselben Regeln durchsetzt wie das echte OpenAI; was ein Artikel wirklich kostet und wie lange Luna dabei denkt, zeigen erst die ersten Läufe (`ai_spend_log.meta`, `generation_logs.meta`).
- **Websuche des Ideen-Planers:** der Preis pro Suchaufruf ist mit 0,01 USD angesetzt und nicht bestätigt (`OPENAI_PRICES_JSON` überschreibt Preise).
- **Sprachqualität:** die Messwerte sind ein Hilfsmittel, kein Ersatz für Muttersprachler. Für RO, PL, EL, AR und RU lohnt eine Stichprobe durch Muttersprachler.
- **KI-Kennzeichnung (EU-KI-Verordnung, Art. 50):** nach meinem Kenntnisstand müssen KI-erzeugte Texte, die die Öffentlichkeit über Themen von öffentlichem Interesse informieren, als solche gekennzeichnet werden, **außer** sie werden redaktionell geprüft und eine Person trägt die redaktionelle Verantwortung. Die Artikel erscheinen unter den Namen der Autorenliste (`AUTHOR_NAME` in der Edge-Funktion, Autorenseiten `/author/…`) und werden bei eingeschalteter Auto-Veröffentlichung ohne menschliche Freigabe veröffentlicht. Wenn diese Namen keine realen Personen sind, die die Texte verantworten, kommt ein zweites Problem dazu (Irreführung der Leser). Das ist eine **Entscheidung für dich** (Kennzeichnung oder tatsächliche redaktionelle Freigabe), am besten mit juristischer Beratung; ich habe daran nichts geändert.
- **Concierge-Strom:** läuft live (Health-Check: erstes Wort nach 1,0 s). Ein Gespräch mit mehreren Nachrichten (Verlauf) ist live noch nicht ausprobiert, nur im Test. Bricht ein Gast mitten in der Antwort ab, bleibt der Verbrauch dieser einen Antwort unprotokolliert (kleine Beträge).
- **Gedächtnis, Begrüßung, Suchverständnis, Umsortierung** laufen jetzt mit einem Modell, das denkt (auf „low“). Das ist langsamer als das frühere kleine Claude-Modell. Suchverständnis und Umsortierung sind standardmäßig aus (`CONCIERGE_LLM_UNDERSTAND`, `CONCIERGE_RERANK`); wer sie einschaltet, merkt jede Sekunde direkt vor dem ersten Wort des Chats. Sie haben je 7 Sekunden Zeit und fallen bei Überschreitung ohne Fehler auf die normale Suche zurück.
- **Datenschutztexte:** sorgfältig geschrieben, aber ohne juristische Prüfung. Die Aussage im Register, OpenAI nutze Daten der API standardmäßig nicht zum Training und behalte sie bis zu 30 Tage zur Missbrauchsprüfung, stammt aus der OpenAI-Dokumentation (Oktober 2026) und gilt nur, solange du die Datenfreigabe in deinem OpenAI-Konto nicht eingeschaltet hast.

## 10. Dateien, die nicht mehr gebraucht werden

Ein ZIP kann Dateien überschreiben, aber nicht löschen. Deshalb sind die alten Dateien durch leere Hüllen ersetzt. Du kannst sie in GitHub löschen (Datei öffnen → Papierkorb-Symbol), musst aber nicht; nichts im Code ruft sie noch auf.

| Datei | Zustand |
|---|---|
| `lib/desk/pipeline.ts` | leere Hülle (der alte Desk: englischer Entwurf, in sechs Sprachen übersetzt, ohne Faktencheck) |
| `lib/desk/queue.ts` | leere Hülle (die Warteschlange liegt jetzt in der Edge-Funktion) |
| `lib/desk/prompts.ts`, `lib/desk/cover.ts` | werden von nichts mehr importiert |
| `lib/aiReply.ts` | leere Hülle (las Antworten des früheren Modell-Anbieters) |
| `supabase/functions/concierge/index.ts` | leere Hülle; die Funktion selbst in Supabase löschen (Abschnitt 2c) |

## 11. Wo was steht

- Quellcode der beiden Edge-Funktionen: `scripts/edge/*.src.ts`. Die Dateien in `supabase/functions/…/index.ts` sind **erzeugt** (`node scripts/build-edge-journalism.mjs`); ein Test schlägt fehl, wenn sie nicht zum Quellcode passen. Nie von Hand ändern.
- Modelle, Aufwand, Preise: `lib/journalism/models.ts`. OpenAI-Client: `lib/journalism/openai.ts`, sein Streaming-Teil `lib/journalism/openaiStream.ts`. Die Tür der App zu OpenAI (Schlüssel, Budget, Ausgabenprotokoll): `lib/ai.ts`. Ablauf eines Artikels: `lib/journalism/pipeline.ts`. Schreib-Prompts: `lib/journalism/prompts.ts`.
- Der Testersatz für OpenAI (`scripts/tests/_fakeOpenAI.ts` und die Regeln in `scripts/tests/_openaiRules.ts`) lehnt Anfragen ab, die das echte OpenAI ablehnen würde. Entdeckt man live eine neue Regel, gehört sie dort hinein.
- Concierge: das Gespräch mit dem Modell `lib/concierge/chatModel.ts`, Persona und Kontext `lib/concierge/brain.ts`, Mail-Assistent `lib/mail/assist.ts`.
- Messung der Sprache: `lib/voice/*` (siehe `docs/VOICE-ENGINE.md`).
- Tests: `node scripts/tests/run.mjs` (alles, rund 40 Sekunden, ohne Schlüssel und ohne Kosten).
