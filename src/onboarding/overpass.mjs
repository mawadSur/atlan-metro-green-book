// Overpass API client — queries OpenStreetMap for Muslim-friendly places.
// Free, no API key. https://wiki.openstreetmap.org/wiki/Overpass_API
//
// Signal tags we rely on (highest precision for "Muslim business"):
//   amenity=place_of_worship + religion=muslim   -> mosques / masjids
//   diet:halal=yes | diet:halal=only             -> halal-serving food
//   cuisine=halal                                 -> halal cuisine
//   shop=* with halal hints                       -> halal grocery / markets
//
// Each category maps to a `type` in the app's location schema.

import { USER_AGENT } from './geocode.mjs';

// Public Overpass mirrors; we try them in order on failure.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/**
 * Category definitions. `filters` is a list of Overpass tag-filter strings;
 * each is expanded for nodes, ways, and relations within the bounding box.
 */
export const CATEGORIES = [
  {
    type: 'masjid',
    label: 'Mosques & Islamic centers',
    filters: ['["amenity"="place_of_worship"]["religion"="muslim"]'],
  },
  {
    type: 'restaurant',
    label: 'Halal restaurants',
    filters: [
      '["amenity"="restaurant"]["diet:halal"~"yes|only"]',
      '["amenity"="restaurant"]["cuisine"~"halal"]',
      '["amenity"="fast_food"]["diet:halal"~"yes|only"]',
    ],
  },
  {
    type: 'coffee',
    label: 'Cafes (halal-friendly)',
    filters: [
      '["amenity"="cafe"]["diet:halal"~"yes|only"]',
      '["amenity"="cafe"]["cuisine"~"coffee_shop"]["diet:halal"~"yes|only"]',
    ],
  },
  {
    type: 'grocery',
    label: 'Halal grocery & markets',
    filters: [
      '["shop"~"supermarket|convenience|greengrocer|butcher"]["diet:halal"~"yes|only"]',
      '["shop"="butcher"]["halal"="yes"]',
    ],
  },
  {
    type: 'garments',
    label: 'Islamic clothing shops',
    filters: ['["shop"="clothes"]["clothes"~"muslim|islamic|abaya|hijab"]'],
  },
];

/** Build an Overpass QL query for one category over a bbox string. */
export function buildQuery(filters, bbox, timeoutSec = 60) {
  const body = filters
    .flatMap((f) => [
      `  node${f}(${bbox});`,
      `  way${f}(${bbox});`,
      `  relation${f}(${bbox});`,
    ])
    .join('\n');
  return `[out:json][timeout:${timeoutSec}];\n(\n${body}\n);\nout center tags;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** POST a query, trying mirrors in order with simple backoff. */
export async function runOverpass(query, { retries = 2 } = {}) {
  let lastErr;
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
          },
          body: 'data=' + encodeURIComponent(query),
        });
        if (res.status === 429 || res.status === 504) {
          await sleep(2000 * (attempt + 1)); // rate-limited / busy — back off
          continue;
        }
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        const json = await res.json();
        return json.elements || [];
      } catch (err) {
        lastErr = err;
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  throw new Error(`All Overpass endpoints failed: ${lastErr?.message}`);
}

/**
 * Fetch every category for a city bbox.
 * Returns [{ type, label, elements:[...] }] — raw OSM elements, untouched.
 * Categories run sequentially to stay polite to the free API.
 */
export async function fetchCity(bbox, { onProgress } = {}) {
  const out = [];
  for (const cat of CATEGORIES) {
    const query = buildQuery(cat.filters, bbox);
    const elements = await runOverpass(query);
    out.push({ type: cat.type, label: cat.label, elements });
    onProgress?.(cat, elements.length);
    await sleep(1200); // ~1 req/sec courtesy gap
  }
  return out;
}
