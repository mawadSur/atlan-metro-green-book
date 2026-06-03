'use client';

import { Tag } from 'lucide-react';
import type { Location, Lang } from '@/lib/types';
import { typeStyle, localized, typeLabel } from '@/lib/display';
import { t } from '@/i18n/strings';
import ImageThumb from './ImageThumb';

interface LocationCardProps {
  loc: Location;
  lang: Lang;
  onClick: () => void;
}

export default function LocationCard({ loc, lang, onClick }: LocationCardProps) {
  const style = typeStyle(loc.type);
  const name = localized(loc, 'name', lang);

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

        <p className="text-sm text-stone-500 truncate">{loc.address}</p>

        {(loc.halal_certified || loc.prayer_space || loc.alcohol_free || loc.family_friendly) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {loc.halal_certified && (
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded">
                {t.halal[lang]}
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
