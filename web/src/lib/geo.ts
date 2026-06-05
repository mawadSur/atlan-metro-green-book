'use client';

import { useEffect, useState } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Distance {
  miles: number;
  km: number;
}

/** Haversine distance between two coordinates. */
export function haversineDistance(
  from: Coordinates,
  to: Coordinates
): Distance {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = R * c;
  const km = miles * 1.60934;

  return { miles, km };
}

/** Format distance for display. */
export function formatDistance(dist: Distance, lang: 'en' | 'ar' | 'es'): string {
  const milesStr = dist.miles.toFixed(1);
  if (lang === 'ar') {
    return `${milesStr} ميل`;
  }
  if (lang === 'es') {
    return `${milesStr} mi`;
  }
  return `${milesStr} mi`;
}

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
