// Curated editorial overlay for the World Cup match page.
//
// This is NOT location-schema data — it is the human-verified walk/transit
// editorial that does not belong in the `locations` DB (the DB-side halal
// provenance corrections shipped in migration 0004). The match page joins
// these rows onto the live DB rows by `name_en`.
//
// Source of truth: T1 stadium-spot verification (2026-06-07). Spots that are
// unverified / likely OSM ghosts (Mukhtaro Beef Burger, Divan Restaurant &
// Bar) are deliberately EXCLUDED — never surface an unverified halal/prayer
// spot on a match page.
//
// Provenance honesty: every prayer spot here is 'community-listed' (research
// cannot set 'verified'; that needs a human phone-check). NEVER render an
// unqualified prayer location — always pair the provenance tier + prayer type
// + access note. Transit strings are intentionally redundant/honest
// (walkable vs not, MARTA last-mile quality) so color is never the only signal.

export const STADIUM = {
  lat: 33.7553,
  lng: -84.4006,
  name_en: 'Mercedes-Benz Stadium',
  // The stadium has NO prayer/musalla room (only a KultureCity sensory room).
  // Never imply one — point fans to Five Points Islamic Center.
  hasPrayerRoom: false,
} as const;

export interface StadiumSpot {
  name_en: string;
  kind: 'food' | 'prayer';
  provenance: 'verified' | 'community-listed' | 'unverified';
  miles: number;
  walkable: boolean;
  walkMin: number | null;
  transit_en: string;
  note_en?: string;
  alcohol?: boolean;
  vegan?: boolean;
  prayerType?: 'masjid' | 'musalla' | 'quiet';
  access_en?: string;
  jummah_en?: string | null;
}

// EXACTLY the verified spots, sorted by miles ascending.
// Closest MARTA to the stadium: GWCC/CNN Center + Vine City (Blue/Green); halal
// sits on the Red/Gold corridor, so the transit route is always walk to Vine
// City/GWCC -> one stop to Five Points hub -> transfer.
export const STADIUM_SPOTS: StadiumSpot[] = [
  {
    name_en: 'Five Points Islamic Center',
    kind: 'prayer',
    provenance: 'community-listed',
    miles: 0.47,
    walkable: true,
    walkMin: 10,
    transit_en: '~9-10 min walk',
    prayerType: 'masjid',
    access_en: 'Masjid (Masjid Jami) — closest prayer to the stadium.',
    // Jummah time NOT published online — needs a human phone-call.
    jummah_en: null,
    note_en: 'Closest prayer answer. Jummah time not published online.',
  },
  {
    name_en: 'Baraka Shawarma',
    kind: 'food',
    provenance: 'community-listed',
    miles: 0.57,
    walkable: true,
    walkMin: 12,
    transit_en: '~11-13 min walk',
    note_en: 'Strong halal (Muslim-owned). Hours conflicting (9pm vs 10pm) — call ahead.',
  },
  {
    name_en: "Tassili's Raw Reality",
    kind: 'food',
    provenance: 'community-listed',
    miles: 1.55,
    walkable: false,
    walkMin: null,
    transit_en: 'rideshare ~8-12 min — not walkable',
    vegan: true,
    note_en: '100% raw vegan — no halal certification needed. Hours unknown.',
  },
  {
    name_en: 'Blue India',
    kind: 'food',
    provenance: 'community-listed',
    miles: 1.94,
    walkable: false,
    walkMin: null,
    transit_en: '~30-35 min via MARTA / rideshare ~10 min — not walkable',
    alcohol: true,
    note_en: 'Serves alcohol — not alcohol-free.',
  },
  {
    name_en: 'Masjid Al-Farooq',
    kind: 'prayer',
    provenance: 'community-listed',
    miles: 2.15,
    walkable: false,
    walkMin: null,
    transit_en: 'MARTA to Midtown + 0.4 mi walk — best transit option, not walkable',
    prayerType: 'masjid',
    access_en: 'Masjid — visitors welcome. Best transit last-mile of the masjids.',
    jummah_en: 'Jummah ~2:00pm + ~2:50pm',
  },
  {
    name_en: "Masjid Al-Mu'minun",
    kind: 'prayer',
    provenance: 'community-listed',
    miles: 2.29,
    walkable: false,
    walkMin: null,
    transit_en: 'rideshare — poor MARTA last mile, not walkable',
    prayerType: 'masjid',
    access_en: 'Masjid — drop-in friendly.',
    jummah_en: 'Jummah Fri 1:45pm (DST/June)',
  },
  {
    name_en: 'Mediterranean Grill',
    kind: 'food',
    provenance: 'community-listed',
    miles: 2.58,
    walkable: false,
    walkMin: null,
    transit_en: 'rideshare ~12-15 min — poor MARTA last mile, not walkable',
    note_en:
      'Self-declares halal. Mon-Sat 11-8:30, Sun 11-8 — closes early, too early for a night match.',
  },
];

/** Spots within walking distance (<=1 mi) of the stadium. */
export function walkableSpots(): StadiumSpot[] {
  return STADIUM_SPOTS.filter((s) => s.walkable);
}

/** Trip-tier spots (1.5-2.6 mi) — transit/rideshare, NOT walkable. */
export function tripTierSpots(): StadiumSpot[] {
  return STADIUM_SPOTS.filter((s) => !s.walkable);
}

/** Nearest prayer spot to the stadium (already sorted by miles ascending). */
export function nearestPrayer(): StadiumSpot {
  // Non-null: STADIUM_SPOTS always contains at least Five Points (a prayer spot).
  return STADIUM_SPOTS.find((s) => s.kind === 'prayer') as StadiumSpot;
}
