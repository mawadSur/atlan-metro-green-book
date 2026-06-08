'use client';

import type { ReactNode } from 'react';
import { Tag } from 'lucide-react';
import type { Location, Lang } from '@/lib/types';
import { typeStyle, localized, typeLabel, halalLabel } from '@/lib/display';
import { t } from '@/i18n/strings';
import ImageThumb from './ImageThumb';
import type { Coordinates } from '@/lib/geo';
import { haversineDistance, formatDistance } from '@/lib/geo';

interface LocationCardProps {
  loc: Location;
  lang: Lang;
  onClick: () => void;
  userCoords?: Coordinates | null;
  /**
   * Optional pre-formatted distance/transit label (e.g. '~11-13 min walk').
   * When provided it overrides the geolocation-derived distance — used by the
   * match page to show HONEST curated walk/transit times instead of a live
   * haversine from the user. Pair with `distanceIcon` so color is never the
   * only signal.
   */
  distanceLabel?: string;
  /** Optional lucide icon element rendered before `distanceLabel`. */
  distanceIcon?: ReactNode;
  /**
   * Optional editorial note line (e.g. provenance / alcohol / vegan caveat).
   * Rendered under the address; redundant text so meaning never relies on color.
   */
  note?: string;
}

export default function LocationCard({
  loc,
  lang,
  onClick,
  userCoords,
  distanceLabel,
  distanceIcon,
  note,
}: LocationCardProps) {
  const style = typeStyle(loc.type);
  const name = localized(loc, 'name', lang);
  const halal = halalLabel(loc, lang);

  // An explicit curated label wins over a live geolocation distance.
  const distance =
    !distanceLabel && userCoords
      ? haversineDistance(userCoords, { lat: loc.lat, lng: loc.lng })
      : null;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white border border-stone-200 overflow-hidden min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 text-start motion-safe:hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:transition-all motion-safe:duration-200"
      type="button"
    >
      <ImageThumb loc={loc} className="h-32 w-full rounded-t-2xl" />

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-900 truncate flex-1">{name}</h3>
          {loc.discount_code && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center gap-1">
              <Tag size={12} />
              <span>{t.offer[lang]}</span>
            </span>
          )}
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${style.from}15`,
            color: style.from,
          }}
        >
          <span>{style.icon}</span>
          <span>{typeLabel(loc.type, lang)}</span>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-stone-500 truncate">{loc.address}</p>
          {distanceLabel ? (
            <p className="text-xs text-stone-600 flex items-center gap-1">
              {distanceIcon}
              <span>{distanceLabel}</span>
            </p>
          ) : (
            distance && (
              <p className="text-xs text-stone-400">
                {formatDistance(distance, lang)} {t.away[lang]}
              </p>
            )
          )}
          {note && <p className="text-xs text-stone-500">{note}</p>}
        </div>

        {(halal.tone !== 'none' || loc.prayer_space || loc.alcohol_free || loc.family_friendly) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {halal.tone === 'verified' && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded font-medium">
                {halal.text}
              </span>
            )}
            {halal.tone === 'listed' && (
              <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded">
                {halal.text}
              </span>
            )}
            {loc.prayer_space && (
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded">
                {t.prayer_space[lang]}
              </span>
            )}
            {loc.alcohol_free && (
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded">
                {t.alcohol_free[lang]}
              </span>
            )}
            {loc.family_friendly && (
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded">
                {t.family_friendly[lang]}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
