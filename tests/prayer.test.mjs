// Tests for web/src/lib/prayer.ts — nextPrayerName function.
// computePrayerTimes and prayersAroundKickoff are already covered in match.test.mjs;
// this file covers the gap: the nextPrayerName branch-table (7 branches).

process.env.TZ = 'America/New_York';

import { describe, it, expect } from 'vitest';
import { nextPrayerName } from '../web/src/lib/prayer.ts';

// Fixed prayer times as absolute instants — independent of TZ.
// Mirrors a typical Atlanta summer day: fajr ~05:00, sunrise ~06:26,
// dhuhr ~13:40, asr ~17:20, maghrib ~20:52, isha ~22:10 EDT.
const T = {
  fajr:    new Date('2026-06-21T05:00:00-04:00'),
  sunrise: new Date('2026-06-21T06:26:00-04:00'),
  dhuhr:   new Date('2026-06-21T13:40:00-04:00'),
  asr:     new Date('2026-06-21T17:20:00-04:00'),
  maghrib: new Date('2026-06-21T20:52:00-04:00'),
  isha:    new Date('2026-06-21T22:10:00-04:00'),
};

describe('nextPrayerName — all 7 branches', () => {
  it('returns "fajr" before fajr (pre-dawn)', () => {
    const before = new Date(T.fajr.getTime() - 1);
    expect(nextPrayerName(T, before)).toBe('fajr');
  });

  it('returns "sunrise" when at/after fajr but before sunrise', () => {
    expect(nextPrayerName(T, T.fajr)).toBe('sunrise');
    const mid = new Date((T.fajr.getTime() + T.sunrise.getTime()) / 2);
    expect(nextPrayerName(T, mid)).toBe('sunrise');
  });

  it('returns "dhuhr" when at/after sunrise but before dhuhr', () => {
    expect(nextPrayerName(T, T.sunrise)).toBe('dhuhr');
    const mid = new Date((T.sunrise.getTime() + T.dhuhr.getTime()) / 2);
    expect(nextPrayerName(T, mid)).toBe('dhuhr');
  });

  it('returns "asr" when at/after dhuhr but before asr', () => {
    expect(nextPrayerName(T, T.dhuhr)).toBe('asr');
    const mid = new Date((T.dhuhr.getTime() + T.asr.getTime()) / 2);
    expect(nextPrayerName(T, mid)).toBe('asr');
  });

  it('returns "maghrib" when at/after asr but before maghrib', () => {
    expect(nextPrayerName(T, T.asr)).toBe('maghrib');
    const mid = new Date((T.asr.getTime() + T.maghrib.getTime()) / 2);
    expect(nextPrayerName(T, mid)).toBe('maghrib');
  });

  it('returns "isha" when at/after maghrib but before isha', () => {
    expect(nextPrayerName(T, T.maghrib)).toBe('isha');
    const mid = new Date((T.maghrib.getTime() + T.isha.getTime()) / 2);
    expect(nextPrayerName(T, mid)).toBe('isha');
  });

  it('returns "none" when at/after isha (night — no more prayers today)', () => {
    expect(nextPrayerName(T, T.isha)).toBe('none');
    const late = new Date(T.isha.getTime() + 60_000);
    expect(nextPrayerName(T, late)).toBe('none');
  });
});

describe('nextPrayerName — boundary precision', () => {
  it('is strictly < sunrise when 1 ms before, >= sunrise when exactly at', () => {
    expect(nextPrayerName(T, new Date(T.sunrise.getTime() - 1))).toBe('sunrise');
    expect(nextPrayerName(T, T.sunrise)).toBe('dhuhr');
  });

  it('is strictly < isha when 1 ms before, "none" when exactly at', () => {
    expect(nextPrayerName(T, new Date(T.isha.getTime() - 1))).toBe('isha');
    expect(nextPrayerName(T, T.isha)).toBe('none');
  });
});
