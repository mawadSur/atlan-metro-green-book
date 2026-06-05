'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, MapPin } from 'lucide-react';
import InstallCTA from './InstallCTA';
import { t } from '@/i18n/strings';
import type { Lang } from '@/lib/types';

interface HeroBandProps {
  lang: Lang;
}

const STORAGE_KEY = 'gb_hero_dismissed';

export default function HeroBand({ lang }: HeroBandProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check localStorage for dismissal state
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
      setIsDismissed(dismissed);
    } catch {
      // localStorage unavailable, default to showing
    }
    setIsLoaded(true);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable, just dismiss in memory
    }
    setIsDismissed(true);
  };

  const handleExploreMap = () => {
    // Scroll to map (AppShell is rendered below)
    const main = document.querySelector('main');
    if (main) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      main.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      // Focus the map container for keyboard users
      const mapContainer = main.querySelector('[role="region"]');
      if (mapContainer instanceof HTMLElement) {
        mapContainer.focus();
      }
    }
  };

  // Don't render until we've checked localStorage (prevent flash)
  if (!isLoaded) {
    return null;
  }

  // If dismissed, render nothing (no "re-open" affordance per spec)
  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="relative hidden md:block bg-gradient-to-br from-teal-700 to-emerald-800 text-white overflow-hidden motion-safe:animate-in motion-safe:slide-in-from-top motion-safe:duration-300"
      role="banner"
      aria-label={t.landing_headline[lang]}
    >
      {/* Decorative accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Content column */}
          <div className="flex-1 text-center md:text-start space-y-4">
            {/* App name */}
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{t.landing_headline[lang]}</h1>

            {/* Value prop */}
            <p className="text-base md:text-lg text-teal-50 max-w-2xl mx-auto md:mx-0 leading-relaxed">
              {t.landing_subhead[lang]}
            </p>

            {/* World Cup badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-full">
              <MapPin className="w-4 h-4" />
              <span>{t.landing_wc_tagline[lang]}</span>
            </div>

            {/* Primary CTA */}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
              <button
                onClick={handleExploreMap}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-900 font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer hover:bg-teal-50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700 motion-safe:hover:scale-[1.02]"
                aria-label={t.landing_cta_explore[lang]}
              >
                <ChevronDown className="w-5 h-5" />
                <span>{t.landing_cta_explore[lang]}</span>
              </button>
            </div>
          </div>

          {/* Install CTA column */}
          <div className="flex-shrink-0 w-full md:w-auto md:min-w-[280px]">
            <InstallCTA lang={lang} />
          </div>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 end-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
        aria-label={t.landing_dismiss[lang]}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
