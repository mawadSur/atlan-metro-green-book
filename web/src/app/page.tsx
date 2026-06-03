import AppShell from '@/components/AppShell';
import { getCity, getLocations } from '@/lib/supabase';

// Always fetch fresh from Supabase (data is edited via the business portal).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [city, locations] = await Promise.all([
    getCity('atlanta'),
    getLocations('atlanta'),
  ]);

  return <AppShell city={city} locations={locations} />;
}
