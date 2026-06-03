'use client';

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
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {chips.map(({ key, label }) => {
        const active = filters[key];
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
              active
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-stone-300 text-stone-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
