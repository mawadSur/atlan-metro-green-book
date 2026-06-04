import { describe, it, expect } from 'vitest';
import { normalizeElement, dedupe } from '../src/onboarding/normalize.mjs';

describe('normalizeElement', () => {
  it('converts node with tags to record with correct type and flags', () => {
    const el = {
      type: 'node',
      id: 12345,
      lat: 33.7489999,
      lon: -84.3879999,
      tags: {
        name: 'The Halal Guys',
        amenity: 'restaurant',
        'diet:halal': 'yes',
      },
    };

    const result = normalizeElement(el, 'restaurant');

    expect(result).toMatchObject({
      type: 'restaurant',
      name_en: 'The Halal Guys',
      halal_certified: true,
      osm_id: 'node/12345',
      source: 'osm',
    });
    expect(result.lat).toBe(33.749); // rounded to 6 decimals
    expect(result.lng).toBe(-84.388);
  });

  it('sets masjid flags correctly', () => {
    const el = {
      type: 'node',
      id: 67890,
      lat: 33.7,
      lon: -84.4,
      tags: { name: 'Al-Farooq Masjid', amenity: 'place_of_worship' },
    };

    const result = normalizeElement(el, 'masjid');

    expect(result.prayer_space).toBe(true);
    expect(result.alcohol_free).toBe(true);
    expect(result.halal_certified).toBe(false); // masjids don't certify halal food
  });

  it('returns null when element has no name', () => {
    const el = {
      type: 'node',
      id: 999,
      lat: 33.7,
      lon: -84.4,
      tags: { amenity: 'restaurant' },
    };

    const result = normalizeElement(el, 'restaurant');

    expect(result).toBeNull();
  });

  it('extracts coords from center property for ways', () => {
    const el = {
      type: 'way',
      id: 54321,
      center: { lat: 33.755123, lon: -84.391234 },
      tags: { name: 'Park Place', leisure: 'park' },
    };

    const result = normalizeElement(el, 'park');

    expect(result).not.toBeNull();
    expect(result.lat).toBe(33.755123);
    expect(result.lng).toBe(-84.391234);
    expect(result.osm_id).toBe('way/54321');
  });

  it('returns null when element has no coordinates', () => {
    const el = {
      type: 'way',
      id: 888,
      tags: { name: 'Somewhere' },
    };

    const result = normalizeElement(el, 'attraction');

    expect(result).toBeNull();
  });

  it('handles phone numbers and address tags', () => {
    const el = {
      type: 'node',
      id: 111,
      lat: 33.8,
      lon: -84.5,
      tags: {
        name: 'Test Restaurant',
        phone: '+1 (404) 555-1234',
        'addr:housenumber': '123',
        'addr:street': 'Main St',
        'addr:city': 'Atlanta',
        'addr:state': 'GA',
        'addr:postcode': '30303',
      },
    };

    const result = normalizeElement(el, 'restaurant');

    expect(result.phone).toBe('+14045551234');
    expect(result.address).toBe('123 Main St, Atlanta, GA, 30303');
  });
});

describe('dedupe', () => {
  it('removes duplicate records with same osm_id', () => {
    const records = [
      {
        osm_id: 'node/123',
        name_en: 'Place A',
        lat: 33.7,
        lng: -84.4,
      },
      {
        osm_id: 'node/123',
        name_en: 'Place A',
        lat: 33.7,
        lng: -84.4,
      },
    ];

    const result = dedupe(records);

    expect(result).toHaveLength(1);
    expect(result[0].osm_id).toBe('node/123');
  });

  it('removes duplicate records with same normalized name within 75m', () => {
    const records = [
      {
        osm_id: 'node/123',
        name_en: 'The Coffee Shop',
        lat: 33.7,
        lng: -84.4,
      },
      {
        osm_id: 'node/456',
        name_en: 'The Coffee Shop',
        lat: 33.70001, // ~11m away
        lng: -84.40001,
      },
    ];

    const result = dedupe(records);

    expect(result).toHaveLength(1);
  });

  it('keeps records with same name but far apart', () => {
    const records = [
      {
        osm_id: 'node/123',
        name_en: 'Starbucks',
        lat: 33.7,
        lng: -84.4,
      },
      {
        osm_id: 'node/456',
        name_en: 'Starbucks',
        lat: 33.8, // ~11km away
        lng: -84.5,
      },
    ];

    const result = dedupe(records);

    expect(result).toHaveLength(2);
  });

  it('drops records matching existing array', () => {
    const existing = [
      {
        name_en: 'Hand Curated Place',
        lat: 33.75,
        lng: -84.39,
      },
    ];

    const records = [
      {
        osm_id: 'node/999',
        name_en: 'Hand Curated Place',
        lat: 33.75001, // same place, OSM scraped it too
        lng: -84.39001,
      },
      {
        osm_id: 'node/888',
        name_en: 'Different Place',
        lat: 33.9,
        lng: -84.2,
      },
    ];

    const result = dedupe(records, existing);

    expect(result).toHaveLength(1);
    expect(result[0].name_en).toBe('Different Place');
  });
});
