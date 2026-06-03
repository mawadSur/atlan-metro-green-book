'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { Filters, Lang } from '@/lib/types';
import { t } from '@/i18n/strings';

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  lang: Lang;
}

export default function FilterBar({ filters, onChange, lang }: FilterBarProps) {
  const chips: Array<{ key: keyof Filters; label: string }> = [
    { key: 'halal_certified', label: t.halal[lang] },
    { key: 'prayer_space', label: t.prayer_space[lang] },
    { key: 'alcohol_free', label: t.alcohol_free[lang] },
    { key: 'family_friendly', label: t.family_friendly[lang] },
  ];

  const toggle = (key: keyof Filters) => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
      <div className="shrink-0 text-stone-300" aria-hidden="true">
        <SlidersHorizontal size={18} />
      </div>
      {chips.map(({ key, label }) => {
        const active = filters[key];
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            aria-pressed={active}
            className={`rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.98] motion-safe:transition-all motion-safe:duration-150 ${
              active
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
