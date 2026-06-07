'use client';

import { useEffect } from 'react';
import { Navigation, Phone, X, Tag } from 'lucide-react';
import type { Location, Lang } from '@/lib/types';
import { typeStyle, localized, typeLabel, googleMapsUrl, discountOffer, halalLabel } from '@/lib/display';
import { t } from '@/i18n/strings';
import ImageThumb from './ImageThumb';
import type { Coordinates } from '@/lib/geo';
import { haversineDistance, formatDistance } from '@/lib/geo';

interface LocationDetailProps {
  loc: Location | null;
  lang: Lang;
  onClose: () => void;
  userCoords?: Coordinates | null;
}

export default function LocationDetail({ loc, lang, onClose, userCoords }: LocationDetailProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!loc) return null;

  const style = typeStyle(loc.type);
  const name = localized(loc, 'name', lang);
  const hours = localized(loc, 'hours', lang);
  const offer = discountOffer(loc, lang);
  const halal = halalLabel(loc, lang);

  // Calculate distance if user coords available
  const distance = userCoords
    ? haversineDistance(userCoords, { lat: loc.lat, lng: loc.lng })
    : null;

  const features = [
    { flag: halal.tone === 'verified', label: halal.text, style: 'bg-green-100 text-green-800 font-medium' },
    { flag: halal.tone === 'listed', label: halal.text, style: 'bg-amber-50 text-amber-700' },
    { flag: loc.prayer_space, label: t.prayer_space[lang], style: 'bg-stone-100 text-stone-700' },
    { flag: loc.alcohol_free, label: t.alcohol_free[lang], style: 'bg-stone-100 text-stone-700' },
    { flag: loc.family_friendly, label: t.family_friendly[lang], style: 'bg-stone-100 text-stone-700' },
  ].filter(f => f.flag);

  return (
    <div
      // Mobile: dimmed bottom sheet (tap-outside closes).
      // Desktop (sm+): right-docked side panel with NO dimming backdrop and
      // pointer-events-none on the wrapper, so the map stays visible + clickable
      // and you actually SEE it fly to the place you tapped. (Closing on desktop
      // is via the X button or Escape — there is no full-screen click-catcher.)
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 sm:items-stretch sm:justify-end sm:bg-transparent sm:pointer-events-none"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl sm:rounded-none sm:max-w-none sm:w-[400px] sm:h-full sm:max-h-none sm:pointer-events-auto motion-safe:animate-in motion-safe:slide-in-from-bottom sm:motion-safe:slide-in-from-right motion-safe:duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image with Close Button */}
        <div className="relative">
          <ImageThumb loc={loc} className="h-44 w-full rounded-t-2xl" />
          <button
            onClick={onClose}
            aria-label={t.close[lang]}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] cursor-pointer motion-safe:transition-all motion-safe:duration-150"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3">
          {/* Type Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: style.pin }}
          >
            <span>{style.icon}</span>
            <span>{typeLabel(loc.type, lang)}</span>
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold text-stone-900">{name}</h2>

          {/* Address */}
          {loc.address && (
            <p className="text-stone-600 text-sm">{loc.address}</p>
          )}

          {/* Distance */}
          {distance && (
            <p className="text-stone-500 text-sm">
              {formatDistance(distance, lang)} {t.away[lang]}
            </p>
          )}

          {/* Hours */}
          {hours && (
            <div className="text-sm">
              <span className="text-stone-500 font-medium">{t.hours[lang]}: </span>
              <span className="text-stone-700">{hours}</span>
            </div>
          )}

          {/* Feature Chips */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {features.map((feature, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-xs ${feature.style}`}
                >
                  {feature.label}
                </span>
              ))}
            </div>
          )}

          {/* Discount Offer */}
          {loc.discount_code && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-teal-900 font-semibold text-sm">
                <Tag size={16} />
                <span>{t.offer[lang]}</span>
              </div>
              <p className="text-teal-800 text-sm">{offer}</p>
              <div className="inline-block px-3 py-1 bg-white rounded-full border border-teal-300">
                <code className="text-teal-900 font-mono text-sm font-bold">
                  {loc.discount_code}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex gap-2">
          <a
            href={googleMapsUrl(loc)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-teal-700 text-white rounded-xl py-3 min-h-[44px] flex items-center justify-center gap-2 font-medium hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.98] cursor-pointer motion-safe:transition-all motion-safe:duration-150"
          >
            <Navigation size={18} />
            <span>{t.directions[lang]}</span>
          </a>
          {loc.phone && (
            <a
              href={`tel:${loc.phone}`}
              className="px-6 py-3 min-h-[44px] border-2 border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 motion-safe:transition-all motion-safe:duration-150"
            >
              <Phone size={18} />
              <span>{t.call[lang]}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
