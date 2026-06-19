// Match data model for the World Cup match pages.
// Pure data + helpers — NO 'use client' / NO 'use server'.
//
// KICKOFF TIMES: verified 2026-06-18 against FIFA.com / official Mercedes-Benz
// Stadium event pages, cross-checked with NBC Sports and primary ticketing
// (AXS, SeatGeek, Ticketmaster). All four venue matches, matchups and kickoff
// clock times below were confirmed and now carry per-line "// confirmed ..."
// markers. Kickoffs are centralized here so a fix is one line per match.
//
// Atlanta observes EDT (UTC-04:00) in June/July, so the America/New_York offset
// is -04:00 for every match below.

export const VENUE_TZ = 'America/New_York';

export const STADIUM = {
  lat: 33.7553,
  lng: -84.4006,
  name_en: 'Mercedes-Benz Stadium',
  hasPrayerRoom: false,
};

export interface MatchTeam {
  name_en: string;
  name_ar: string;
  name_es: string;
  flag: string; // emoji
}

export interface Match {
  slug: string;
  /** ISO 8601 WITH America/New_York offset (e.g. '2026-06-21T12:00:00-04:00'). */
  kickoff: string;
  venueTz: string;
  home: MatchTeam;
  away: MatchTeam;
  stage_en: string;
  stage_ar: string;
}

const SPAIN: MatchTeam = {
  name_en: 'Spain',
  name_ar: 'إسبانيا',
  name_es: 'España',
  flag: '🇪🇸',
};
const SAUDI_ARABIA: MatchTeam = {
  name_en: 'Saudi Arabia',
  name_ar: 'السعودية',
  name_es: 'Arabia Saudí',
  flag: '🇸🇦',
};
const MOROCCO: MatchTeam = {
  name_en: 'Morocco',
  name_ar: 'المغرب',
  name_es: 'Marruecos',
  flag: '🇲🇦',
};
const HAITI: MatchTeam = {
  name_en: 'Haiti',
  name_ar: 'هايتي',
  name_es: 'Haití',
  flag: '🇭🇹',
};
const DR_CONGO: MatchTeam = {
  name_en: 'DR Congo',
  name_ar: 'جمهورية الكونغو الديمقراطية',
  name_es: 'RD Congo',
  flag: '🇨🇩',
};
const UZBEKISTAN: MatchTeam = {
  name_en: 'Uzbekistan',
  name_ar: 'أوزبكستان',
  name_es: 'Uzbekistán',
  flag: '🇺🇿',
};
const TBD: MatchTeam = {
  name_en: 'To be decided',
  name_ar: 'يُحدد لاحقًا',
  name_es: 'Por determinar',
  flag: '🏳️',
};

export const MATCHES: Match[] = [
  {
    slug: 'spain-saudi-arabia',
    kickoff: '2026-06-21T12:00:00-04:00', // confirmed vs FIFA.com / MBS event page 2026-06-18
    venueTz: VENUE_TZ,
    home: SPAIN,
    away: SAUDI_ARABIA,
    stage_en: 'Group Stage',
    stage_ar: 'دور المجموعات',
  },
  {
    slug: 'morocco-haiti',
    kickoff: '2026-06-24T18:00:00-04:00', // confirmed vs FIFA.com / MBS event page 2026-06-18
    venueTz: VENUE_TZ,
    home: MOROCCO,
    away: HAITI,
    stage_en: 'Group Stage',
    stage_ar: 'دور المجموعات',
  },
  {
    slug: 'dr-congo-uzbekistan',
    kickoff: '2026-06-27T19:30:00-04:00', // confirmed vs FIFA.com / MBS event page 2026-06-18
    venueTz: VENUE_TZ,
    home: DR_CONGO,
    away: UZBEKISTAN,
    stage_en: 'Group Stage',
    stage_ar: 'دور المجموعات',
  },
  {
    slug: 'semifinal-atlanta',
    kickoff: '2026-07-15T15:00:00-04:00', // confirmed vs NBC Sports / MBS event page 2026-06-18 (teams TBD)
    venueTz: VENUE_TZ,
    home: TBD,
    away: TBD,
    stage_en: 'Semifinal',
    stage_ar: 'نصف النهائي',
  },
];

/** Look up a match by its slug. */
export function getMatch(slug: string): Match | undefined {
  return MATCHES.find((m) => m.slug === slug);
}

/**
 * The match kickoff as a Date. The ISO string carries the America/New_York
 * offset, so this resolves to the correct absolute instant regardless of where
 * the code runs (server or client, any local timezone).
 */
export function matchKickoffDate(m: Match): Date {
  return new Date(m.kickoff);
}
