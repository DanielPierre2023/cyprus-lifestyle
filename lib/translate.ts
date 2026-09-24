// Cyprus Lifestyle — translator (Node port of TT tt-translate-html, extended to all
// seven editions: EN·EL·RO·AR·DE·PL·RU). Translates an article body between any two
// of the seven languages while preserving the EXACT HTML structure; only text
// between tags is translated. The target language is passed through to the
// deterministic anti-AI humanizer as its real Lang, so every edition (de/pl/ru
// included) is humanised — not left with em-dashes or calques.
import 'server-only';
import { callClaude, CLAUDE_SONNET, parseAiJson } from '@/lib/ai';
import { humanizeHtml, humanizeText, type Lang } from '@/lib/antiAi';
import { LOCALE_NAME, type Locale } from '@/lib/locales';

function stripFences(s: string): string {
  return (s || '').trim().replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

const AI_TELL_HINT: Record<Locale, string> = {
  en: 'delve, boasts, nestled, tapestry, "a testament to", underscores, showcases, "it\'s worth noting", "plays a crucial role", moreover / furthermore',
  el: '«αξίζει να σημειωθεί», «διαδραματίζει κρίσιμο ρόλο», «αποτελεί απόδειξη/μαρτυρία», «ένα ευρύ φάσμα», «μια πληθώρα», «στην καρδιά της», «ρίχνει φως σε», «στη σύγχρονη/ψηφιακή εποχή», «όχι μόνο… αλλά και», «Επιπλέον/Επιπροσθέτως», «Εν κατακλείδι/Συμπερασματικά»',
  ro: '„joacă un rol crucial", „reprezintă o dovadă", „merită menționat că", „o gamă largă de", „în cele din urmă"',
  ar: '«تجدر الإشارة إلى أن»، «من الجدير بالذكر»، «يلعب دورا حاسما/محوريا»، «يشكل دليلا على»، «يسلط الضوء على»، «مجموعة واسعة من»، «في قلب»، «في عالم اليوم»، «ليس فقط… بل أيضا»، «علاوة على ذلك/بالإضافة إلى ذلك»، «في الختام/في نهاية المطاف»',
  de: '„es ist erwähnenswert", „spielt eine entscheidende Rolle", „ist ein Zeugnis für", „eine breite Palette von", „im Herzen von", „wirft ein Licht auf", „in der heutigen Zeit", „nicht nur… sondern auch", „zudem / darüber hinaus", „letztlich / schließlich"',
  pl: '„warto zauważyć, że", „odgrywa kluczową rolę", „stanowi dowód/świadectwo", „szeroki wachlarz", „w sercu", „rzuca światło na", „w dzisiejszych czasach", „nie tylko… ale także", „co więcej / ponadto", „ostatecznie"',
  ru: '«стоит отметить, что», «играет ключевую/решающую роль», «является свидетельством», «широкий спектр», «в самом сердце», «проливает свет на», «в современном мире», «не только… но и», «более того / кроме того», «в конечном счёте»',
};

// Translate a rich HTML body, preserving structure 1:1.
export async function translateHtml(html: string, source: Locale, target: Locale): Promise<{ ok: boolean; html?: string; error?: string }> {
  const body = (html || '').trim();
  if (!body) return { ok: false, error: 'html is required' };
  if (source === target) return { ok: true, html: body };

  const rtlNote = target === 'ar'
    ? '\n- The target is Arabic (right-to-left). Produce natural Modern Standard Arabic; do NOT add dir/lang attributes or reorder elements — the site sets direction at render time.'
    : '';

  const system = [
    `You are a professional translator for Cyprus Lifestyle, a luxury Cyprus newspaper-magazine.`,
    `Translate the article body below from ${LOCALE_NAME[source]} to ${LOCALE_NAME[target]}.`,
    ``,
    `Return VALID HTML whose STRUCTURE is identical to the input:`,
    `- Preserve every tag, its attributes and order EXACTLY: <p>, <br>, <strong>, <b>, <em>, <i>, <u>, <s>, <h2>, <h3>, <h4>, <blockquote>, <ul>, <ol>, <li>, <a>, <sub>, <sup>, <hr>, <figure>, <figcaption>, <img>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <caption>.`,
    `- Translate ONLY the human-readable text between tags. Do NOT add, remove, merge, split or reorder any element.`,
    `- Keep inline emphasis on the same words; translate each table cell in place.`,
    `- Keep numbers, dates, URLs and proper names intact; keep EUR figures as EUR.`,
    `- Do NOT add a title, extra headings, notes or a wrapping element.` + rtlNote,
    ``,
    `Write natural, editorial ${LOCALE_NAME[target]} — never machine-like:`,
    `- Translate faithfully and in full: preserve the exact meaning, facts, figures, names and nuance — no additions, omissions, softening or embellishment.`,
    `- Read as if originally written by a native ${LOCALE_NAME[target]} journalist for print: idiomatic, precise and publication-grade — accurate to the source yet never a word-for-word calque.`,
    `- Use NO em/en dashes (— –); use commas, periods or parentheses.`,
    `- Headings stay sentence case, never ALL CAPS or Title Case; keep real acronyms (EU, VAT, NATO).`,
    `- Avoid AI-tell words and filler: ${AI_TELL_HINT[target]}. Prefer plain words.`,
    `- No summary/conclusion filler paragraph; keep it factual and direct.`,
    `Output ONLY the translated HTML — no code fences, no preamble.`,
  ].join('\n');

  const { text, error } = await callClaude({ systemInstruction: system, userMessage: body, model: CLAUDE_SONNET, temperature: 0.2, maxTokens: 8000, fn: 'translate-html' });
  if (error) return { ok: false, error };
  const out = stripFences(text);
  if (!out) return { ok: false, error: 'empty translation' };
  return { ok: true, html: humanizeHtml(out, target as Lang) };
}

// Translate a short plain string (title, excerpt, SEO field).
export async function translateText(text: string, source: Locale, target: Locale, kind = 'text'): Promise<string> {
  const body = (text || '').trim();
  if (!body || source === target) return body;
  const rtlNote = target === 'ar' ? ' Produce natural Modern Standard Arabic.' : '';
  const system = [
    `You are a translator for Cyprus Lifestyle, a luxury Cyprus magazine. Translate this ${kind} from ${LOCALE_NAME[source]} to ${LOCALE_NAME[target]}.`,
    `Translate faithfully but idiomatically — as a native ${LOCALE_NAME[target]} journalist would write it, accurate to the source yet natural, never a literal calque or machine-like.`,
    `Return ONLY the translation — no quotes, no notes. Sentence case (never ALL CAPS/Title Case). No em/en dashes. Keep EUR figures and proper names.${rtlNote}`,
  ].join('\n');
  const { text: out } = await callClaude({ systemInstruction: system, userMessage: body, model: CLAUDE_SONNET, temperature: 0.2, maxTokens: 400, fn: 'translate-text' });
  return humanizeText(stripFences(out) || body, target as Lang);
}

// Translate several short fields in ONE call (title/excerpt/summary/seo). Keeps
// the per-article model-call count sane across the seven-language pipeline.
export async function translateBundle(
  fields: Record<string, string>, source: Locale, target: Locale,
): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, v]) => (v || '').trim());
  if (source === target || entries.length === 0) return { ...fields };
  const rtlNote = target === 'ar' ? ' Produce natural Modern Standard Arabic.' : '';
  const system = [
    `You translate short editorial fields for Cyprus Lifestyle from ${LOCALE_NAME[source]} to ${LOCALE_NAME[target]}.`,
    `Return ONLY a JSON object with the SAME keys, each value translated.${rtlNote}`,
    `Sentence case (never ALL CAPS/Title Case). No em/en dashes. Keep €, numbers and proper names. No AI filler.`,
  ].join('\n');
  const { text, error } = await callClaude({
    systemInstruction: system,
    userMessage: JSON.stringify(Object.fromEntries(entries)),
    model: CLAUDE_SONNET, temperature: 0.2, maxTokens: 1200, jsonMode: true, fn: 'translate-bundle',
  });
  if (error) return { ...fields };
  const parsed = parseAiJson<Record<string, string>>(text);
  const out: Record<string, string> = { ...fields };
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string' && v.trim()) out[k] = humanizeText(v, target as Lang);
  }
  return out;
}
