'use client';

import Link from 'next/link';
import { Trophy, CalendarDays } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { tp } from '@/i18n/portal';
import { MATCHES } from '@/lib/matches';

interface WorldCupBannerProps {
  lang: Lang;
  onExplore?: () => void;
}

/**
 * The next upcoming match by kickoff, or the last one once they've all passed,
 * so the "Match-day plans" link always points somewhere live. Kickoff strings
 * carry the venue offset; a stale pick near midnight is harmless for a
 * discovery link.
 */
function pickMatchSlug(): string {
  const now = Date.now();
  const upcoming = MATCHES.find((mt) => new Date(mt.kickoff).getTime() >= now);
  return (upcoming ?? MATCHES[MATCHES.length - 1]).slug;
}

export default function WorldCupBanner({ lang, onExplore }: WorldCupBannerProps) {
  const matchSlug = pickMatchSlug();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-emerald-600 to-teal-700 p-6 text-white shadow-lg">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full bg-white/15 blur-xl" />
      </div>

      {/* Content */}
      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Trophy size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold leading-tight">{tp.wc_title[lang]}</h2>
        </div>

        <p className="text-white/90 text-sm leading-relaxed max-w-md">
          {tp.wc_subtitle[lang]}
        </p>

        <div className="flex flex-wrap gap-2">
          {onExplore && (
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 bg-white text-emerald-700 px-5 py-3 rounded-xl font-semibold text-sm min-h-[44px] cursor-pointer hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] motion-safe:transition-all motion-safe:duration-200 shadow-md"
            >
              <Trophy size={18} />
              <span>{tp.wc_explore[lang]}</span>
            </button>
          )}
          <Link
            href={`/match/${matchSlug}`}
            className="inline-flex items-center gap-2 bg-white/15 text-white px-5 py-3 rounded-xl font-semibold text-sm min-h-[44px] cursor-pointer hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] motion-safe:transition-all motion-safe:duration-200 ring-1 ring-white/40"
          >
            <CalendarDays size={18} aria-hidden="true" />
            <span>{tp.wc_match_plans[lang]}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
