import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { City, Location, LocationType } from './types';

// Native uses EXPO_PUBLIC_* env vars (set in .env locally; pushed to the EAS
// "production" environment for release builds via `eas env:push`). These are
// inlined into the JS bundle at build time.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loud, not cryptic. If a build ships without these (e.g. env vars not set
// in the EAS environment), createClient(undefined, …) used to throw at module
// load and crash the app on launch with no useful message. Surface the real
// cause instead so it's debuggable from the crash log.
if (!url || !anon) {
  throw new Error(
    'Supabase env vars missing: set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY (locally in .env; for builds run ' +
      '`eas env:push <environment> --path .env`).'
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export interface LocationQueryOptions {
  bounds?: { south: number; north: number; west: number; east: number };
  types?: LocationType[];
  limit?: number;
  offset?: number;
}

/** City-scoped location query with optional viewport bounds + pagination. */
export async function getLocations(
  cityId: string,
  options: LocationQueryOptions = {}
): Promise<Location[]> {
  const { bounds, types, limit = 500, offset = 0 } = options;
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
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Location[];
}

export async function getCity(cityId = 'atlanta'): Promise<City | null> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('id', cityId)
    .single();
  if (error) return null;
  return data as City;
}
