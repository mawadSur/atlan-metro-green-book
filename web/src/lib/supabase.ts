import { createClient } from '@supabase/supabase-js';
import type { City, Location, LocationType } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// In the browser we want the authenticated portal session to survive reloads
// (persist + auto-refresh). During SSR / build there is no `window` and no
// localStorage, so we fall back to a non-persistent, in-memory session to avoid
// crashing. The public read functions below (getLocations etc.) work either way.
const hasWindow = typeof window !== 'undefined';

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: hasWindow,
    autoRefreshToken: hasWindow,
    detectSessionInUrl: hasWindow,
  },
});

export interface LocationQueryOptions {
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  types?: LocationType[];
  limit?: number;
  offset?: number;
}

/**
 * Scalable city-scoped location query with optional viewport bounds,
 * type filtering, and pagination.
 */
export async function getLocations(
  cityId: string,
  options: LocationQueryOptions = {}
): Promise<Location[]> {
  const { bounds, types, limit = 500, offset = 0 } = options;

  let query = supabase
    .from('locations')
    .select('*')
    .eq('city_id', cityId);

  // Viewport bounds — only fetch rows in the visible area
  if (bounds) {
    query = query
      .gte('lat', bounds.south)
      .lte('lat', bounds.north)
      .gte('lng', bounds.west)
      .lte('lng', bounds.east);
  }

  // Type filter
  if (types && types.length > 0) {
    query = query.in('type', types);
  }

  query = query.order('name_en').range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Location[];
}

/**
 * Count total locations for a city, optionally filtered.
 */
export async function getLocationCount(
  cityId: string,
  filters?: { types?: LocationType[] }
): Promise<number> {
  let query = supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('city_id', cityId);

  if (filters?.types && filters.types.length > 0) {
    query = query.in('type', filters.types);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
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
