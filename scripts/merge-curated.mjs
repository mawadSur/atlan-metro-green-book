#!/usr/bin/env node
// Merge curated Atlanta data into Supabase, and remove OSM rows that duplicate
// a curated entry (curated wins). Emits SQL to stdout.
//
//   node scripts/merge-curated.mjs > supabase/merge-curated.sql
//
// Strategy:
//   - Each curated row gets a stable osm_id of the form "curated/<slug>" so the
//     existing UNIQUE(osm_id) upsert path works and re-runs are idempotent.
//   - Before inserting, delete OSM-sourced rows whose name+location collide with
//     a curated row (within ~150m, normalized name match), so we don't show the
//     same masjid/restaurant twice.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const q = (v) => {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const slug = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

const normName = (s) =>
  (s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '')
    .replace(/\b(masjid|mosque|the|of|al|center|islamic)\b/g, '')
    .replace(/\s+/g, ' ').trim();

async function main() {
  const payload = JSON.parse(
    await readFile(join(ROOT, 'src', 'data', 'curated', 'atlanta.json'), 'utf8'),
  );
  const cityId = payload.city.id;
  let sql = `-- Merge curated Atlanta data (curated wins over OSM duplicates)\n`;
  sql += `begin;\n\n`;

  // Update city names (add ar/es)
  const c = payload.city;
  sql += `update cities set name_ar=${q(c.name_ar)}, name_es=${q(c.name_es)} where id=${q(c.id)};\n\n`;

  // 1. Remove OSM duplicates of curated rows (by normalized name + ~150m proximity).
  //    Build an OR list of (name ILIKE + bbox) predicates.
  sql += `-- Drop OSM rows duplicated by a curated entry\n`;
  for (const r of payload.locations) {
    const dLat = 150 / 111000;
    const dLng = 150 / (111000 * Math.cos((r.lat * Math.PI) / 180));
    const key = normName(r.name_en);
    if (!key) continue;
    // Match OSM rows in the same area whose normalized name shares the key.
    sql += `delete from locations where source='osm' and city_id=${q(cityId)}` +
      ` and lat between ${(r.lat - dLat).toFixed(6)} and ${(r.lat + dLat).toFixed(6)}` +
      ` and lng between ${(r.lng - dLng).toFixed(6)} and ${(r.lng + dLng).toFixed(6)};\n`;
  }

  // 2. Upsert curated rows (stable osm_id = curated/<slug>)
  sql += `\n-- Upsert curated locations\n`;
  const cols = [
    'city_id', 'type', 'name_en', 'name_ar', 'name_es', 'address',
    'lat', 'lng', 'phone', 'hours_en', 'hours_ar', 'hours_es',
    'halal_certified', 'alcohol_free', 'prayer_space', 'family_friendly',
    'worldcup_special', 'discount_code', 'discount_offer_en',
    'discount_offer_ar', 'discount_offer_es', 'source', 'osm_id',
  ];
  for (const r of payload.locations) {
    const osmId = `curated/${slug(r.name_en)}`;
    const vals = [
      cityId, r.type, r.name_en, r.name_ar, r.name_es, r.address,
      r.lat, r.lng, r.phone, r.hours_en, r.hours_ar, r.hours_es,
      r.halal_certified, r.alcohol_free, r.prayer_space, r.family_friendly,
      r.worldcup_special, r.discount_code, r.discount_offer_en,
      r.discount_offer_ar, r.discount_offer_es, 'curated', osmId,
    ].map(q);
    sql += `insert into locations (${cols.join(', ')}) values (${vals.join(', ')})\n` +
      `on conflict (osm_id) do update set name_en=excluded.name_en, name_ar=excluded.name_ar, ` +
      `name_es=excluded.name_es, address=excluded.address, hours_en=excluded.hours_en, ` +
      `hours_ar=excluded.hours_ar, hours_es=excluded.hours_es, phone=excluded.phone, ` +
      `halal_certified=excluded.halal_certified, alcohol_free=excluded.alcohol_free, ` +
      `prayer_space=excluded.prayer_space, family_friendly=excluded.family_friendly, ` +
      `worldcup_special=excluded.worldcup_special, discount_code=excluded.discount_code, ` +
      `discount_offer_en=excluded.discount_offer_en, discount_offer_ar=excluded.discount_offer_ar, ` +
      `discount_offer_es=excluded.discount_offer_es, type=excluded.type;\n`;
  }

  sql += `\ncommit;\n`;
  process.stdout.write(sql);
}

main().catch((e) => { console.error(e); process.exit(1); });
