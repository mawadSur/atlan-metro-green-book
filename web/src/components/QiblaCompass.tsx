'use client';

import { useEffect, useState, useRef } from 'react';
import { Coordinates, Qibla as qibla } from 'adhan';
import { Compass, Navigation, RotateCw } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { t } from '@/i18n/strings';
import {
  type CalibrationState,
  type HeadingData,
  HeadingFilter,
  extractHeading,
  computeCalibrationState,
  getAccuracyLevel,
  getCardinalDirection,
} from '@/lib/compass';

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
  const [headingData, setHeadingData] = useState<HeadingData | null>(null);
  const [smoothedHeading, setSmoothedHeading] = useState<number | null>(null);
  const [compassAvailable, setCompassAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [calibrationState, setCalibrationState] = useState<CalibrationState>('idle');

  const filterRef = useRef(new HeadingFilter(5));
  const lowAccuracyCountRef = useRef(0);
  const prefersReducedMotion = useRef(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Get geolocation and compute Qibla
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = new Coordinates(pos.coords.latitude, pos.coords.longitude);
          setLocation({ coords, usingFallback: false });
          const bearing = qibla(coords);
          setQiblaBearing(bearing);
        },
        () => {
          setLocation({ coords: ATLANTA_COORDS, usingFallback: true });
          const bearing = qibla(ATLANTA_COORDS);
          setQiblaBearing(bearing);
        }
      );
    } else {
      setLocation({ coords: ATLANTA_COORDS, usingFallback: true });
      const bearing = qibla(ATLANTA_COORDS);
      setQiblaBearing(bearing);
    }

    // Feature-detect compass
    if ('DeviceOrientationEvent' in window) {
      setCompassAvailable(true);
    }
  }, []);

  // Request permission (iOS 13+)
  const requestCompassPermission = async () => {
    setCalibrationState('requesting');
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      'requestPermission' in DeviceOrientationEvent
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
        } else {
          setCalibrationState('unavailable');
        }
      } catch (error) {
        console.error('Permission request failed', error);
        setCalibrationState('unavailable');
      }
    } else {
      setPermissionGranted(true);
    }
  };

  // Start listening to orientation events
  useEffect(() => {
    if (!permissionGranted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const heading = extractHeading(event);
      if (heading) {
        setHeadingData(heading);
        const smoothed = filterRef.current.add(heading.heading);
        setSmoothedHeading(smoothed);

        // Track calibration state
        const newState = computeCalibrationState(heading, permissionGranted, compassAvailable);
        if (newState === 'calibrating') {
          const accuracy = getAccuracyLevel(heading.accuracy);
          if (accuracy === 'low') {
            lowAccuracyCountRef.current += 1;
            if (lowAccuracyCountRef.current > 20) {
              // Persistent low accuracy
              setCalibrationState('needsRecalibration');
            } else {
              setCalibrationState('calibrating');
            }
          } else {
            lowAccuracyCountRef.current = 0;
            setCalibrationState('calibrated');
          }
        } else {
          setCalibrationState(newState);
        }
      }
    };

    // Prefer deviceorientationabsolute, fallback to deviceorientation
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, compassAvailable]);

  const handleRecalibrate = () => {
    filterRef.current.reset();
    lowAccuracyCountRef.current = 0;
    setCalibrationState('calibrating');
  };

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

  const accuracyLevel = headingData ? getAccuracyLevel(headingData.accuracy) : null;
  const isCalibrated = calibrationState === 'calibrated';
  const isCalibrating = calibrationState === 'calibrating';
  const needsRecalibration = calibrationState === 'needsRecalibration';
  const notAbsolute = headingData && !headingData.absolute;

  const compassRotation = smoothedHeading !== null && isCalibrated ? -smoothedHeading : 0;
  const pointerRotation = qiblaBearing;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-stone-900">{t.qiblaDirection[lang]}</h2>
          </div>
          {accuracyLevel && (
            <div
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                accuracyLevel === 'high'
                  ? 'bg-green-100 text-green-700'
                  : accuracyLevel === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {accuracyLevel === 'high'
                ? t.accuracyHigh[lang]
                : accuracyLevel === 'medium'
                ? t.accuracyMedium[lang]
                : t.accuracyLow[lang]}
            </div>
          )}
        </div>
        {location.usingFallback && (
          <p className="text-xs text-stone-600 mt-1">{t.locationDenied[lang]}</p>
        )}
      </div>

      <div className="p-6 flex flex-col items-center gap-4">
        <div className="relative w-64 h-64">
          {/* Compass dial */}
          <div
            className={`absolute inset-0 rounded-full border-4 border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100 ${
              prefersReducedMotion.current ? '' : 'motion-safe:transition-transform motion-safe:duration-300'
            }`}
            style={{
              transform:
                smoothedHeading !== null && isCalibrated ? `rotate(${compassRotation}deg)` : 'none',
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
                    transform: `rotate(${-i * 90 - (isCalibrated ? compassRotation : 0)}deg)`,
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
                <div key={angle} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                  <div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 ${
                      angle % 90 === 0 ? 'w-0.5 h-4 bg-stone-400' : 'w-px h-2 bg-stone-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Qibla pointer (only active when calibrated) */}
          <div
            className={`absolute inset-0 flex items-center justify-center ${
              prefersReducedMotion.current ? '' : 'motion-safe:transition-transform motion-safe:duration-300'
            }`}
            style={{
              transform: isCalibrated && smoothedHeading !== null
                ? `rotate(${pointerRotation - smoothedHeading}deg)`
                : `rotate(${pointerRotation}deg)`,
              opacity: isCalibrated ? 1 : 0.4,
            }}
          >
            <Navigation className="w-12 h-12 text-teal-700 fill-teal-700 -translate-y-8" />
          </div>

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-teal-700 shadow-lg" />
          </div>
        </div>

        <div className="text-center space-y-3 w-full max-w-xs">
          <div className="text-2xl font-bold text-teal-700 tabular-nums">
            {Math.round(qiblaBearing)}° {getCardinalDirection(qiblaBearing)}
          </div>

          {/* Permission request */}
          {compassAvailable && !permissionGranted && calibrationState === 'idle' && (
            <button
              onClick={requestCompassPermission}
              className="px-4 py-3 bg-teal-700 text-white rounded-lg font-medium motion-safe:transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer w-full"
              style={{ minHeight: '44px' }}
            >
              {t.enableCompass[lang]}
            </button>
          )}

          {/* Calibration instructions */}
          {(isCalibrating || needsRecalibration) && !notAbsolute && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <RotateCw className="w-5 h-5 text-amber-700 animate-spin" />
                <span className="text-sm font-medium text-amber-900">
                  {isCalibrating ? t.calibrating[lang] : t.recalibrate[lang]}
                </span>
              </div>
              <p className="text-xs text-amber-700">{t.calibrateHint[lang]}</p>
            </div>
          )}

          {/* Non-absolute heading warning */}
          {notAbsolute && permissionGranted && (
            <div className="bg-stone-100 border border-stone-200 rounded-lg p-3 space-y-1">
              <p className="text-xs text-stone-700 font-medium">{t.noAbsoluteHeading[lang]}</p>
              <p className="text-xs text-stone-600">{t.staticBearingOnly[lang]}</p>
            </div>
          )}

          {/* Recalibrate button (when calibrated or needs recalibration) */}
          {(isCalibrated || needsRecalibration) && !notAbsolute && (
            <button
              onClick={handleRecalibrate}
              className="px-3 py-2 bg-stone-100 text-stone-700 rounded-lg font-medium motion-safe:transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer w-full flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <RotateCw className="w-4 h-4" />
              {t.recalibrate[lang]}
            </button>
          )}

          {/* Unavailable message */}
          {!compassAvailable && <p className="text-xs text-stone-600">{t.compassNotAvailable[lang]}</p>}
        </div>
      </div>
    </div>
  );
}
