// Geocoding via OpenStreetMap Nominatim — free, no API key.
// Resolves a human city name (e.g. "Atlanta, GA") into a bounding box + center.
//
// Nominatim usage policy: max 1 request/sec, descriptive User-Agent required.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
export const USER_AGENT =
  'AtlanMetroGreenBook/0.1 (city-onboarding; https://github.com/mawadSur/atlan-metro-green-book)';

/**
 * @param {string} query  e.g. "Atlanta, Georgia, USA"
 * @returns {Promise<{displayName:string, lat:number, lng:number,
 *   bbox:{south:number,north:number,west:number,east:number}, country:string}>}
 */
export async function geocodeCity(query) {
  const url = `${NOMINATIM}?` + new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for "${query}"`);

  const results = await res.json();
  if (!results.length) throw new Error(`No geocode match for "${query}"`);

  const r = results[0];
  // Nominatim boundingbox = [south, north, west, east] as strings
  const [south, north, west, east] = r.boundingbox.map(Number);

  return {
    displayName: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    bbox: { south, north, west, east },
    country: r.address?.country || '',
  };
}

/** Format a bbox the way Overpass wants it: (south,west,north,east). */
export function bboxToOverpass({ south, west, north, east }) {
  return `${south},${west},${north},${east}`;
}
