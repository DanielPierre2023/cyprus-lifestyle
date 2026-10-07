// lib/voice/data/index.ts — the per-language voice data (detectors, banned phrases, style sheets, desk notes).
// Each file is generated data (scripts/voice/build-data.mjs from the linguists' sources); edit the data, not the engine.
import type { Lang } from '@/lib/antiAi';
import type { LangVoiceData } from '@/lib/voice/types';
import en from './en';
import el from './el';
import ro from './ro';
import ar from './ar';
import de from './de';
import pl from './pl';
import ru from './ru';

export const VOICE_DATA: Record<Lang, LangVoiceData> = { en, el, ro, ar, de, pl, ru };
export const voiceData = (lang: Lang): LangVoiceData => VOICE_DATA[lang] || VOICE_DATA.en;
