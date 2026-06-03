// Normalize raw OSM elements into the app's location schema, then dedupe.
//
// Output record shape MATCHES src/data seed exactly:
//   { type, name_en, name_ar, name_es, address, lat, lng, phone,
//     hours_en, hours_ar, hours_es, halal_certified, alcohol_free,
//     prayer_space, family_friendly, discount_code, discount_offer_en,
//     discount_offer_ar, discount_offer_es, worldcup_special,
//     source, osm_id }

/** OSM elements carry coords on the node itself, or under `center` for ways/relations. */
function coordsOf(el) {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

/** Assemble a US-style street address from OSM addr:* tags. */
function buildAddress(t) {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const cityLine = [t['addr:city'], t['addr:state'], t['addr:postcode']]
    .filter(Boolean)
    .join(', ');
  return [street, cityLine].filter(Boolean).join(', ');
}

/** Normalize an E.164-ish phone; keep digits and a leading +. */
function cleanPhone(raw) {
  if (!raw) return '';
  const first = raw.split(';')[0].trim();
  const kept = first.replace(/[^\d+]/g, '');
  return kept || '';
}

/** A mosque always has a prayer space and is alcohol-free. */
function flagsFor(type, t) {
  const halalTag = (t['diet:halal'] || t['halal'] || '').toLowerCase();
  const isMasjid = type === 'masjid';
  return {
    halal_certified:
      isMasjid ? false : halalTag === 'yes' || halalTag === 'only' || /halal/i.test(t.cuisine || ''),
    alcohol_free:
      isMasjid || /no/i.test(t['diet:alcohol'] || '') || (t.alcohol || '') === 'no',
    prayer_space: isMasjid || (t['prayer_room'] || '') === 'yes',
    family_friendly: true, // default; refined later/by editors
  };
}

/**
 * Turn one OSM element into a location record (or null if unusable).
 * @param {object} el   raw Overpass element
 * @param {string} type app category type
 */
export function normalizeElement(el, type) {
  const c = coordsOf(el);
  const t = el.tags || {};
  const name = t.name || t['name:en'];
  if (!c || !name) return null; // need coords + a name to be useful

  return {
    type,
    name_en: t['name:en'] || name,
    name_ar: t['name:ar'] || '', // translation layer fills gaps
    name_es: t['name:es'] || '',
    address: buildAddress(t),
    lat: Number(c.lat.toFixed(6)),
    lng: Number(c.lng.toFixed(6)),
    phone: cleanPhone(t.phone || t['contact:phone']),
    hours_en: t.opening_hours || '',
    hours_ar: '',
    hours_es: '',
    ...flagsFor(type, t),
    discount_code: null,
    discount_offer_en: '',
    discount_offer_ar: '',
    discount_offer_es: '',
    worldcup_special: false,
    source: 'osm',
    osm_id: `${el.type}/${el.id}`, // e.g. "node/123" — stable dedupe key
  };
}

/** Haversine distance in meters. */
function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const normName = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Dedupe records:
 *   1. exact osm_id (within this batch)
 *   2. same normalized name within ~75m (same place tagged twice / node+way)
 * Optionally pass `existing` (already-known records, e.g. hand-curated seed)
 * so OSM rows that duplicate them are dropped.
 */
export function dedupe(records, existing = []) {
  const out = [];
  const seenOsm = new Set();
  const all = () => out.concat(existing);

  for (const r of records) {
    if (r.osm_id && seenOsm.has(r.osm_id)) continue;

    const dup = all().some(
      (e) =>
        normName(e.name_en) === normName(r.name_en) &&
        distanceMeters(e, r) < 75,
    );
    if (dup) continue;

    if (r.osm_id) seenOsm.add(r.osm_id);
    out.push(r);
  }
  return out;
}

/** Normalize + dedupe a full fetchCity() result. */
export function normalizeCity(categories, existing = []) {
  const records = categories.flatMap(({ type, elements }) =>
    elements.map((el) => normalizeElement(el, type)).filter(Boolean),
  );
  return dedupe(records, existing);
}
