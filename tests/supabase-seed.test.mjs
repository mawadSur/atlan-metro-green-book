// Tests for src/lib/supabase.ts — offline seed path only.
// No network is touched. The Supabase client, AsyncStorage, and React Native
// are mocked so the module loads in a Node environment.
//
// Covers: normalizeSeed (indirectly via getSeedLocations), getSeedLocations
// filtering/pagination, getLocationById offline fallback, and the
// hasSupabaseCreds=false short-circuit in getLocations.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- module mocks ----------------------------------------------------------

vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: vi.fn() }) }) }),
    rpc: vi.fn(),
  }),
}));

// Provide minimal seed data so normalizeSeed has something to work with.
vi.mock('../src/data/atlanta-merged.json', () => ({
  default: {
    locations: [
      {
        id: 'seed-1',
        type: 'restaurant',
        name_en: 'Zafran Grill',
        name_ar: 'مطعم زعفران',
        name_es: 'Parrilla Zafran',
        address: '100 Peachtree St',
        lat: 33.749,
        lng: -84.388,
        halal_certified: true,
      },
      {
        id: 'seed-2',
        type: 'masjid',
        name_en: 'Al-Farooq Mosque',
        name_ar: 'مسجد الفاروق',
        name_es: 'Mezquita Al-Farooq',
        address: '442 14th St NW',
        lat: 33.788,
        lng: -84.400,
        halal_certified: false,
        prayer_space: true,
      },
      {
        id: 'seed-3',
        type: 'grocery',
        name_en: 'Ameen Market',
        name_ar: 'سوق أمين',
        name_es: 'Mercado Ameen',
        address: '555 Buford Hwy',
        lat: 33.810,
        lng: -84.360,
        halal_certified: false,
      },
    ],
  },
}));

// Clear env vars to force offline mode (hasSupabaseCreds = false).
delete process.env.EXPO_PUBLIC_SUPABASE_URL;
delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const { getSeedLocations, getLocations, getLocationById, getCity } =
  await import('../src/lib/supabase.ts');

// ---------------------------------------------------------------------------

describe('getSeedLocations — non-atlanta city', () => {
  it('returns [] for any city other than atlanta', () => {
    expect(getSeedLocations('dallas')).toEqual([]);
    expect(getSeedLocations('')).toEqual([]);
  });
});

describe('getSeedLocations — normalization', () => {
  it('returns Location objects with all required fields', () => {
    const results = getSeedLocations('atlanta');
    expect(results.length).toBeGreaterThan(0);
    const loc = results[0];
    expect(loc).toHaveProperty('id');
    expect(loc).toHaveProperty('city_id', 'atlanta');
    expect(loc).toHaveProperty('type');
    expect(loc).toHaveProperty('halal_status');
    expect(loc).toHaveProperty('halal_certified');
    expect(loc).toHaveProperty('alcohol_free');
    expect(loc).toHaveProperty('prayer_space');
  });

  it('maps halal_certified=true to halal_status "community-listed"', () => {
    const results = getSeedLocations('atlanta');
    const restaurant = results.find((l) => l.id === 'seed-1');
    expect(restaurant?.halal_status).toBe('community-listed');
  });

  it('maps halal_certified=false to halal_status "unverified"', () => {
    const results = getSeedLocations('atlanta');
    const mosque = results.find((l) => l.id === 'seed-2');
    expect(mosque?.halal_status).toBe('unverified');
  });

  it('sets source to "seed" for seed records that lack a source field', () => {
    const results = getSeedLocations('atlanta');
    expect(results.every((l) => l.source === 'seed')).toBe(true);
  });
});

describe('getSeedLocations — type filtering', () => {
  it('returns only records of the requested type', () => {
    const results = getSeedLocations('atlanta', { types: ['masjid'] });
    expect(results.every((l) => l.type === 'masjid')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns all types when types option is absent', () => {
    const all = getSeedLocations('atlanta');
    const types = [...new Set(all.map((l) => l.type))];
    expect(types.length).toBeGreaterThan(1);
  });

  it('returns [] for a type not present in seed', () => {
    const results = getSeedLocations('atlanta', { types: ['worldcup_venue'] });
    expect(results).toEqual([]);
  });
});

describe('getSeedLocations — bounds filtering', () => {
  it('filters locations outside the bounding box', () => {
    // Tight box around the restaurant only (lat 33.749).
    const results = getSeedLocations('atlanta', {
      bounds: { south: 33.74, north: 33.76, west: -84.40, east: -84.38 },
    });
    expect(results.every((l) => l.lat >= 33.74 && l.lat <= 33.76)).toBe(true);
  });

  it('includes locations whose coords are exactly on the boundary', () => {
    const results = getSeedLocations('atlanta', {
      bounds: { south: 33.749, north: 33.749, west: -84.388, east: -84.388 },
    });
    // seed-1 is at exactly 33.749 / -84.388 — must be included.
    expect(results.some((l) => l.id === 'seed-1')).toBe(true);
  });
});

describe('getSeedLocations — pagination', () => {
  it('respects limit option', () => {
    const results = getSeedLocations('atlanta', { limit: 1 });
    expect(results.length).toBe(1);
  });

  it('respects offset option', () => {
    const all = getSeedLocations('atlanta');
    const page = getSeedLocations('atlanta', { offset: 1, limit: 1 });
    expect(page[0].id).toBe(all[1].id);
  });

  it('returns empty array when offset >= total results', () => {
    const results = getSeedLocations('atlanta', { offset: 9999 });
    expect(results).toEqual([]);
  });

  it('returns results sorted by name_en ascending', () => {
    const results = getSeedLocations('atlanta');
    for (let i = 1; i < results.length; i++) {
      expect(results[i].name_en >= results[i - 1].name_en).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe('getLocations — offline (no creds)', () => {
  it('falls back to seed when env vars are missing (hasSupabaseCreds=false)', async () => {
    const results = await getLocations('atlanta');
    expect(results.length).toBeGreaterThan(0);
    // All records should come from the seed (have synthetic ids or 'seed' source).
    expect(results.every((l) => l.source === 'seed')).toBe(true);
  });

  it('returns [] for non-atlanta city with no creds', async () => {
    const results = await getLocations('houston');
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('getLocationById — offline fallback', () => {
  it('finds a location by its seed id', async () => {
    const loc = await getLocationById('seed-2');
    expect(loc).not.toBeNull();
    expect(loc?.name_en).toBe('Al-Farooq Mosque');
  });

  it('returns null for an id that does not exist in seed', async () => {
    const loc = await getLocationById('nonexistent-id-99999');
    expect(loc).toBeNull();
  });

  it('returns null for a live DB id when no creds are set (offline)', async () => {
    // A UUID-style id that would only exist in the live DB.
    const loc = await getLocationById('a1b2c3d4-1234-5678-abcd-ef0123456789');
    expect(loc).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('getCity — offline (no creds)', () => {
  it('returns null when env vars are missing (hasSupabaseCreds=false)', async () => {
    // Env vars are deleted at the top of this file, so getCity cannot hit
    // the live backend and returns null immediately.
    const city = await getCity('atlanta');
    expect(city).toBeNull();
  });

  it('returns null for any other cityId when offline', async () => {
    const city = await getCity('dallas');
    expect(city).toBeNull();
  });

  it('returns null when called with no argument (defaults to "atlanta") while offline', async () => {
    const city = await getCity();
    expect(city).toBeNull();
  });
});
