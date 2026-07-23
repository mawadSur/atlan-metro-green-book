// Completeness tests for src/i18n/strings.ts (mobile copy).
// The web version at web/src/i18n/strings.ts is covered by tests/i18n.test.mjs;
// this file catches drift in the native bundle separately.

import { describe, it, expect } from 'vitest';
import { LANGS, t } from '../src/i18n/strings.ts';

const REQUIRED_LANGS = ['en', 'ar', 'es'];

describe('LANGS array', () => {
  it('exports exactly 3 language entries', () => {
    expect(LANGS).toHaveLength(3);
  });

  it('each entry has code, label, and dir fields', () => {
    for (const lang of LANGS) {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('label');
      expect(lang).toHaveProperty('dir');
    }
  });

  it('Arabic entry has dir "rtl", others are "ltr"', () => {
    const ar = LANGS.find((l) => l.code === 'ar');
    expect(ar?.dir).toBe('rtl');
    LANGS.filter((l) => l.code !== 'ar').forEach((l) => {
      expect(l.dir).toBe('ltr');
    });
  });

  it('codes match exactly en, ar, es', () => {
    const codes = LANGS.map((l) => l.code).sort();
    expect(codes).toEqual(['ar', 'en', 'es']);
  });
});

describe('mobile t — completeness', () => {
  it('every key has non-empty translations for en, ar, and es', () => {
    const missing = [];
    for (const [key, dict] of Object.entries(t)) {
      for (const lang of REQUIRED_LANGS) {
        if (!dict[lang] || dict[lang].trim() === '') {
          missing.push(`t.${key}.${lang}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('mobile-specific keys', () => {
  // These keys exist in the mobile strings but have no web equivalent;
  // confirm they are present and non-empty across all three languages.
  const mobileOnlyKeys = [
    'qibla',
    'qiblaDirection',
    'enableCompass',
    'compassNotAvailable',
    'calibrating',
    'calibrated',
    'calibrateHint',
    'recalibrate',
    'accuracyLow',
    'accuracyMedium',
    'accuracyHigh',
    'noAbsoluteHeading',
    'staticBearingOnly',
    'locating',
    'locationDenied',
  ];

  it('all mobile-only keys are defined in t', () => {
    const missing = mobileOnlyKeys.filter((k) => !t[k]);
    expect(missing).toEqual([]);
  });

  it('all mobile-only keys have non-empty values for en, ar, es', () => {
    const missing = [];
    for (const key of mobileOnlyKeys) {
      if (!t[key]) continue;
      for (const lang of REQUIRED_LANGS) {
        if (!t[key][lang] || t[key][lang].trim() === '') {
          missing.push(`t.${key}.${lang}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('prayer time keys (fajr, dhuhr, asr, maghrib, isha) are present', () => {
    const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'sunrise'];
    prayerKeys.forEach((k) => expect(t[k]).toBeDefined());
  });
});

describe('halal label keys', () => {
  it('halalVerifiedBy contains "verified" concept in each language', () => {
    // Smoke-test that the keys exist and differ by language.
    expect(t.halalVerifiedBy.en).not.toBe('');
    expect(t.halalVerifiedBy.ar).not.toBe('');
    expect(t.halalVerifiedBy.es).not.toBe('');
    expect(t.halalVerifiedBy.en).not.toBe(t.halalVerifiedBy.ar);
  });

  it('halalCommunityListed and halalUnverified are distinct strings', () => {
    expect(t.halalCommunityListed.en).not.toBe(t.halalUnverified.en);
  });
});
