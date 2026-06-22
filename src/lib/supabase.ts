import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { City, Location, LocationType } from './types';
import seedData from '../data/atlanta-merged.json';

// Native uses EXPO_PUBLIC_* env vars (set in .env locally; pushed to the EAS
// "production" environment for release builds via `eas env:push`). These are
// inlined into the JS bundle at build time.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// NEVER throw at module load. supabase.ts is imported transitively at launch
// (push.ts, useFavorites, the home tab), so a top-level throw here white-screens
// the app before any UI renders — exactly the kind of "app exhibited a bug"
// failure that gets a build rejected (Guideline 2.1). If the env vars are
// missing we degrade to the bundled offline seed instead of crashing, and
// getLocations() short-circuits straight to that seed.
export const hasSupabaseCreds = !!(url && anon);
if (!hasSupabaseCreds) {
  console.warn(
    'Supabase env vars missing (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY); ' +
      'running in offline mode with bundled seed data. For builds run ' +
      '`eas env:push <environment> --path .env`.'
  );
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anon ?? 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// How long to wait on the live backend before falling back to the bundled seed.
// Bounds the worst case so the reviewer never sees an infinite spinner if the
// backend is slow/recovering (it went fully NXDOMAIN on 2026-06-11).
const QUERY_TIMEOUT_MS = 7000;

// --- Offline seed fallback ---------------------------------------------------
// The app ships with a bundled snapshot of every Atlanta place
// (src/data/atlanta-merged.json). The seed records are the raw source rows and
// lack the DB-generated fields (id, city_id, halal_status, verified_*,
// image_url, source, osm_id), so normalize them into the Location shape the UI
// expects. This guarantees the map, list, search, filters, and toggle ALWAYS
// render with real data — even with no network, a down backend, or missing env.
let SEED_CACHE: Location[] | null = null;

function normalizeSeed(): Location[] {
  const raw: any[] = ((seedData as any)?.locations as any[]) ?? [];
  return raw.map((r, i): Location => ({
    id: r.id ?? `seed-atlanta-${i}`,
    city_id: 'atlanta',
    type: r.type as LocationType,
    name_en: r.name_en ?? '',
    name_ar: r.name_ar ?? '',
    name_es: r.name_es ?? '',
    address: r.address ?? '',
    lat: r.lat,
    lng: r.lng,
    phone: r.phone ?? '',
    hours_en: r.hours_en ?? '',
    hours_ar: r.hours_ar ?? '',
    hours_es: r.hours_es ?? '',
    halal_certified: !!r.halal_certified,
    halal_status: r.halal_certified ? 'community-listed' : 'unverified',
    verified_by: '',
    verified_at: null,
    alcohol_free: !!r.alcohol_free,
    prayer_space: !!r.prayer_space,
    family_friendly: !!r.family_friendly,
    worldcup_special: !!r.worldcup_special,
    discount_code: r.discount_code ?? null,
    discount_offer_en: r.discount_offer_en ?? '',
    discount_offer_ar: r.discount_offer_ar ?? '',
    discount_offer_es: r.discount_offer_es ?? '',
    image_url: r.image_url ?? '',
    source: r.source ?? 'seed',
    osm_id: r.osm_id ?? null,
  }));
}

/**
 * Bundled offline locations, filtered to mirror the live query semantics
 * (bounds / types / range). Returns [] for any city other than Atlanta.
 */
export function getSeedLocations(
  cityId: string,
  options: LocationQueryOptions = {}
): Location[] {
  if (cityId !== 'atlanta') return [];
  if (!SEED_CACHE) SEED_CACHE = normalizeSeed();
  const { bounds, types, limit = 500, offset = 0 } = options;
  let rows = SEED_CACHE;
  if (bounds) {
    rows = rows.filter(
      (l) =>
        l.lat >= bounds.south &&
        l.lat <= bounds.north &&
        l.lng >= bounds.west &&
        l.lng <= bounds.east
    );
  }
  if (types && types.length > 0) rows = rows.filter((l) => types.includes(l.type));
  rows = [...rows].sort((a, b) => a.name_en.localeCompare(b.name_en));
  return rows.slice(offset, offset + limit);
}

export interface LocationQueryOptions {
  bounds?: { south: number; north: number; west: number; east: number };
  types?: LocationType[];
  limit?: number;
  offset?: number;
}

/**
 * City-scoped location query with optional viewport bounds + pagination.
 *
 * Never throws and never returns empty for Atlanta: if the env vars are
 * missing, the backend is unreachable, the request times out, or the live
 * table comes back empty, it falls back to the bundled offline seed so the
 * home screen's map/list/search/filters always have data to operate on.
 */
export async function getLocations(
  cityId: string,
  options: LocationQueryOptions = {}
): Promise<Location[]> {
  const { bounds, types, limit = 500, offset = 0 } = options;

  // No creds → don't even attempt a doomed network round-trip; use the seed.
  if (!hasSupabaseCreds) return getSeedLocations(cityId, options);

  try {
    let query = supabase.from('locations').select('*').eq('city_id', cityId);
    if (bounds) {
      query = query
        .gte('lat', bounds.south)
        .lte('lat', bounds.north)
        .gte('lng', bounds.west)
        .lte('lng', bounds.east);
    }
    if (types && types.length > 0) query = query.in('type', types);
    query = query.order('name_en').range(offset, offset + limit - 1);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('getLocations timed out')), QUERY_TIMEOUT_MS)
    );
    const { data, error } = (await Promise.race([query, timeout])) as {
      data: Location[] | null;
      error: unknown;
    };
    if (error) throw error;

    const rows = (data ?? []) as Location[];
    // An empty result on a full city fetch means the backend is unseeded or
    // RLS-blocked — fall back to bundled data rather than show an empty map.
    if (rows.length === 0 && !bounds && (!types || types.length === 0)) {
      return getSeedLocations(cityId, options);
    }
    return rows;
  } catch (err) {
    console.warn('getLocations: live query failed, using offline seed:', err);
    return getSeedLocations(cityId, options);
  }
}

/**
 * Fetch a single location by id, with offline fallback. Seed records use
 * synthetic ids (`seed-atlanta-N`) that don't exist in the backend, so when the
 * live lookup fails (offline / down / timeout / not found) we resolve from the
 * bundled seed instead — keeping list→detail navigation working with no network.
 */
export async function getLocationById(id: string): Promise<Location | null> {
  const fromSeed = () =>
    getSeedLocations('atlanta').find((l) => l.id === id) ?? null;

  if (!hasSupabaseCreds) return fromSeed();

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('getLocationById timed out')), QUERY_TIMEOUT_MS)
    );
    const query = supabase.from('locations').select('*').eq('id', id).single();
    const { data, error } = (await Promise.race([query, timeout])) as {
      data: Location | null;
      error: unknown;
    };
    if (error) throw error;
    return (data as Location | null) ?? fromSeed();
  } catch (err) {
    console.warn('getLocationById: live lookup failed, trying offline seed:', err);
    return fromSeed();
  }
}

export async function getCity(cityId = 'atlanta'): Promise<City | null> {
  if (!hasSupabaseCreds) return null;
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('id', cityId)
    .single();
  if (error) return null;
  return data as City;
}
