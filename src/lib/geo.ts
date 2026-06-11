/** Haversine distance between two coordinates (miles + km). Pure TS, RN-safe. */
export interface Coordinates { lat: number; lng: number; }
export interface Distance { miles: number; km: number; }

export function haversineDistance(from: Coordinates, to: Coordinates): Distance {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const miles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return { miles, km: miles * 1.60934 };
}

export function formatDistance(d: Distance, lang: 'en' | 'ar' | 'es'): string {
  const mi = d.miles.toFixed(1);
  // 'mi' abbreviation is correct for both English and Spanish; Arabic uses 'ميل'
  return lang === 'ar' ? `${mi} ميل` : `${mi} mi`;
}
