'use client';

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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.search[lang]}
        className="w-full rounded-full bg-white border border-stone-300 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
      />
    </div>
  );
}
