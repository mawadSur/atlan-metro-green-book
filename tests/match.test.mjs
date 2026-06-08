// TASK T6 — World Cup match-page unit tests.
//
// FREEZE TIMEZONE: set TZ before importing anything that touches Date so the
// prayer golden test is deterministic on any CI machine. adhan computes from
// absolute instants (the Date carries an offset), but `.toLocaleTimeString`
// formatting and any local-Date construction must resolve in America/New_York.
process.env.TZ = 'America/New_York';

import { describe, it, expect } from 'vitest';
import {
  computePrayerTimes,
  prayersAroundKickoff,
  PRAYER_ORDER,
} from '../web/src/lib/prayer.ts';
import { haversineDistance, formatDistance } from '../web/src/lib/distance.ts';
import {
  encodeSavedIds,
  decodeSavedIds,
} from '../web/src/lib/saveList.ts';
import {
  isValidEmail,
  isHoneypotTripped,
  HONEYPOT_FIELD,
} from '../web/src/lib/email-validate.ts';
import { MATCHES, getMatch, matchKickoffDate } from '../web/src/lib/matches.ts';
import { STADIUM_SPOTS } from '../web/src/data/stadium-spots.ts';

// Atlanta / Mercedes-Benz Stadium.
const STADIUM = { lat: 33.7553, lng: -84.4006 };
const FIVE_POINTS = { lat: 33.7539, lng: -84.3915 }; // Five Points MARTA hub area

/** Format a Date as HH:MM in America/New_York (24h). */
const etHHMM = (d) =>
  d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

/** Minutes-since-midnight in America/New_York. */
const etMinutes = (d) => {
  const [h, m] = etHHMM(d).split(':').map(Number);
  return h * 60 + m;
};

describe('prayer — golden times for Atlanta, fixed date', () => {
  // FIXED date: kickoff-ish noon on the Spain-Saudi match day, EDT (UTC-4).
  // adhan resolves this to the same absolute instant on every machine; the TZ
  // freeze above only governs how we *read it back* for assertions.
  const date = new Date('2026-06-21T12:00:00-04:00');
  const t = computePrayerTimes(STADIUM.lat, STADIUM.lng, date);

  it('returns the six prayers in correct ascending chronological order', () => {
    const seq = PRAYER_ORDER.map((k) => t[k].getTime());
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThan(seq[i - 1]);
    }
    // Spell it out so a failure names the offending pair.
    expect(t.fajr.getTime()).toBeLessThan(t.sunrise.getTime());
    expect(t.sunrise.getTime()).toBeLessThan(t.dhuhr.getTime());
    expect(t.dhuhr.getTime()).toBeLessThan(t.asr.getTime());
    expect(t.asr.getTime()).toBeLessThan(t.maghrib.getTime());
    expect(t.maghrib.getTime()).toBeLessThan(t.isha.getTime());
  });

  it('matches independently-sourced SOLAR anchors within a few minutes (TZ guard)', () => {
    // LOAD-BEARING TZ-CORRECTNESS CHECK.
    // The solar anchors (sunrise / dhuhr=solar-noon / maghrib=sunset) are
    // astronomical facts, independent of the prayer-calc twilight angles.
    // Reference: NOAA / timeanddate-class solar table for Atlanta, GA
    // (lat 33.755, lng -84.40) on 2026-06-21, EDT (UTC-4):
    //   sunrise ~06:26, solar noon ~13:40, sunset ~20:52.
    // A whole-hour TZ/offset bug (the failure mode we must catch) would shift
    // these by 60+ minutes; a few-minute tolerance passes only if TZ is right.
    expect(Math.abs(etMinutes(t.sunrise) - (6 * 60 + 26))).toBeLessThanOrEqual(5);
    expect(Math.abs(etMinutes(t.dhuhr) - (13 * 60 + 40))).toBeLessThanOrEqual(5);
    expect(Math.abs(etMinutes(t.maghrib) - (20 * 60 + 52))).toBeLessThanOrEqual(5);
  });

  it('matches the ISNA Fajr/Isha reference for the date within plausibility bounds', () => {
    // The app uses CalculationMethod.NorthAmerica() (ISNA, 15° fajr/isha angle).
    // For Atlanta near the summer solstice the ISNA window is roughly:
    //   Fajr ~04:45-05:30 ET, Isha ~22:00-22:45 ET.
    // adhan computes Fajr 05:03 / Isha 22:15 for this date, which sits inside
    // those bounds. NOTE: a true hand-confirmed ISNA golden (IslamicFinder /
    // aladhan method=2) could not be fetched headlessly here — see blockers.
    const fajr = etMinutes(t.fajr);
    const isha = etMinutes(t.isha);
    expect(fajr).toBeGreaterThanOrEqual(4 * 60 + 45);
    expect(fajr).toBeLessThanOrEqual(5 * 60 + 30);
    expect(isha).toBeGreaterThanOrEqual(22 * 60 + 0);
    expect(isha).toBeLessThanOrEqual(22 * 60 + 45);
  });
});

