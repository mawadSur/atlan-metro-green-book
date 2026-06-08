'use client';

import { useEffect, useState } from 'react';
import { Sunrise, Sun, CloudSun, Sunset, Moon, Clock } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { t } from '@/i18n/strings';
import {
  computePrayerTimes,
  nextPrayerName,
  type ComputedPrayerTimes,
} from '@/lib/prayer';

interface PrayerTimesProps {
  lang: Lang;
}

interface LocationState {
  coords: { lat: number; lng: number };
  usingFallback: boolean;
}

type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'none';

const ATLANTA_COORDS = { lat: 33.7545, lng: -84.3898 };

const localeFor = (lang: Lang): string => {
  if (lang === 'ar') return 'ar';
  if (lang === 'es') return 'es-ES';
  return 'en-US';
};

export default function PrayerTimes({ lang }: PrayerTimesProps) {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [prayers, setPrayers] = useState<ComputedPrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerName | null>(null);
  const [now, setNow] = useState(new Date());

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
          setLocation({ coords: ATLANTA_COORDS, usingFallback: true });
        }
      );
    } else {
      setLocation({ coords: ATLANTA_COORDS, usingFallback: true });
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    const prayerTimes = computePrayerTimes(
      location.coords.lat,
      location.coords.lng,
      new Date()
    );
    setPrayers(prayerTimes);
    setNextPrayer(nextPrayerName(prayerTimes));
  }, [location]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      if (prayers) {
        setNextPrayer(nextPrayerName(prayers));
      }
    }, 10000); // Update every 10s
    return () => clearInterval(timer);
  }, [prayers]);

  if (!location || !prayers) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-stone-900">{t.prayerTimes[lang]}</h2>
        </div>
        <div className="text-sm text-stone-600">{t.locating[lang]}</div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 bg-stone-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const prayerList: Array<{ key: PrayerName; label: string; time: Date; icon: React.ReactNode }> = [
    { key: 'fajr', label: t.fajr[lang], time: prayers.fajr, icon: <Sunrise className="w-5 h-5" /> },
    { key: 'sunrise', label: t.sunrise[lang], time: prayers.sunrise, icon: <Sunrise className="w-5 h-5" /> },
    { key: 'dhuhr', label: t.dhuhr[lang], time: prayers.dhuhr, icon: <Sun className="w-5 h-5" /> },
    { key: 'asr', label: t.asr[lang], time: prayers.asr, icon: <CloudSun className="w-5 h-5" /> },
    { key: 'maghrib', label: t.maghrib[lang], time: prayers.maghrib, icon: <Sunset className="w-5 h-5" /> },
    { key: 'isha', label: t.isha[lang], time: prayers.isha, icon: <Moon className="w-5 h-5" /> },
  ];

  const getTimeUntil = (time: Date): string => {
    const diff = time.getTime() - now.getTime();
    if (diff <= 0) return '';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-stone-900">{t.prayerTimes[lang]}</h2>
        </div>
        {location.usingFallback && (
          <p className="text-xs text-stone-600 mt-1">{t.locationDenied[lang]}</p>
        )}
      </div>
      <div className="divide-y divide-stone-200">
        {prayerList.map(({ key, label, time, icon }) => {
          const isNext = nextPrayer === key;
          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 motion-safe:transition-colors ${
                isNext ? 'bg-teal-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={isNext ? 'text-teal-700' : 'text-stone-600'}>{icon}</div>
                <div>
                  <div className={`font-medium ${isNext ? 'text-teal-700' : 'text-stone-900'}`}>
                    {label}
                  </div>
                  {isNext && (
                    <div className="text-xs text-teal-600 font-medium">
                      {t.nextPrayer[lang]} · {getTimeUntil(time)}
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-lg font-semibold tabular-nums ${isNext ? 'text-teal-700' : 'text-stone-900'}`}>
                {time.toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
