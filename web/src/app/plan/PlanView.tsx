'use client';

// Client view for a shared "My plan" link. Owns the EN/AR/ES toggle (so the
// shared plan reads in the recipient's language + flips RTL for Arabic) and
// reuses the shared LocationCard. A recipient who taps a card is sent to that
// place on the main map. Empty/stale token → a confident empty state, not a
// dead end.

import { useState } from 'react';
import Link from 'next/link';
import { ListChecks, ArrowLeft, MapPinned } from 'lucide-react';
import type { Lang, Location } from '@/lib/types';
import { LANGS, t } from '@/i18n/strings';
import { m } from '@/i18n/match';
import { googleMapsUrl } from '@/lib/display';
import LocationCard from '@/components/LocationCard';
import LangSwitcher from '@/components/LangSwitcher';

const TITLE: Record<Lang, string> = {
  en: 'My match-day plan',
  ar: 'خطتي ليوم المباراة',
  es: 'Mi plan de día de partido',
};
const SUBTITLE: Record<Lang, string> = {
  en: 'Halal + prayer spots saved for the matches in Atlanta.',
  ar: 'أماكن حلال وصلاة محفوظة للمباريات في أتلانتا.',
  es: 'Sitios halal y de oración guardados para los partidos en Atlanta.',
};
const EMPTY: Record<Lang, string> = {
  en: 'This plan is empty or the link has expired. Browse Atlanta halal + prayer spots to build your own.',
  ar: 'هذه الخطة فارغة أو انتهت صلاحية الرابط. تصفّح أماكن الحلال والصلاة في أتلانتا لإنشاء خطتك.',
  es: 'Este plan está vacío o el enlace caducó. Explora los sitios halal y de oración de Atlanta para crear el tuyo.',
};

export default function PlanView({ locations }: { locations: Location[] }) {
  const [lang, setLang] = useState<Lang>('en');
  const dir = LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';

  return (
    <div dir={dir} className="min-h-dvh bg-stone-50">
      <header className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            aria-label={t.back[lang]}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-safe:transition-colors"
          >
            <ArrowLeft size={20} className={dir === 'rtl' ? 'rotate-180' : ''} aria-hidden="true" />
          </Link>
          <LangSwitcher lang={lang} onChange={setLang} />
        </div>
        <div className="mx-auto max-w-md px-4 pb-4">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ListChecks size={22} aria-hidden="true" />
            {TITLE[lang]}
          </h1>
          <p className="mt-1 text-sm text-teal-50">{SUBTITLE[lang]}</p>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-4 pb-16 pt-4">
        {locations.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
            <MapPinned size={32} className="mx-auto text-stone-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-stone-600">{EMPTY[lang]}</p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-700 px-5 font-semibold text-white hover:bg-emerald-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-150"
            >
              {m.seeAllAtlanta[lang]}
            </Link>
          </div>
        ) : (
          <>
            {locations.map((loc) => (
              <LocationCard
                key={loc.id}
                loc={loc}
                lang={lang}
                onClick={() => window.open(googleMapsUrl(loc), '_blank', 'noopener')}
              />
            ))}
            <div className="pt-2 text-center">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {m.seeAllAtlanta[lang]}
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