describe('prayer — prayersAroundKickoff classification', () => {
  // Use the real Spain-Saudi kickoff: 2026-06-21 12:00 EDT. For that day the
  // prayers are Fajr 05:03, Sunrise 06:27, Dhuhr 13:40, Asr 17:24,
  // Maghrib 20:51, Isha 22:15 (all ET). Kickoff 12:00 sits AFTER sunrise but
  // BEFORE dhuhr.
  const kickoff = new Date('2026-06-21T12:00:00-04:00');
  const plan = prayersAroundKickoff(STADIUM.lat, STADIUM.lng, kickoff);

  it('splits prayers into before vs after the kickoff instant', () => {
    expect(plan.all).toHaveLength(6);
    // Fajr + Sunrise are before noon; Dhuhr/Asr/Maghrib/Isha are after.
    expect(plan.before.map((e) => e.key)).toEqual(['fajr', 'sunrise']);
    expect(plan.after.map((e) => e.key)).toEqual([
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ]);
    // before/after partition is exhaustive + disjoint.
    expect(plan.before.length + plan.after.length).toBe(6);
  });

  it('picks the first prayer at/after kickoff as the primary plan-around prayer', () => {
    expect(plan.primary).not.toBeNull();
    expect(plan.primary.key).toBe('dhuhr');
  });

  it('boundary: a kickoff exactly at a prayer time classifies that prayer as before', () => {
    // <= kickoff goes to `before`. Kick off exactly at dhuhr.
    const atDhuhr = plan.all.find((e) => e.key === 'dhuhr').time;
    const p2 = prayersAroundKickoff(STADIUM.lat, STADIUM.lng, atDhuhr);
    expect(p2.before.map((e) => e.key)).toContain('dhuhr');
    expect(p2.after.map((e) => e.key)).not.toContain('dhuhr');
    // First prayer strictly after the dhuhr-boundary kickoff is asr.
    expect(p2.primary.key).toBe('asr');
  });

  it('after-isha kickoff: every prayer is before, primary falls back to isha', () => {
    // Late-night kickoff at 23:30 ET — past isha (22:15). All six are `before`.
    const lateKickoff = new Date('2026-06-21T23:30:00-04:00');
    const p3 = prayersAroundKickoff(STADIUM.lat, STADIUM.lng, lateKickoff);
    expect(p3.after).toHaveLength(0);
    expect(p3.before).toHaveLength(6);
    expect(p3.primary.key).toBe('isha'); // last prayer of the day
  });

  it('pre-dawn kickoff: every prayer is after, primary is fajr', () => {
    const dawnKickoff = new Date('2026-06-21T02:00:00-04:00');
    const p4 = prayersAroundKickoff(STADIUM.lat, STADIUM.lng, dawnKickoff);
    expect(p4.before).toHaveLength(0);
    expect(p4.after).toHaveLength(6);
    expect(p4.primary.key).toBe('fajr');
  });
});

describe('distance — haversine + sort', () => {
  it('computes a known stadium->Five Points distance (~0.47 mi)', () => {
    const d = haversineDistance(STADIUM, FIVE_POINTS);
    // STADIUM_SPOTS pins Five Points at 0.47 mi; allow a generous coord/round
    // tolerance (the curated value and our coords are approximate).
    expect(d.miles).toBeGreaterThan(0.3);
    expect(d.miles).toBeLessThan(0.7);
    // km is a consistent unit conversion of miles.
    expect(d.km).toBeCloseTo(d.miles * 1.60934, 5);
  });

  it('haversine is symmetric and zero for identical points', () => {
    const ab = haversineDistance(STADIUM, FIVE_POINTS).miles;
    const ba = haversineDistance(FIVE_POINTS, STADIUM).miles;
    expect(ab).toBeCloseTo(ba, 9);
    expect(haversineDistance(STADIUM, STADIUM).miles).toBeCloseTo(0, 9);
  });

  it('formats distance per language', () => {
    const d = { miles: 0.47, km: 0.76 };
    expect(formatDistance(d, 'en')).toBe('0.5 mi');
    expect(formatDistance(d, 'es')).toBe('0.5 mi');
    expect(formatDistance(d, 'ar')).toContain('ميل');
  });

  it('STADIUM_SPOTS are sorted by miles ascending', () => {
    const miles = STADIUM_SPOTS.map((s) => s.miles);
    const sorted = [...miles].sort((a, b) => a - b);
    expect(miles).toEqual(sorted);
    // Closest spot is the nearest prayer answer (Five Points, 0.47 mi).
    expect(STADIUM_SPOTS[0].name_en).toBe('Five Points Islamic Center');
    expect(STADIUM_SPOTS[0].miles).toBe(0.47);
  });
});

