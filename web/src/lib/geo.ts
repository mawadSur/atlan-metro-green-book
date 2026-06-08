'use client';

import { useEffect, useState } from 'react';
import type { Coordinates } from './distance';

// Re-export the pure distance helpers so existing imports
// (e.g. LocationCard, LocationDetail) keep working unchanged.
// The pure logic now lives in ./distance (no 'use client' directive) so it
// can also be imported from server components.
export type { Coordinates, Distance } from './distance';
export { haversineDistance, formatDistance } from './distance';

interface UserLocation {
  coords: Coordinates | null;
  usingFallback: boolean;
}

const ATLANTA_FALLBACK: Coordinates = { lat: 33.7545, lng: -84.3898 };

/**
 * React hook that mirrors PrayerTimes.tsx geolocation pattern.
 * Returns user location or Atlanta fallback with a flag.
 */
export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    coords: null,
    usingFallback: false,
  });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            usingFallback: false,
          });
        },
        () => {
          // Permission denied or error — use Atlanta fallback
          setLocation({ coords: ATLANTA_FALLBACK, usingFallback: true });
        }
      );
    } else {
      setLocation({ coords: ATLANTA_FALLBACK, usingFallback: true });
    }
  }, []);

  return location;
}
