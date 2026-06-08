// Serializable view-model for the match-day plan page.
//
// NO directive — pure types + a server-side builder. The server component
// (page.tsx) computes this once (data join + prayer planner + verdict) and
// passes the plain-object result into the client MatchPlan island. Everything
// here is JSON-serializable (Dates become ISO strings) so it crosses the
// server -> client boundary cleanly and the client lang toggle can re-render
// EN/AR/ES without re-fetching.

import type { Location } from '@/lib/types';
import type { Match } from '@/lib/matches';
import type { StadiumSpot } from '@/data/stadium-spots';
import { STADIUM_SPOTS, nearestPrayer } from '@/data/stadium-spots';
import { prayersAroundKickoff, type PrayerName } from '@/lib/prayer';
import { STADIUM, matchKickoffDate } from '@/lib/matches';

/** A spot enriched with the optional DB row it joined to (by name_en). */
export interface EnrichedSpot {
  /** The curated editorial overlay row (source of truth for distance/transit). */
  overlay: StadiumSpot;
  /** The matched live DB row, if one exists (enriches hours/offer/halal). */
  db: Location | null;
}

/** The single prayer the planner centers on, pre-classified vs kickoff. */
export interface PrayerPlanVM {
  /** Prayer key, e.g. 'asr'. */
  key: PrayerName;
  /** Clock time formatted in the venue timezone, e.g. '5:42 PM'. */
  timeLabel: string;
  /** ISO instant of the prayer (for the client countdown island). */
  timeIso: string;
  /** True if this prayer falls at/after kickoff (pray after the whistle). */
  afterKickoff: boolean;
}

export interface MatchVM {
  slug: string;
  /** Kickoff clock label in venue tz, e.g. '12:00 PM'. */
  kickoffLabel: string;
  /** Kickoff date label in venue tz, e.g. 'Sun, Jun 21'. */
  kickoffDateLabel: string;
  /** ISO instant of kickoff. */
  kickoffIso: string;
  /** Count of walkable halal FOOD spots (excludes prayer + unverified). */
  walkableFoodCount: number;
  /** Count of walkable prayer spots. */
  walkablePrayerCount: number;
  /** Nearest walkable food transit label, e.g. '~11-13 min walk' (or null). */
  nearestFoodTransit: string | null;
  /** Whether any halal FOOD is walkable from the gate. */
  hasWalkableFood: boolean;
  /** Enriched walkable spots (food + prayer), sorted by honest miles. */
  walkable: EnrichedSpot[];
  /** Enriched trip-tier spots (transit/rideshare), sorted by honest miles. */
  tripTier: EnrichedSpot[];
  /** The nearest prayer spot (always present), enriched. */
  nearestPrayerSpot: EnrichedSpot;
  /** The prayer to plan around. */
  prayer: PrayerPlanVM;
  /** Stadium has no prayer room — always false here, surfaced honestly. */
  stadiumHasPrayerRoom: boolean;
}

/** Format a Date as a clock time in the venue timezone (e.g. '12:00 PM'). */
function clockLabel(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
}

/** Format a Date as a short weekday+date in the venue timezone. */
function dateLabel(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }).format(d);
}

/**
 * Case-insensitive, whitespace-trimmed name key used to join the curated
 * overlay rows onto live DB rows.
 */
function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Enrich a single overlay spot with its DB row (joined by name_en). */
function enrich(
  spot: StadiumSpot,
  dbByName: Map<string, Location>
): EnrichedSpot {
  return { overlay: spot, db: dbByName.get(nameKey(spot.name_en)) ?? null };
}

/**
 * Build the full serializable view-model for a match.
 *
 * SERVER-SIDE ONLY in practice (it calls prayer math + a name join), but it is
 * pure and deterministic so it is unit-testable. `locs` is the (possibly empty)
 * list of Atlanta DB rows; on a Supabase failure the caller passes [] and the
 * overlay alone still renders.
 */
export function buildMatchVM(match: Match, locs: Location[]): MatchVM {
  const tz = match.venueTz;
  const kickoff = matchKickoffDate(match);

  // Index DB rows by normalized name for the overlay join.
  const dbByName = new Map<string, Location>();
  for (const loc of locs) {
    if (loc.name_en) dbByName.set(nameKey(loc.name_en), loc);
  }

  // Spots are already sorted by miles ascending in STADIUM_SPOTS, and
  // unverified ghosts are already excluded from that list.
  const enriched = STADIUM_SPOTS.map((s) => enrich(s, dbByName));
  const walkable = enriched.filter((e) => e.overlay.walkable);
  const tripTier = enriched.filter((e) => !e.overlay.walkable);

  const walkableFood = walkable.filter((e) => e.overlay.kind === 'food');
  const walkablePrayer = walkable.filter((e) => e.overlay.kind === 'prayer');

  const plan = prayersAroundKickoff(STADIUM.lat, STADIUM.lng, kickoff);
  // `primary` is non-null in practice (six prayers always computed).
  const primary = plan.primary ?? plan.all[plan.all.length - 1];
  const afterKickoff = primary.time.getTime() >= kickoff.getTime();

  return {
    slug: match.slug,
    kickoffLabel: clockLabel(kickoff, tz),
    kickoffDateLabel: dateLabel(kickoff, tz),
    kickoffIso: kickoff.toISOString(),
    walkableFoodCount: walkableFood.length,
    walkablePrayerCount: walkablePrayer.length,
    nearestFoodTransit: walkableFood[0]?.overlay.transit_en ?? null,
    hasWalkableFood: walkableFood.length > 0,
    walkable,
    tripTier,
    nearestPrayerSpot: enrich(nearestPrayer(), dbByName),
    prayer: {
      key: primary.key,
      timeLabel: clockLabel(primary.time, tz),
      timeIso: primary.time.toISOString(),
      afterKickoff,
    },
    stadiumHasPrayerRoom: STADIUM.hasPrayerRoom,
  };
}
