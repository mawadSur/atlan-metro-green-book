#!/usr/bin/env node
// City onboarding CLI — the "agent" that pulls Muslim businesses for a city
// from OpenStreetMap and writes a ready-to-import data file.
//
// Usage:
//   node scripts/onboard-city.mjs "Atlanta, Georgia, USA" --id atlanta
//   node scripts/onboard-city.mjs "Doha, Qatar" --id doha --merge-seed
//
// Flags:
//   --id <slug>      city id (default: slugified first part of the query)
//   --merge-seed     drop OSM rows that duplicate the hand-curated seed
//   --dry            print summary only; do not write the file
//
// Output: src/data/cities/<id>.json
//
// No API keys required. Set LIBRETRANSLATE_URL to enable AR/ES machine
// translation (otherwise those fields are left blank for editors to fill).

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { geocodeCity, bboxToOverpass, bboxFromRadius } from '../src/onboarding/geocode.mjs';
import { fetchCity, CATEGORIES } from '../src/onboarding/overpass.mjs';
import { normalizeCity } from '../src/onboarding/normalize.mjs';
import { translateAll, translationEnabled } from '../src/onboarding/translate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'src', 'data', 'cities');

function parseArgs(argv) {
  const args = { query: '', id: '', mergeSeed: false, dry: false, radiusKm: 0 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') args.id = argv[++i];
    else if (a === '--radius') args.radiusKm = Number(argv[++i]);
    else if (a === '--merge-seed') args.mergeSeed = true;
    else if (a === '--dry') args.dry = true;
    else rest.push(a);
  }
  args.query = rest.join(' ').trim();
  return args;
}

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-');

async function loadSeed() {
  // The hand-curated Atlanta seed, if present, used for --merge-seed dedupe.
  const seedPath = join(ROOT, 'src', 'data', 'seed.json');
  if (!existsSync(seedPath)) return [];
  try {
    return JSON.parse(await readFile(seedPath, 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  const { query, id, mergeSeed, dry, radiusKm } = parseArgs(process.argv.slice(2));
  if (!query) {
    console.error('Usage: node scripts/onboard-city.mjs "<City, Region, Country>" --id <slug>');
    process.exit(1);
  }
  const cityId = id || slugify(query.split(',')[0]);

  console.log(`\n🟢 Onboarding "${query}" as city id "${cityId}"`);
  console.log(`   Translation: ${translationEnabled ? 'LibreTranslate enabled' : 'OSM tags only (AR/ES blanks for editors)'}\n`);

  // 1. Geocode
  process.stdout.write('1/4 Geocoding (Nominatim)… ');
  const geo = await geocodeCity(query);
  console.log(`✓ ${geo.displayName}`);
  console.log(`    center ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} | country ${geo.country}`);

  // 2. Fetch categories from Overpass
  console.log('2/4 Querying OpenStreetMap (Overpass)…');
  const box = radiusKm > 0 ? bboxFromRadius(geo.lat, geo.lng, radiusKm) : geo.bbox;
  if (radiusKm > 0) console.log(`    using ${radiusKm}km radius around center (metro coverage)`);
  const bbox = bboxToOverpass(box);
  const categories = await fetchCity(bbox, {
    onProgress: (cat, n) => console.log(`    ${cat.label}: ${n} raw`),
  });

  // 3. Normalize + dedupe
  process.stdout.write('3/4 Normalizing + deduping… ');
  const existing = mergeSeed ? await loadSeed() : [];
  const records = normalizeCity(categories, existing);
  console.log(`✓ ${records.length} unique locations`);

  // 4. Translate (best-effort)
  process.stdout.write('4/4 Translating (EN/AR/ES)… ');
  await translateAll(records);
  console.log('✓');

  const byType = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const payload = {
    city: {
      id: cityId,
      name_en: query.split(',')[0].trim(),
      name_ar: '',
      name_es: '',
      country: geo.country,
      center_lat: geo.lat,
      center_lng: geo.lng,
      default_zoom: 11,
      source: 'osm-onboarded',
      generated_from: query,
    },
    counts: byType,
    locations: records,
  };

  console.log('\n— Summary —');
  for (const cat of CATEGORIES) {
    console.log(`  ${cat.type.padEnd(12)} ${byType[cat.type] || 0}`);
  }
  console.log(`  ${'TOTAL'.padEnd(12)} ${records.length}`);

  if (dry) {
    console.log('\n(--dry) No file written.');
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${cityId}.json`);
  await writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Wrote ${outPath}`);
}

main().catch((err) => {
  console.error('\n✗ Onboarding failed:', err.message);
  process.exit(1);
});
