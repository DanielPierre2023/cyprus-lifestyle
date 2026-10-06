import type { Locale } from '@/lib/locales';

/** One section of a legal text: a heading, paragraphs and/or a bullet list. Tokens like {company} are filled at render. */
export interface LegalSection { h: string; p?: string[]; li?: string[] }
export interface LegalDoc { title: string; dek: string; sections: LegalSection[] }
export type LegalDocs = Record<Locale, LegalDoc>;
export const LEGAL_KINDS = ['privacy', 'terms', 'cookies', 'notice'] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];
