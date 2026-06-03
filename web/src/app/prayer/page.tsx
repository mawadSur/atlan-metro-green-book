'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PrayerTimes from '@/components/PrayerTimes';
import QiblaCompass from '@/components/QiblaCompass';
import type { Lang } from '@/lib/types';
import { t, LANGS } from '@/i18n/strings';

function PrayerPageContent() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get('lang') || 'en') as Lang;
  const dir = LANGS.find((l) => l.code === lang)?.dir || 'ltr';

  return (
    <div className="min-h-dvh bg-stone-50" dir={dir}>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            aria-label={t.back[lang]}
          >
            <ArrowLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{t.prayerTimes[lang]}</h1>
        </div>

        <PrayerTimes lang={lang} />
        <QiblaCompass lang={lang} />
      </div>
    </div>
  );
}

export default function PrayerPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-stone-50" />}>
      <PrayerPageContent />
    </Suspense>
  );
}
