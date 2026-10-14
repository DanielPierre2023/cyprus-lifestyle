# Lieferung 5c (14.10.2026): Rest der Leptos-Lieferung, 22 Dateien

**Nicht committen:** diese Datei (`_LIESMICH-5C.md`). Alle anderen 22 Dateien mit Repository-Pfad hochladen (Add files via upload). Das sind genau die Dateien, die nach deinem Upload (Commit 88d7740) auf main noch fehlen. Sie enthalten schon die Korrektur aus Lieferung 5b, du brauchst 5b dann nicht mehr.

Warum jetzt wichtig: Auf main liegt schon die Seite `directory/[type]/[slug]/page.tsx`, die auf `components/Leptos*.tsx` und `lib/partners/*` zeigt. Solange diese Dateien fehlen, schlägt der Vercel-Build von main fehl. Die Live-Seite bleibt dabei auf der letzten guten Version stehen. Nach diesem Upload ist der Build wieder grün.

Danach: Vercel-Build abwarten, dann `/api/concierge/embed-directory` aufrufen, bis „remaining: 0“.
