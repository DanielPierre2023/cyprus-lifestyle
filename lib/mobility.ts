// Cyprus Lifestyle — mobility helpers. The real ride options that operate on the
// island (Uber and Yandex do not), so "getting there" is one tap from any
// listing. Coordinate-precise deep-links aren't publicly stable for these apps,
// so we open the app/site directly; Directions is coordinate-precise via Maps.
export const TAXI_APPS: { name: string; url: string }[] = [
  { name: 'Bolt', url: 'https://bolt.eu/en-cy/' },
  { name: 'CabCY', url: 'https://cab.com.cy/' },
  { name: 'nTaxi', url: 'https://www.ntaxi.net/' },
];

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
