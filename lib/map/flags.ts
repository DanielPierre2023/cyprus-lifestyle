// lib/map/flags.ts
// Which map runs where — one server-side switch, so the new explorer can be rolled
// out (and rolled back) from Vercel → Environment Variables without a code change.
//
//   MAP_EXPLORER=off  → the original maps everywhere (LiveMap on /map, BusinessMap on /directory)
//   MAP_EXPLORER=map  → new explorer on /map, original BusinessMap on /directory   (default)
//   MAP_EXPLORER=all  → new explorer on /map AND in the /directory map section
import 'server-only';

export type MapExplorerMode = 'off' | 'map' | 'all';

export function mapExplorerMode(): MapExplorerMode {
  const v = (process.env.MAP_EXPLORER || '').trim().toLowerCase();
  return v === 'off' || v === 'all' ? v : 'map';
}
export const explorerOnMapPage = () => mapExplorerMode() !== 'off';
export const explorerOnDirectory = () => mapExplorerMode() === 'all';
