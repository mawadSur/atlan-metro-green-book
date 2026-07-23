// Tests for src/lib/geo.ts (mobile/RN).
// The web version (web/src/lib/distance.ts) is covered in match.test.mjs;
// this file targets the separate mobile implementation which diverges in that
// it uses ** instead of * for the Haversine intermediate value.
import { describe, it, expect } from 'vitest';
import { haversineDistance, formatDistance } from '../src/lib/geo.ts';

const STADIUM = { lat: 33.7553, lng: -84.4006 };
const FIVE_POINTS = { lat: 33.7539, lng: -84.3915 };

describe('haversineDistance — mobile', () => {
  it('same-point distance is effectively zero', () => {
    const d = haversineDistance(STADIUM, STADIUM);
    expect(d.miles).toBeCloseTo(0, 9);
    expect(d.km).toBeCloseTo(0, 9);
  });

  it('stadium → Five Points is within 0.3–0.7 mi', () => {
    const d = haversineDistance(STADIUM, FIVE_POINTS);
    expect(d.miles).toBeGreaterThan(0.3);
    expect(d.miles).toBeLessThan(0.7);
  });

  it('km is miles × 1.60934 (unit conversion is consistent)', () => {
    const d = haversineDistance(STADIUM, FIVE_POINTS);
    expect(d.km).toBeCloseTo(d.miles * 1.60934, 5);
  });

  it('is symmetric — A→B equals B→A', () => {
    const ab = haversineDistance(STADIUM, FIVE_POINTS).miles;
    const ba = haversineDistance(FIVE_POINTS, STADIUM).miles;
    expect(ab).toBeCloseTo(ba, 9);
  });

  it('returns positive values for any two distinct points', () => {
    const pairs = [
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 90 }],     // equatorial quarter-circle
      [{ lat: -33.87, lng: 151.21 }, { lat: 51.51, lng: -0.13 }], // Sydney → London
    ];
    for (const [a, b] of pairs) {
      const d = haversineDistance(a, b);
      expect(d.miles).toBeGreaterThan(0);
      expect(d.km).toBeGreaterThan(0);
    }
  });

  it('polar extremes: North Pole → South Pole ~12,436 mi', () => {
    const d = haversineDistance({ lat: 90, lng: 0 }, { lat: -90, lng: 0 });
    // Half Earth circumference ≈ 12,436 mi.
    expect(d.miles).toBeGreaterThan(12000);
    expect(d.miles).toBeLessThan(13000);
  });
});

describe('formatDistance — mobile', () => {
  const d = { miles: 0.47, km: 0.76 };

  it('English uses "mi" suffix', () => {
    const s = formatDistance(d, 'en');
    expect(s).toBe('0.5 mi');
  });

  it('Spanish also uses "mi" suffix', () => {
    const s = formatDistance(d, 'es');
    expect(s).toBe('0.5 mi');
  });

  it('Arabic uses ميل suffix', () => {
    const s = formatDistance(d, 'ar');
    expect(s).toContain('ميل');
    expect(s).toContain('0.5');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatDistance({ miles: 1.05, km: 1.69 }, 'en')).toBe('1.1 mi');
    expect(formatDistance({ miles: 0.99, km: 1.59 }, 'en')).toBe('1.0 mi');
  });

  it('handles zero distance', () => {
    expect(formatDistance({ miles: 0, km: 0 }, 'en')).toBe('0.0 mi');
  });
});
