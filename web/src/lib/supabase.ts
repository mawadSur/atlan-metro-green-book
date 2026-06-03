import { createClient } from '@supabase/supabase-js';
import type { City, Location } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

/** All locations for a city, ordered so mosques surface first. */
export async function getLocations(cityId = 'atlanta'): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('city_id', cityId)
    .order('name_en');
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
