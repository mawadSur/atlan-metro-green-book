'use client';

import { Search, X } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { t } from '@/i18n/strings';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
}

export default function SearchBar({ value, onChange, lang }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
        size={18}
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.search[lang]}
        className="w-full rounded-full bg-white border border-stone-300 pl-10 pr-10 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition-shadow motion-safe:transition-shadow motion-safe:duration-150"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus-visible:ring-2 focus-visible:ring-teal-600 rounded-full p-1 cursor-pointer motion-safe:transition-colors motion-safe:duration-150"
          type="button"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
