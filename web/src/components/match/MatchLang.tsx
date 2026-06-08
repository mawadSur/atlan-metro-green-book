'use client';

// EN / العربية / Español language toggle for the match page.
//
// Controlled by the parent MatchPlan island (which owns the `lang` state and
// re-renders all text + flips dir=rtl for Arabic). This keeps the PAGE itself
// static (no searchParams) while still delivering the Arabic-first experience
// purely client-side. Color is never the only signal — the active language is
// also marked with aria-pressed + a bold label.

import { Languages } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { LANGS } from '@/i18n/strings';

interface MatchLangProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

export default function MatchLang({ lang, onChange }: MatchLangProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1"
      role="group"
      aria-label="Language"
    >
      <Languages size={16} className="ms-1 text-stone-500" aria-hidden="true" />
      {LANGS.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            aria-pressed={active}
            lang={l.code}
            className={`min-h-[36px] rounded-full px-3 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 motion-safe:transition-colors ${
              active
                ? 'bg-teal-700 font-semibold text-white'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
