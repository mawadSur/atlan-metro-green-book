'use client';

// Progressive-enhancement countdown to the planner's primary prayer.
//
// The server already renders the static prayer answer (time + nearest space).
// This island layers a live "in 2h 14m" countdown ON TOP — it renders nothing
// until mounted (so the server HTML and the initial client HTML match exactly,
// avoiding a React 19 hydration mismatch) and degrades to silence if the prayer
// time has already passed.

import { Clock } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { useNow } from './useClient';

interface PrayerCountdownProps {
  /** ISO instant of the prayer to count down to. */
  timeIso: string;
  /** Localized prayer name, already resolved by the parent. */
  prayerName: string;
  lang: Lang;
}

function fmtRemaining(ms: number, lang: Lang): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (lang === 'ar') {
    const hPart = h > 0 ? `${h} س` : '';
    const mPart = `${min} د`;
    return `خلال ${[hPart, mPart].filter(Boolean).join(' ')}`;
  }
  if (lang === 'es') {
    const hPart = h > 0 ? `${h} h` : '';
    const mPart = `${min} min`;
    return `en ${[hPart, mPart].filter(Boolean).join(' ')}`;
  }
  const hPart = h > 0 ? `${h}h` : '';
  const mPart = `${min}m`;
  return `in ${[hPart, mPart].filter(Boolean).join(' ')}`;
}

export default function PrayerCountdown({
  timeIso,
  prayerName,
  lang,
}: PrayerCountdownProps) {
  // `null` on the server & first client render → emit nothing (no hydration
  // mismatch); the real time + a 30s refresh flow in after hydration.
  const now = useNow();
  if (now === null) return null;

  const target = new Date(timeIso).getTime();
  const remaining = target - now;
  if (remaining <= 0) return null; // already passed — the static answer stands

  return (
    <p
      className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-teal-800"
      aria-live="off"
    >
      <Clock size={14} aria-hidden="true" />
      <span>
        {prayerName} {fmtRemaining(remaining, lang)}
      </span>
    </p>
  );
}
