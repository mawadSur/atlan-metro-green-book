'use client';

import { useEffect, useState } from 'react';
import { Coordinates, Qibla as qibla } from 'adhan';
import { Compass, Navigation } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { t } from '@/i18n/strings';

interface QiblaCompassProps {
  lang: Lang;
}

interface LocationState {
  coords: Coordinates;
  usingFallback: boolean;
}

const ATLANTA_COORDS = new Coordinates(33.7545, -84.3898);

export default function QiblaCompass({ lang }: QiblaCompassProps) {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassAvailable, setCompassAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = new Coordinates(pos.coords.latitude, pos.coords.longitude);
          setLocation({ coords, usingFallback: false });
          const qiblaBearing = qibla(coords);
          setQiblaBearing(qiblaBearing);
        },
        () => {
          setLocation({ coords: ATLANTA_COORDS, usingFallback: true });
          const qiblaBearing = qibla(ATLANTA_COORDS);
          setQiblaBearing(qiblaBearing);
        }
      );
    } else {
      setLocation({ coords: ATLANTA_COORDS, usingFallback: true });
      const qiblaBearing = qibla(ATLANTA_COORDS);
      setQiblaBearing(qiblaBearing);
    }

    if ('DeviceOrientationEvent' in window) {
      setCompassAvailable(true);
    }
  }, []);

  const requestCompassPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          startCompass();
        }
      } catch (error) {
        console.error('Permission request failed', error);
      }
    } else {
      setPermissionGranted(true);
      startCompass();
    }
  };

  const startCompass = () => {
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientationFallback);
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.absolute && event.alpha !== null) {
      setHeading(event.alpha);
    }
  };

  const handleOrientationFallback = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null && heading === null) {
      setHeading(360 - event.alpha);
    }
  };

  useEffect(() => {
    if (permissionGranted) {
      startCompass();
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientationFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted]);

  if (!location || qiblaBearing === null) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-stone-900">{t.qiblaDirection[lang]}</h2>
        </div>
        <div className="text-sm text-stone-600">{t.locating[lang]}</div>
        <div className="h-64 bg-stone-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  const compassRotation = heading !== null ? -heading : 0;
  const pointerRotation = qiblaBearing;
  const totalRotation = compassRotation + pointerRotation;

  const getCardinalDirection = (deg: number): string => {
    const normalized = ((deg % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'N';
    if (normalized >= 22.5 && normalized < 67.5) return 'NE';
    if (normalized >= 67.5 && normalized < 112.5) return 'E';
    if (normalized >= 112.5 && normalized < 157.5) return 'SE';
    if (normalized >= 157.5 && normalized < 202.5) return 'S';
    if (normalized >= 202.5 && normalized < 247.5) return 'SW';
    if (normalized >= 247.5 && normalized < 292.5) return 'W';
    return 'NW';
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-stone-900">{t.qiblaDirection[lang]}</h2>
        </div>
        {location.usingFallback && (
          <p className="text-xs text-stone-600 mt-1">{t.locationDenied[lang]}</p>
        )}
      </div>
      <div className="p-6 flex flex-col items-center gap-4">
        <div className="relative w-64 h-64">
          {/* Compass dial */}
          <div
            className="absolute inset-0 rounded-full border-4 border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100 motion-safe:transition-transform motion-safe:duration-300"
            style={{
              transform: heading !== null ? `rotate(${compassRotation}deg)` : 'none',
            }}
          >
            {/* Cardinal marks */}
            {['N', 'E', 'S', 'W'].map((dir, i) => (
              <div
                key={dir}
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${i * 90}deg)` }}
              >
                <div
                  className="absolute"
                  style={{
                    top: '8px',
                    transform: `rotate(${-i * 90 - compassRotation}deg)`,
                  }}
                >
                  <span className={`text-sm font-bold ${dir === 'N' ? 'text-teal-700' : 'text-stone-600'}`}>
                    {dir}
                  </span>
                </div>
              </div>
            ))}
            {/* Degree marks */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = i * 10;
              return (
                <div
                  key={angle}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 ${
                      angle % 90 === 0 ? 'w-0.5 h-4 bg-stone-400' : 'w-px h-2 bg-stone-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Qibla pointer */}
          <div
            className="absolute inset-0 flex items-center justify-center motion-safe:transition-transform motion-safe:duration-300"
            style={{
              transform: `rotate(${totalRotation}deg)`,
            }}
          >
            <Navigation className="w-12 h-12 text-teal-700 fill-teal-700 -translate-y-8" />
          </div>

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-teal-700 shadow-lg" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-teal-700 tabular-nums">
            {Math.round(qiblaBearing)}° {getCardinalDirection(qiblaBearing)}
          </div>
          {compassAvailable && !permissionGranted && (
            <button
              onClick={requestCompassPermission}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg font-medium motion-safe:transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {t.enableCompass[lang]}
            </button>
          )}
          {!compassAvailable && (
            <p className="text-xs text-stone-600">{t.compassNotAvailable[lang]}</p>
          )}
        </div>
      </div>
    </div>
  );
}