describe('saveList — base64url codec round-trip + trust boundary', () => {
  const ids = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
  ];

  it('round-trips an array of ids', () => {
    const token = encodeSavedIds(ids);
    expect(typeof token).toBe('string');
    // base64url alphabet only — no +, /, or = padding.
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSavedIds(token)).toEqual(ids);
  });

  it('decode never throws on corrupt input and yields [] (repairs, not crashes)', () => {
    for (const bad of [
      '',
      'not base64 @@@@',
      '!!!!',
      'eyJ', // truncated base64
      Buffer.from('{"not":"an array"}').toString('base64url'),
      Buffer.from('not even json').toString('base64url'),
      Buffer.from('[12345]').toString('base64url'), // array of non-id-likes
      Buffer.from('["plain-text-not-an-id"]').toString('base64url'),
    ]) {
      expect(() => decodeSavedIds(bad)).not.toThrow();
      expect(decodeSavedIds(bad)).toEqual([]);
    }
  });

  it('enforces the 25-id cap at DECODE (extras dropped, no throw)', () => {
    // Hand-build a token with 40 valid ids, bypassing encode()'s own cap.
    const many = Array.from(
      { length: 40 },
      (_, i) => `${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`
    );
    const oversizeToken = Buffer.from(JSON.stringify(many))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const decoded = decodeSavedIds(oversizeToken);
    expect(decoded).toHaveLength(25);
    expect(decoded[0]).toBe(many[0]);
  });

  it('encode also caps at 25 and filters non-id-like entries', () => {
    const many = Array.from(
      { length: 40 },
      (_, i) => `${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`
    );
    expect(decodeSavedIds(encodeSavedIds(many))).toHaveLength(25);
    // Mixed junk + ids: junk filtered, ids kept.
    const mixed = [ids[0], 'space invader', 42, null, ids[1]];
    expect(decodeSavedIds(encodeSavedIds(mixed))).toEqual([ids[0], ids[1]]);
  });

  it('rejects a giant/oversized blob as a DoS guard (-> [])', () => {
    const giant = 'A'.repeat(5000); // > 4096 cap
    expect(decodeSavedIds(giant)).toEqual([]);
  });
});

describe('email-validate — validation + honeypot', () => {
  it('accepts plausible emails', () => {
    for (const ok of [
      'a@b.co',
      'fan@worldcup.example',
      'first.last+tag@sub.domain.org',
    ]) {
      expect(isValidEmail(ok)).toBe(true);
    }
  });

  it('rejects obvious junk', () => {
    for (const bad of [
      '',
      '   ',
      'no-at-sign',
      'two@@at.com',
      'spaces in@email.com',
      'missing@domain',
      'a'.repeat(255) + '@x.co', // > 254 chars
    ]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });

  it('honeypot tripped only when the hidden field has content', () => {
    const fd = (v) => ({ get: (n) => (n === HONEYPOT_FIELD ? v : null) });
    expect(isHoneypotTripped(fd('a bot filled this'))).toBe(true);
    expect(isHoneypotTripped(fd(''))).toBe(false);
    expect(isHoneypotTripped(fd('   '))).toBe(false); // whitespace-only is not tripped
    expect(isHoneypotTripped(fd(null))).toBe(false);
    expect(isHoneypotTripped({ get: () => { throw new Error('boom'); } })).toBe(false);
  });
});

describe('matches — data model', () => {
  it('exposes exactly 4 matches with unique slugs', () => {
    expect(MATCHES).toHaveLength(4);
    const slugs = MATCHES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(4);
    expect(slugs).toEqual([
      'spain-saudi-arabia',
      'morocco-haiti',
      'dr-congo-uzbekistan',
      'semifinal-atlanta',
    ]);
  });

  it('getMatch resolves a known slug and returns undefined for unknown', () => {
    const m = getMatch('spain-saudi-arabia');
    expect(m).toBeDefined();
    expect(m.home.name_en).toBe('Spain');
    expect(m.away.name_en).toBe('Saudi Arabia');
    expect(getMatch('does-not-exist')).toBeUndefined();
    expect(getMatch('')).toBeUndefined();
  });

  it('every kickoff string parses to a valid Date carrying the venue offset', () => {
    for (const m of MATCHES) {
      const d = matchKickoffDate(m);
      expect(d instanceof Date).toBe(true);
      expect(Number.isNaN(d.getTime())).toBe(false);
      // ISO string carries the America/New_York (-04:00) offset.
      expect(m.kickoff).toContain('-04:00');
      expect(m.venueTz).toBe('America/New_York');
    }
  });
});
