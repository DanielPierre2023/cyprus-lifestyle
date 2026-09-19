# Cyprus Lifestyle — Concierge Voice (v2)

Speak to the concierge and have it reply aloud — in the guest's own language.
Browser-native, so **no new cost, no API keys, no backend** — a self-contained
"wow" that fits the luxury feel.

## What it does
- **Speak (mic):** a mic button in the composer. Tap it, speak; it transcribes
  live into the box and sends when you finish — hands-free. Recognises the guest's
  language (en/el/ro/ar/de/pl/ru).
- **Listen (read-aloud):** a speaker toggle in the panel header. When on, the
  concierge reads each reply aloud in the guest's language. The preference is
  remembered per browser.
- **Unified & tasteful:** it lives in the same editorial panel (no jarring
  full-screen "orb"); speaking stops when you send, close, or start the mic again.
- **Graceful:** the mic appears only where the browser supports speech recognition
  (Chrome, Edge, Safari; hidden on Firefox — everything else still works). Voices
  for less-common languages depend on the device; it degrades quietly.

## How it's built
All client-side in `components/ConciergeChat.tsx` using the Web Speech API
(`SpeechRecognition`) and `speechSynthesis`. Locale → speech-language mapping;
read-aloud speaks each finished reply once. No server changes.

## Files
```
components/ConciergeChat.tsx            (mic + read-aloud controls & logic)
app/[locale]/(site)/layout.tsx         (passes voice labels)
messages/{en,el,ro,ar,de,pl,ru}.json    (concierge.chat.voice — 7 languages)
```

## Deploy — 1 place
Commit & push. **No SQL, no env, no edge-function change.**

## Try it after deploy
Open the Concierge Bell → tap the **mic** and say *"a quiet beachfront dinner in
Paphos"* — it transcribes and answers. Tap the **speaker** icon (top of the panel)
to have replies read aloud. Switch to `/de` or `/ru` and it listens and speaks in
that language.

## Roadmap (v2 continues)
Shipped: memory ✓, voice ✓. Next: hybrid vector search (sharper recall), a
proactive concierge, and the members' tier.
