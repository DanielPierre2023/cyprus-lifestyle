// lib/editorial/settings.ts
// ============================================================================
// Editorial engine settings, stored as one JSON row in site_settings (key='editorial').
//   • autonomy       'suggest'  → the planner only suggests; a human approves each idea.
//                    'auto-draft' → approving an idea also auto-drafts it (AI editors write
//                                   the first version); a human still edits & publishes.
//   • webSearch      give the planner live web research ("what's in").
//   • ideasPerSection how many candidates to ask for per under-served subcategory.
//   • sectionsPerRun  how many sections one planner run covers (fits the 60s budget).
//   • autoCover      when a piece is drafted, auto-attach a real matching stock photo
//                    (fast + free; AI covers are on-demand, never on this path).
//   • imageSource    the DEFAULT mode for on-demand cover generation (the board's
//                    "Photo" / "AI image" buttons and the /cover route):
//                    'stock' (real photo) · 'ai' (illustration) · 'stock-then-ai'
//                    (a real photo if one fits, else an AI illustration) · 'off'.
//   • autoClean      when translating, any edition that still reads medium+ on the
//                    AI-tell score gets the proofread/clean pass automatically before
//                    it goes live, so the Quality board mostly stays green on its own.
// Server-only. Reads degrade to sensible defaults if the row is missing.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ImageSource } from '@/lib/editorial/cover';

export type Autonomy = 'suggest' | 'auto-draft';
export interface EditorialSettings {
  autonomy: Autonomy;
  webSearch: boolean;
  ideasPerSection: number;
  sectionsPerRun: number;
  autoCover: boolean;
  imageSource: ImageSource;
  autoClean: boolean;
}
const IMAGE_SOURCES: ImageSource[] = ['off', 'stock', 'ai', 'stock-then-ai'];
export const DEFAULT_EDITORIAL_SETTINGS: EditorialSettings = {
  autonomy: 'suggest',   // Daniel: suggest-only for week one, then switch to 'auto-draft'
  webSearch: true,       // Daniel: wire web search now
  ideasPerSection: 3,
  sectionsPerRun: 4,
  autoCover: true,             // every new draft gets a real, matching photo
  imageSource: 'stock-then-ai', // on-demand: a real photo first, an AI illustration if none fits
  autoClean: true,             // auto-clean medium+ editions at translate time
};

export async function getEditorialSettings(): Promise<EditorialSettings> {
  try {
    const { data } = await supabaseAdmin().from('site_settings').select('value').eq('key', 'editorial').maybeSingle();
    const v = (data?.value ?? {}) as Partial<EditorialSettings>;
    return {
      autonomy: v.autonomy === 'auto-draft' ? 'auto-draft' : DEFAULT_EDITORIAL_SETTINGS.autonomy,
      webSearch: typeof v.webSearch === 'boolean' ? v.webSearch : DEFAULT_EDITORIAL_SETTINGS.webSearch,
      ideasPerSection: Number.isFinite(v.ideasPerSection as number) && (v.ideasPerSection as number) > 0
        ? Math.min(Math.round(v.ideasPerSection as number), 8) : DEFAULT_EDITORIAL_SETTINGS.ideasPerSection,
      sectionsPerRun: Number.isFinite(v.sectionsPerRun as number) && (v.sectionsPerRun as number) > 0
        ? Math.min(Math.round(v.sectionsPerRun as number), 12) : DEFAULT_EDITORIAL_SETTINGS.sectionsPerRun,
      autoCover: typeof v.autoCover === 'boolean' ? v.autoCover : DEFAULT_EDITORIAL_SETTINGS.autoCover,
      imageSource: IMAGE_SOURCES.includes(v.imageSource as ImageSource)
        ? (v.imageSource as ImageSource) : DEFAULT_EDITORIAL_SETTINGS.imageSource,
      autoClean: typeof v.autoClean === 'boolean' ? v.autoClean : DEFAULT_EDITORIAL_SETTINGS.autoClean,
    };
  } catch {
    return DEFAULT_EDITORIAL_SETTINGS;
  }
}

export async function setEditorialSettings(patch: Partial<EditorialSettings>): Promise<EditorialSettings> {
  const next = { ...(await getEditorialSettings()), ...patch };
  await supabaseAdmin().from('site_settings').upsert({ key: 'editorial', value: next }, { onConflict: 'key' });
  return next;
}
