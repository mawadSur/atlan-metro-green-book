// Pure, framework-agnostic prayer-time computation.
// NO 'use client' / NO 'use server' — usable from server components AND client.
// adhan is fully synchronous: these functions are deterministic given their
// inputs and must NOT be made async.

import {
  Coordinates,
  CalculationMethod,
  PrayerTimes as AdhanPrayerTimes,
} from 'adhan';

/** The six on-screen prayer markers (in chronological order within a day). */
export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** Ordered list of the prayer markers we surface. */
export const PRAYER_ORDER: readonly PrayerName[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
] as const;

/** A stable, plain object of prayer-time Dates for a single day + location. */
export interface ComputedPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/**
 * Compute prayer times for a given location and calendar day.
 * Uses the same calculation method as the on-screen PrayerTimes component
 * (CalculationMethod.NorthAmerica()) so server- and client-rendered times match.
 *
 * Deterministic given (lat, lng, date). Synchronous.
 */
export function computePrayerTimes(
  lat: number,
  lng: number,
  date: Date
): ComputedPrayerTimes {
  const prayerTimes = new AdhanPrayerTimes(
    new Coordinates(lat, lng),
    date,
    CalculationMethod.NorthAmerica()
  );
  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };
}

/**
 * The next upcoming prayer at `date`, or 'none' if `date` is at/after isha.
 * Replicates adhan's PrayerTimes.nextPrayer() exactly so callers that hold a
 * ComputedPrayerTimes object (server- or client-side) get identical behavior.
 */
export function nextPrayerName(
  times: ComputedPrayerTimes,
  date: Date = new Date()
): PrayerName | 'none' {
  if (date >= times.isha) {
    return 'none';
  } else if (date >= times.maghrib) {
    return 'isha';
  } else if (date >= times.asr) {
    return 'maghrib';
  } else if (date >= times.dhuhr) {
    return 'asr';
  } else if (date >= times.sunrise) {
    return 'dhuhr';
  } else if (date >= times.fajr) {
    return 'sunrise';
  } else {
    return 'fajr';
  }
}

/** A single prayer entry relative to a kickoff time. */
export interface PrayerEntry {
  key: PrayerName;
  time: Date;
}

/** Result of the kickoff-relative prayer planner. */
export interface KickoffPrayerPlan {
  /** All prayers for the match day, in chronological order. */
  all: PrayerEntry[];
  /** Prayers whose time is at or before kickoff. */
  before: PrayerEntry[];
  /** Prayers whose time is strictly after kickoff. */
  after: PrayerEntry[];
  /**
   * The single most relevant prayer to plan around: the first prayer at or
   * after kickoff (so attendees can pray before/at the venue), falling back to
   * the last prayer before kickoff if every prayer is already past at kickoff.
   * Null only if no prayers were computed (never happens in practice).
   */
  primary: PrayerEntry | null;
}

/**
 * For the match day (derived from `kickoff`), classify each prayer as falling
 * before vs. after kickoff, and pick the single most relevant prayer to plan
 * around.
 *
 * "Most relevant" = the prayer nearest to / just after kickoff: the first
 * prayer whose time is >= kickoff. If kickoff is after isha (all prayers done),
 * fall back to the last prayer of the day (isha).
 *
 * Deterministic given (lat, lng, kickoff). Synchronous.
 */
export function prayersAroundKickoff(
  lat: number,
  lng: number,
  kickoff: Date
): KickoffPrayerPlan {
  const times = computePrayerTimes(lat, lng, kickoff);
  const all: PrayerEntry[] = PRAYER_ORDER.map((key) => ({
    key,
    time: times[key],
  }));

  const kickoffMs = kickoff.getTime();
  const before: PrayerEntry[] = [];
  const after: PrayerEntry[] = [];
  for (const entry of all) {
    if (entry.time.getTime() <= kickoffMs) {
      before.push(entry);
    } else {
      after.push(entry);
    }
  }

  // First prayer at/after kickoff, else fall back to the last prayer before it.
  let primary: PrayerEntry | null = null;
  if (after.length > 0) {
    primary = after[0];
  } else if (before.length > 0) {
    primary = before[before.length - 1];
  }

  return { all, before, after, primary };
}
