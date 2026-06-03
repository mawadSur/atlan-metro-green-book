'use client';

import type { Lang } from '@/lib/types';
import { LANGS } from '@/i18n/strings';

interface LangSwitcherProps {
  lang: Lang;
  onChange: (l: Lang) => void;
}

export default function LangSwitcher({ lang, onChange }: LangSwitcherProps) {
  return (
    <div className="inline-flex rounded-full bg-white border border-stone-300 p-0.5">
      {LANGS.map(({ code, label }) => {
        const active = code === lang;
        return (
          <button
            key={code}
            onClick={() => onChange(code)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              active
                ? 'bg-teal-700 text-white'
                : 'text-stone-700 hover:text-teal-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
