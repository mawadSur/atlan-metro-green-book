'use client';

// Client orchestrator for the match-day plan.
//
// The PAGE (page.tsx) stays a static RSC: it computes the serializable MatchVM
// + localized team/stage labels server-side and hands them here. This island
// owns the `lang` state so the EN / العربية / Español toggle re-renders all
// text and flips dir=rtl for Arabic — keeping the page static (no searchParams,
// ISR-safe) while delivering the Arabic-first experience client-side.
//
// Initial render is EN (matches the server HTML exactly → no hydration
// mismatch). All layout uses logical-property classes (ms-/me-/ps-/pe-/start-/
// end-) so the RTL flip needs no per-element overrides.

import { useState } from 'react';
import Link from 'next/link';
import { Check, MapPinned, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { LANGS, t } from '@/i18n/strings';
import { localized } from '@/lib/display';
import { m } from '@/i18n/match';
import type { MatchVM } from './viewModel';
import { sp, fill } from './matchText';
import MatchLang from './MatchLang';
import SpotCard from './SpotCard';
import PrayerCountdown from './PrayerCountdown';
import ShareButton from './ShareButton';
import EmailCapture from './EmailCapture';

export interface TeamLabels {
  home: { flag: string; name: Record<Lang, string> };
  away: { flag: string; name: Record<Lang, string> };
  stage: Record<Lang, string>;
}

interface MatchPlanProps {
  vm: MatchVM;
  teams: TeamLabels;
}

const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function prayerLabel(key: MatchVM['prayer']['key'], lang: Lang): string {
  // All prayer-name keys exist in the shared `t` dictionary.
  return PRAYER_KEYS.includes(key) ? t[key][lang] : key;
}

export default function MatchPlan({ vm, teams }: MatchPlanProps) {
  const [lang, setLang] = useState<Lang>('en');
  const dir = LANGS.find((l) => l.code === lang)?.dir ?? 'ltr';

  const homeName = teams.home.name[lang];
  const awayName = teams.away.name[lang];
  const matchTitle = `${homeName} v ${awayName}`;
  const prayerName = prayerLabel(vm.prayer.key, lang);
  const nearestPrayerName = vm.nearestPrayerSpot.db
    ? localized(vm.nearestPrayerSpot.db, 'name', lang)
    : vm.nearestPrayerSpot.overlay.name_en;

  return (
    <div dir={dir} className="min-h-dvh bg-stone-50">
      <div className="mx-auto max-w-md px-4 pb-16 pt-4 space-y-5">
        {/* Top bar: back + language */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            aria-label={t.back[lang]}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 motion-safe:transition-colors"
          >
            <ArrowLeft size={20} className={dir === 'rtl' ? 'rotate-180' : ''} aria-hidden="true" />
          </Link>
          <MatchLang lang={lang} onChange={setLang} />
        </div>

        {/* 1. Compressed match header — flags dominant. */}
        <header className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-center gap-3 text-4xl" aria-hidden="true">
            <span>{teams.home.flag}</span>
            <span className="text-stone-300 text-2xl">v</span>
            <span>{teams.away.flag}</span>
          </div>
          <p className="mt-2 text-center text-base font-semibold text-stone-900">{matchTitle}</p>
          <p className="mt-0.5 text-center text-sm text-stone-500">
            {teams.stage[lang]} · {vm.kickoffDateLabel} · {vm.kickoffLabel} · {sp.at_stadium[lang]}
          </p>
        </header>

        {/* 2. THE VERDICT (above the fold). */}
        <section
          className="rounded-2xl border border-teal-200 bg-teal-50 p-4"
          aria-label="Verdict"
        >
          <div className="flex items-start gap-2">
            <Check size={20} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
            <div className="space-y-1">
              {vm.hasWalkableFood ? (
                <>
                  <p className="font-semibold text-emerald-900">
                    {fill(sp.verdict_food_and_prayer[lang], {
                      food: vm.walkableFoodCount,
                      prayer: vm.walkablePrayerCount,
                    })}
                  </p>
                  {vm.nearestFoodTransit && (
                    <p className="text-sm text-emerald-900/80">
                      {fill(sp.verdict_nearest_food[lang], { transit: vm.nearestFoodTransit })}{' '}
                      {sp.verdict_heres_plan[lang]}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold text-emerald-900">{m.verdict_none_at_gate[lang]}</p>
                  <p className="text-sm text-emerald-900/80">{m.verdict_plan_ready[lang]}</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 3. Prayer planner — server-static answer + client countdown. */}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
          <h2 className="font-semibold text-stone-900">{m.prayer_planner_title[lang]}</h2>
          <p className="text-sm text-stone-700">
            {fill(sp.prayer_answer_before[lang], {
              prayer: prayerName,
              time: vm.prayer.timeLabel,
            })}
          </p>
          <p className="text-sm text-stone-700">
            {fill(sp.prayer_nearest_line[lang], {
              place: nearestPrayerName,
              transit: vm.nearestPrayerSpot.overlay.transit_en,
            })}
          </p>
          {!vm.stadiumHasPrayerRoom && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <AlertTriangle size={15} aria-hidden="true" />
              {m.no_prayer_room_stadium[lang]}
            </p>
          )}
          <PrayerCountdown timeIso={vm.prayer.timeIso} prayerName={prayerName} lang={lang} />
        </section>

        {/* 4 / 5. Walkable spots, or the confident empty-state. */}
        {vm.hasWalkableFood ? (
          <section className="space-y-3" aria-label={sp.walkable_title[lang]}>
            <h2 className="flex items-center gap-1.5 font-semibold text-stone-900">
              <MapPinned size={18} className="text-teal-700" aria-hidden="true" />
              {sp.walkable_title[lang]}
            </h2>
            {vm.walkable.map((spot) => (
              <SpotCard key={spot.overlay.name_en} spot={spot} slug={vm.slug} lang={lang} />
            ))}
          </section>
        ) : (
          <EmptyPlan vm={vm} lang={lang} />
        )}

        {/* Trip-tier spots (always useful as the pre-match stop). */}
        {vm.tripTier.length > 0 && (
          <section className="space-y-3" aria-label={sp.triptier_title[lang]}>
            <h2 className="font-semibold text-stone-900">{sp.triptier_title[lang]}</h2>
            {vm.tripTier.map((spot) => (
              <SpotCard key={spot.overlay.name_en} spot={spot} slug={vm.slug} lang={lang} />
            ))}
          </section>
        )}

        {/* 6. Share + email capture (after the value). */}
        <section className="space-y-4 pt-2">
          <div className="flex justify-center">
            <ShareButton
              slug={vm.slug}
              lang={lang}
              shareText={fill(sp.share_text[lang], { match: matchTitle })}
            />
          </div>
          <EmailCapture slug={vm.slug} lang={lang} />
        </section>

        {/* 7. Back to the full Atlanta list. */}
        <div className="pt-2 text-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            {m.seeAllAtlanta[lang]}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** D3 confident empty-state when no halal food is walkable. */
function EmptyPlan({ vm, lang }: { vm: MatchVM; lang: Lang }) {
  return (
    <div className="space-y-3">
      {/* Path A — pre-match on the MARTA route. */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-stone-900">{sp.empty_pre_title[lang]}</h2>
        <p className="text-sm text-stone-700">{sp.empty_pre_body[lang]}</p>
        {vm.tripTier
          .filter((e) => e.overlay.kind === 'food')
          .slice(0, 3)
          .map((spot) => (
            <SpotCard key={spot.overlay.name_en} spot={spot} slug={vm.slug} lang={lang} />
          ))}
      </section>

      {/* Path B — at the stadium: nearest prayer + honest concessions note. */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-stone-900">{sp.empty_at_title[lang]}</h2>
        <p className="text-sm text-stone-700">{sp.empty_at_body[lang]}</p>
        <SpotCard spot={vm.nearestPrayerSpot} slug={vm.slug} lang={lang} />
        <p className="flex items-start gap-1.5 text-xs text-stone-500">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <span>{sp.empty_concessions[lang]}</span>
        </p>
      </section>
    </div>
  );
}
