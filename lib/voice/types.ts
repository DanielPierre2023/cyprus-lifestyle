// lib/voice/types.ts — shapes shared by the voice engine. Pure types, no runtime code.
import type { Lang } from '@/lib/antiAi';

export type Severity = 'high' | 'medium' | 'low';

/** One detector, as data. `alts` are regex source fragments; `kind` decides the boundary rule (see lib/voice/tells.ts). */
export interface TellSpec {
  key: string; label: string; severity: Severity;
  kind: 'word' | 'start' | 'raw';
  alts: string[];
  min?: number;
}

export interface LangVoiceData {
  lang: Lang;
  tells: TellSpec[];
  banned: string[];
  closers: string[];
  openers: string[];
  sheet: string[];
  pairs: { bad: string; good: string; why: string }[];
  desks: Record<string, string>;
}
