#!/usr/bin/env node
/**
 * dedupe-masjids.mjs
 *
 * Deduplicates locations across OSM and curated Atlanta datasets.
 * Strategy:
 * - Exact match on osm_id when both present
 * - Fuzzy match on normalized name + haversine proximity (<150m)
 * - Prefer curated records (richer data) but carry over osm_id for provenance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HAVERSINE_THRESHOLD_M = 200; // Increased to catch Al-Farooq (153m apart)
const DRY_RUN = !process.argv.includes('--write');

/**
 * Haversine distance in meters
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Normalize name: lowercase, remove common variations, strip punctuation
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/masjid|mosque|islamic center|islamic centre/gi, '') // remove common keywords
    .replace(/[^\w\s]/g, ' ') // turn punctuation into spaces (preserves word boundaries)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract key words from a name (significant terms only)
 */
function extractKeyWords(name) {
  const normalized = normalizeName(name);
  const stopWords = new Set(['of', 'the', 'a', 'an', 'in', 'at', 'to', 'for', 'and', 'or']);
  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Check if two names are similar enough
 * Strategy: significant overlap in key words (e.g., "al farooq atlanta" vs "farooq atlanta")
 */
function namesMatch(name1, name2) {
  const words1 = extractKeyWords(name1);
  const words2 = extractKeyWords(name2);

  if (words1.length === 0 || words2.length === 0) return false;

  // Count overlapping words
  const set1 = new Set(words1);
  const overlaps = words2.filter(w => set1.has(w)).length;

  // Require at least 2 overlapping words OR majority overlap
  const minOverlap = 2;
  const majorityThreshold = 0.6;

  return overlaps >= minOverlap ||
         (overlaps / Math.min(words1.length, words2.length)) >= majorityThreshold;
}

/**
 * Check if two locations are duplicates
 */
function isDuplicate(locA, locB) {
  // 1. Exact osm_id match (when both have it)
  if (locA.osm_id && locB.osm_id && locA.osm_id === locB.osm_id) {
    return { match: true, reason: 'osm_id exact match' };
  }

  // 2. Fuzzy name + proximity
  const namesSimilar = namesMatch(locA.name_en, locB.name_en);
  const distance = haversine(locA.lat, locA.lng, locB.lat, locB.lng);
  const closeProximity = distance < HAVERSINE_THRESHOLD_M;

  if (namesSimilar && closeProximity) {
    return { match: true, reason: `name match + ${distance.toFixed(0)}m apart` };
  }

  return { match: false };
}

/**
 * Merge two locations: prefer curated, carry over osm_id from OSM
 */
function mergeLocations(curated, osm) {
  return {
    ...curated,
    osm_id: osm.osm_id || curated.osm_id,
    source: curated.source === 'curated' ? 'curated+osm' : curated.source
  };
}

/**
 * Main deduplication logic
 */
function deduplicateAtlanta() {
  const osmPath = path.join(__dirname, '../src/data/cities/atlanta.json');
  const curatedPath = path.join(__dirname, '../src/data/curated/atlanta.json');

  if (!fs.existsSync(osmPath) || !fs.existsSync(curatedPath)) {
    console.error('ERROR: Could not find both Atlanta JSON files.');
    process.exit(1);
  }

  const osmData = JSON.parse(fs.readFileSync(osmPath, 'utf-8'));
  const curatedData = JSON.parse(fs.readFileSync(curatedPath, 'utf-8'));

  const osmLocations = osmData.locations || [];
  const curatedLocations = curatedData.locations || [];

  console.log('\n📊 INPUT DATA:');
  console.log(`   OSM locations: ${osmLocations.length}`);
  console.log(`   Curated locations: ${curatedLocations.length}`);
  console.log(`   Raw total: ${osmLocations.length + curatedLocations.length}\n`);

  // Track which OSM locations have been merged
  const usedOsmIndices = new Set();
  const mergedLocations = [];
  const duplicates = [];

  // Process curated locations first (they are preferred)
  for (const curatedLoc of curatedLocations) {
    let merged = false;

    for (let i = 0; i < osmLocations.length; i++) {
      if (usedOsmIndices.has(i)) continue;

      const osmLoc = osmLocations[i];
      const dupeCheck = isDuplicate(curatedLoc, osmLoc);

      if (dupeCheck.match) {
        const mergedLoc = mergeLocations(curatedLoc, osmLoc);
        mergedLocations.push(mergedLoc);
        usedOsmIndices.add(i);
        merged = true;

        duplicates.push({
          curated: curatedLoc.name_en,
          osm: osmLoc.name_en,
          reason: dupeCheck.reason,
          type: curatedLoc.type
        });

        console.log(`✅ MERGE: "${curatedLoc.name_en}" (curated) + "${osmLoc.name_en}" (OSM)`);
        console.log(`   Reason: ${dupeCheck.reason}`);
        console.log(`   Type: ${curatedLoc.type}\n`);
        break;
      }
    }

    if (!merged) {
      mergedLocations.push(curatedLoc);
    }
  }

  // Add remaining OSM locations that weren't matched
  for (let i = 0; i < osmLocations.length; i++) {
    if (!usedOsmIndices.has(i)) {
      mergedLocations.push(osmLocations[i]);
    }
  }

  // Count by type
  const countsByType = {};
  for (const loc of mergedLocations) {
    countsByType[loc.type] = (countsByType[loc.type] || 0) + 1;
  }

  const masjidDuplicateCount = duplicates.filter(d => d.type === 'masjid').length;

  console.log('\n📈 DEDUPLICATION RESULTS:');
  console.log(`   Total duplicates found: ${duplicates.length}`);
  console.log(`   Masjid duplicates: ${masjidDuplicateCount}`);
  console.log(`   Distinct locations: ${mergedLocations.length}\n`);

  console.log('📋 COUNTS BY TYPE:');
  for (const [type, count] of Object.entries(countsByType).sort()) {
    console.log(`   ${type}: ${count}`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE: No files written.');
    console.log('   Run with --write to create /Users/mawad/Desktop/green/src/data/atlanta-merged.json\n');
  } else {
    const outputPath = path.join(__dirname, '../src/data/atlanta-merged.json');
    const mergedData = {
      city: {
        ...curatedData.city,
        source: 'curated+osm-merged'
      },
      counts: countsByType,
      locations: mergedLocations.sort((a, b) => a.type.localeCompare(b.type) || a.name_en.localeCompare(b.name_en))
    };

    fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf-8');
    console.log(`\n✅ Written merged dataset to: ${outputPath}\n`);
  }

  return {
    totalDistinct: mergedLocations.length,
    duplicateCount: duplicates.length,
    masjidDuplicates: masjidDuplicateCount,
    countsByType
  };
}

deduplicateAtlanta();
