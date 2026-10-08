// lib/voice/tells.ts — turns the per-language voice data (lib/voice/data/<lang>.ts) into working detectors.
// Pure (no I/O). Detectors are DATA (alternatives per tell); this file is the only place that knows how to build the regexes,
// with the same boundary and folding rules as lib/antiAiLang.ts, so a linguist can add a tell without touching code.
//
// A bad pattern must never break scoring or generation: every regex is compiled inside try/catch and a tell that fails to
// compile is skipped (and reported by tellCompileErrors for the tests).
import type { Lang, AiTell } from '@/lib/antiAi';
import { normalizeFor, prepare } from '@/lib/antiAiLang';
import { voiceData } from '@/lib/voice/data';
import { attributionSpecs } from '@/lib/voice/attribution';
import type { TellSpec } from '@/lib/voice/types';

const L = String.raw`\p{L}\p{M}\p{N}`;

export function compileTell(spec: TellSpec, lang: Lang): RegExp | null {
  try {
    const alts = spec.alts.map((a) => normalizeFor(lang, a)).join('|');
    if (!alts) return null;
    if (spec.kind === 'raw') return new RegExp(`(?:${alts})`, 'giu');
    if (spec.kind === 'start') return new RegExp(String.raw`(?:^|\n)\s*(?:${alts})(?![${L}])`, 'giu');
    // Arabic attaches prefixes (و ف ب ل ك and the article ال) to the word, so allow them before the alternatives.
    if (lang === 'ar') return new RegExp(String.raw`(?<![${L}])[وفبلك]{0,2}(?:ال)?(?:${alts})(?![${L}])`, 'giu');
    return new RegExp(String.raw`(?<![${L}])(?:${alts})(?![${L}])`, 'giu');
  } catch {
    return null;
  }
}

const CACHE = new Map<Lang, { spec: TellSpec; re: RegExp }[]>();
export function compiledTells(lang: Lang): { spec: TellSpec; re: RegExp }[] {
  let v = CACHE.get(lang);
  if (!v) {
    v = [];
    for (const spec of [...voiceData(lang).tells, ...attributionSpecs(lang)]) {
      const re = compileTell(spec, lang);
      if (re) v.push({ spec, re });
    }
    CACHE.set(lang, v);
  }
  return v;
}

/** Specs that failed to compile (used by the unit tests: this list must stay empty). */
export function tellCompileErrors(lang: Lang): string[] {
  return [...voiceData(lang).tells, ...attributionSpecs(lang)].filter((t) => !compileTell(t, lang)).map((t) => t.key);
}

function sampleAt(view: string, idx: number, len: number): string {
  const i = Math.max(0, idx - 24);
  const j = Math.min(view.length, idx + len + 24);
  return (i > 0 ? '…' : '') + view.slice(i, j).replace(/\s+/g, ' ').trim() + (j < view.length ? '…' : '');
}

/** Run the language's data-driven detectors over plain text. */
export function dataTells(content: string, lang: Lang): AiTell[] {
  const { text, view } = prepare(content, lang);
  const out: AiTell[] = [];
  for (const { spec, re } of compiledTells(lang)) {
    const r = new RegExp(re.source, re.flags);
    const hits = text.match(r);
    const count = hits ? hits.length : 0;
    if (count === 0 || count < (spec.min || 1)) continue;
    const m = new RegExp(re.source, re.flags).exec(text);
    out.push({ key: spec.key, label: spec.label, severity: spec.severity, count, sample: m ? sampleAt(view.length === text.length ? view : text, m.index, m[0].length) : '' });
  }
  return out;
}
