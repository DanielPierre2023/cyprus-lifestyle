// lib/knowledge/markets.ts
// ============================================================================
// CYPRUS LIFESTYLE — AUDIENCE / MARKET HUBS
// ----------------------------------------------------------------------------
// A landing hub per key market (from the market research): what each audience
// wants first, curated from the knowledge base. Each hub reuses the already-
// translated guide questions (qa.i18n.ts) and directory groups, so only the
// short hub copy (kicker/title/intro) is market-specific — translated in
// markets.i18n.ts. English is the SOURCE here.
// Republic of Cyprus (south) only.
// ============================================================================

import type { KBLoc } from './qa.i18n';

export interface Market {
  id: string;                 // slug, used in /for/<id>
  primaryLocale: 'en' | KBLoc;
  kicker: string;
  title: string;
  intro: string;
  guides: string[];           // featured KB intent ids (flagship first); first 3 => "Start here"
  groups: string[];           // taxonomy group keys to explore in the directory
  luxury?: boolean;           // surface the luxury collection
}

export const MARKETS: Market[] = [
  {
    id: 'russian', primaryLocale: 'ru',
    kicker: 'For Russian-speakers',
    title: 'Cyprus for Russian-speakers',
    intro: 'Residency and tax, Russian-speaking lawyers and doctors, schools for the children and the Orthodox calendar — everything for a life well lived in Limassol and beyond.',
    guides: ['get-residency', 'non-dom', 'buy-property', 'healthcare', 'schools', 'banking', 'orthodox-liturgy', 'english-doctor', 'cost-of-living', 'which-town'],
    groups: ['realestate', 'professional', 'health'],
  },
  {
    id: 'polish', primaryLocale: 'pl',
    kicker: 'For visitors from Poland',
    title: 'Cyprus for Poland',
    intro: 'Warm sea for half the year, family beaches and honest value — plus everything you need to plan the trip, whatever the season.',
    guides: ['when-to-visit', 'best-beaches', 'family-beaches', 'daily-budget', 'waterparks', 'getting-around', 'best-restaurants', 'wine-halloumi-day', 'boat-trips'],
    groups: ['nature', 'food', 'stays'],
  },
  {
    id: 'romanian', primaryLocale: 'ro',
    kicker: 'For Romanians in Cyprus',
    title: 'Cyprus for Romanians',
    intro: 'Work and live on the island — residency, the cost of living, the everyday services you will need and the Orthodox community that makes it feel like home.',
    guides: ['get-residency', 'cost-of-living', 'find-tradesperson', 'healthcare', 'house-cleaning', 'banking', 'orthodox-liturgy', 'schools', 'car-mot'],
    groups: ['services', 'professional', 'community'],
  },
  {
    id: 'german', primaryLocale: 'de',
    kicker: 'For visitors from Germany',
    title: 'Cyprus for Germany',
    intro: 'Trails through the Troodos, the painted churches, the wine villages and the quiet corners — the Cyprus beyond the beach, planned with care.',
    guides: ['hiking-troodos', 'painted-churches', 'villages-day-trip', 'taste-wine', 'birdwatching', 'stay-stone-house', 'monastery-etiquette', 'wine-halloumi-day', 'best-restaurants'],
    groups: ['nature', 'culture', 'stays'],
  },
  {
    id: 'british', primaryLocale: 'en',
    kicker: 'For the British in Cyprus',
    title: 'Cyprus for the British',
    intro: 'Buying, residency and healthcare made clear, English-speaking professionals and the island’s best tables — then the villages worth leaving the coast for.',
    guides: ['buy-property', 'get-residency', 'healthcare', 'non-dom', 'cost-of-living', 'english-doctor', 'best-restaurants', 'golf', 'villages-day-trip'],
    groups: ['realestate', 'professional', 'health'],
  },
  {
    id: 'israeli', primaryLocale: 'en',
    kicker: 'For visitors from Israel',
    title: 'Cyprus for Israel',
    intro: 'Forty minutes from home: the best beaches and boat days, where to base yourself, kosher-friendly dining and property for when you are ready to invest.',
    guides: ['best-beaches', 'boat-trips', 'which-town', 'buy-property', 'diets', 'watersports-prices', 'golf', 'best-restaurants'],
    groups: ['stays', 'nature', 'realestate'],
  },
  {
    id: 'arab', primaryLocale: 'ar',
    kicker: 'For visitors from the Gulf',
    title: 'Cyprus for the Gulf',
    intro: 'Cool Mediterranean summers, halal-friendly dining, private villas and quiet luxury — with a concierge to arrange every detail.',
    guides: ['best-beaches', 'boat-trips', 'diets', 'stay-stone-house', 'engagement-ring', 'authentic-gifts', 'golf', 'best-restaurants'],
    groups: ['stays', 'retail', 'nature'],
    luxury: true,
  },
];

export const MARKET_INDEX: Record<string, Market> = Object.fromEntries(MARKETS.map((m) => [m.id, m]));
export const MARKET_IDS = MARKETS.map((m) => m.id);
