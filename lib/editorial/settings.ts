// lib/editorial/settings.ts
// ============================================================================
// Editorial engine settings, stored as one JSON row in site_settings (key='editorial').
//   • autonomy       'suggest'  → the planner only suggests; a human approves each idea.
//                    'auto-draft' → approving an idea also auto-drafts it (AI editors write
//                                   the first version); a human still edits & publishes.
//   • webSearch      give the planner live web research ("what's in").
//   • ideasPerSection how many candidates to ask for per under-served subcategory.
//   • sectionsPerRun  how many sections one planner run covers (fits the 60s budget).
// Server-only. Reads degrade to sensible defaults if the row is missing.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type Autonomy = 'suggest' | 'auto-draft';
export interface EditorialSettings {
  autonomy: Autonomy;
  webSearch: boolean;
  ideasPerSection: number;
  sectionsPerRun: number;
}
export const DEFAULT_EDITORIAL_SETTINGS: EditorialSettings = {
  autonomy: 'suggest',   // Daniel: suggest-only for week one, then switch to 'auto-draft'
  webSearch: true,       // Daniel: wire web search now
  ideasPerSection: 3,
  sectionsPerRun: 4,
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
