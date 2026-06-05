'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import PrayerTimes from '@/components/PrayerTimes';
import QiblaCompass from '@/components/QiblaCompass';
import type { Lang, Location } from '@/lib/types';
import { t, LANGS } from '@/i18n/strings';
import { getLocations } from '@/lib/supabase';
import { useUserLocation, haversineDistance, formatDistance } from '@/lib/geo';
import { googleMapsUrl, localized } from '@/lib/display';

function PrayerPageContent() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get('lang') || 'en') as Lang;
  const dir = LANGS.find((l) => l.code === lang)?.dir || 'ltr';

  const { coords: userCoords, usingFallback } = useUserLocation();
  const [nearestPrayerSpaces, setNearestPrayerSpaces] = useState<Location[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);

  useEffect(() => {
    if (!userCoords) return;

    async function loadNearestSpaces() {
      if (!userCoords) return; // Type guard for closure
      setIsLoadingSpaces(true);
      try {
        // Fetch all masjids and prayer_space locations for Atlanta
        const allSpaces = await getLocations('atlanta', {
          types: ['masjid'],
          limit: 100,
        });

        // Filter to only those with prayer_space or type masjid, sort by distance
        const withDistance = allSpaces
          .filter((loc) => loc.prayer_space || loc.type === 'masjid')
          .map((loc) => ({
            loc,
            distance: haversineDistance(userCoords, { lat: loc.lat, lng: loc.lng }),
          }))
          .sort((a, b) => a.distance.miles - b.distance.miles)
          .slice(0, 3); // Top 3 nearest

        setNearestPrayerSpaces(withDistance.map((w) => w.loc));
      } catch (err) {
        console.error('Failed to load nearest prayer spaces:', err);
      } finally {
        setIsLoadingSpaces(false);
      }
    }

    loadNearestSpaces();
  }, [userCoords]);

  return (
    <div className="min-h-dvh bg-stone-50" dir={dir}>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            aria-label={t.back[lang]}
          >
            <ArrowLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{t.prayerTimes[lang]}</h1>
        </div>

        <PrayerTimes lang={lang} />
        <QiblaCompass lang={lang} />

        {/* Nearest Prayer Spaces */}
        {userCoords && !isLoadingSpaces && nearestPrayerSpaces.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-700" />
                <h2 className="text-lg font-semibold text-stone-900">{t.nearestPrayer[lang]}</h2>
              </div>
              {usingFallback && (
                <p className="text-xs text-stone-600 mt-1">{t.locationDenied[lang]}</p>
              )}
            </div>
            <div className="divide-y divide-stone-200">
              {nearestPrayerSpaces.map((loc) => {
                const distance = haversineDistance(userCoords, { lat: loc.lat, lng: loc.lng });
                const name = localized(loc, 'name', lang);
                return (
                  <div key={loc.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-stone-900">{name}</h3>
                        <p className="text-sm text-stone-600">{loc.address}</p>
                      </div>
                      <div className="text-sm text-stone-500 text-right whitespace-nowrap">
                        {formatDistance(distance, lang)} {t.away[lang]}
                      </div>
                    </div>
                    <a
                      href={googleMapsUrl(loc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-teal-700 text-white rounded-lg py-2 min-h-[44px] font-medium hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.98] cursor-pointer motion-safe:transition-all motion-safe:duration-150"
                    >
                      <Navigation size={16} />
                      <span>{t.directions[lang]}</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isLoadingSpaces && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="text-sm text-stone-600">{t.locating[lang]}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrayerPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-stone-50" />}>
      <PrayerPageContent />
    </Suspense>
  );
}
