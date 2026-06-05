import AppShell from '@/components/AppShell';
import HeroBand from '@/components/landing/HeroBand';
import { getCity, getLocations } from '@/lib/supabase';

/**
 * ISR strategy: cache city + initial locations for 5 minutes.
 * Portal edits propagate within 5 min. Client-side viewport loading
 * (in AppShell) fetches remaining data dynamically as the map moves.
 */
export const revalidate = 300;

export default async function Home() {
  const cityId = 'atlanta';
  const [city, initialLocations] = await Promise.all([
    getCity(cityId),
    // Fetch first 200 locations for initial render (ordered by name)
    getLocations(cityId, { limit: 200 }),
  ]);

  return (
    <>
      <HeroBand lang="en" />
      <AppShell city={city} locations={initialLocations} />
    </>
  );
}
