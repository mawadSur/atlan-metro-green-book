'use client';

import type { Lang } from '@/lib/types';
import { LANGS } from '@/i18n/strings';

interface LangSwitcherProps {
  lang: Lang;
  onChange: (l: Lang) => void;
}

export default function LangSwitcher({ lang, onChange }: LangSwitcherProps) {
  return (
    <div className="inline-flex rounded-full bg-white border border-stone-300 p-0.5" role="group">
      {LANGS.map(({ code, label }) => {
        const active = code === lang;
        return (
          <button
            key={code}
            onClick={() => onChange(code)}
            aria-pressed={active}
            className={`px-4 py-2 min-h-[44px] text-xs font-medium rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.98] motion-safe:transition-all motion-safe:duration-150 ${
              active
                ? 'bg-teal-700 text-white'
                : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
