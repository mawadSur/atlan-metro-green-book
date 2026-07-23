import { describe, it, expect } from 'vitest';
import {
  typeStyle,
  typeLabel,
  localized,
  discountOffer,
  googleMapsUrl,
  halalLabel,
  TYPE_STYLE,
} from '../web/src/lib/display.ts';

// Minimal Location fixture — only the fields each function under test reads.
const baseLoc = {
  id: 'test-1',
  city_id: 'atlanta',
  type: 'restaurant',
  name_en: 'Test Grill',
  name_ar: 'مطعم التجربة',
  name_es: 'Parrilla de Prueba',
  address: '123 Main St, Atlanta, GA',
  lat: 33.75,
  lng: -84.39,
  phone: '',
  hours_en: 'Mon-Sun 10am-10pm',
  hours_ar: 'الإثنين-الأحد 10ص-10م',
  hours_es: 'Lun-Dom 10am-10pm',
  halal_certified: true,
  halal_status: 'verified',
  verified_by: 'IFANCA',
  verified_at: '2026-01-01',
  alcohol_free: true,
  prayer_space: false,
  family_friendly: true,
  worldcup_special: false,
  discount_code: null,
  discount_offer_en: '10% off',
  discount_offer_ar: 'خصم ١٠٪',
  discount_offer_es: '10% de descuento',
  image_url: '',
  source: 'test',
  osm_id: null,
};

// --- typeStyle -----------------------------------------------------------

describe('typeStyle', () => {
  it('returns the correct style object for every known type', () => {
    for (const type of Object.keys(TYPE_STYLE)) {
      const s = typeStyle(type);
      expect(s).toHaveProperty('icon');
      expect(s).toHaveProperty('from');
      expect(s).toHaveProperty('to');
      expect(s).toHaveProperty('pin');
    }
  });

  it('falls back to attraction for an unknown type', () => {
    // @ts-expect-error intentional bad type
    expect(typeStyle('unknown_type')).toEqual(TYPE_STYLE.attraction);
  });

  it('restaurant returns orange-family pin color', () => {
    expect(typeStyle('restaurant').pin).toBe('#ea580c');
  });

  it('masjid returns teal-family pin color', () => {
    expect(typeStyle('masjid').pin).toBe('#0f766e');
  });
});

// --- typeLabel -----------------------------------------------------------

describe('typeLabel', () => {
  it('returns the English label for restaurant', () => {
    const label = typeLabel('restaurant', 'en');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('returns different strings for different languages', () => {
    const en = typeLabel('masjid', 'en');
    const ar = typeLabel('masjid', 'ar');
    expect(en).not.toBe(ar);
  });

  it('falls back to the raw type string for an unknown type', () => {
    // @ts-expect-error intentional bad type
    expect(typeLabel('nonexistent', 'en')).toBe('nonexistent');
  });
});

// --- localized -----------------------------------------------------------

describe('localized', () => {
  it('returns the requested language when present', () => {
    expect(localized(baseLoc, 'name', 'ar')).toBe('مطعم التجربة');
    expect(localized(baseLoc, 'name', 'es')).toBe('Parrilla de Prueba');
    expect(localized(baseLoc, 'name', 'en')).toBe('Test Grill');
  });

  it('falls back to English when the requested lang field is empty', () => {
    const loc = { ...baseLoc, name_ar: '', name_es: '' };
    expect(localized(loc, 'name', 'ar')).toBe('Test Grill');
    expect(localized(loc, 'name', 'es')).toBe('Test Grill');
  });

  it('returns empty string when all name fields are empty', () => {
    const loc = { ...baseLoc, name_en: '', name_ar: '', name_es: '' };
    expect(localized(loc, 'name', 'en')).toBe('');
  });

  it('works for the hours base field', () => {
    expect(localized(baseLoc, 'hours', 'ar')).toBe('الإثنين-الأحد 10ص-10م');
  });

  it('hours: falls back to English when ar/es is empty', () => {
    const loc = { ...baseLoc, hours_ar: '' };
    expect(localized(loc, 'hours', 'ar')).toBe('Mon-Sun 10am-10pm');
  });
});

// --- discountOffer -------------------------------------------------------

describe('discountOffer', () => {
  it('returns the language-specific offer when present', () => {
    expect(discountOffer(baseLoc, 'en')).toBe('10% off');
    expect(discountOffer(baseLoc, 'ar')).toBe('خصم ١٠٪');
    expect(discountOffer(baseLoc, 'es')).toBe('10% de descuento');
  });

  it('falls back to English when the lang-specific field is empty', () => {
    const loc = { ...baseLoc, discount_offer_ar: '' };
    expect(discountOffer(loc, 'ar')).toBe('10% off');
  });

  it('returns empty string when all discount fields are empty', () => {
    const loc = {
      ...baseLoc,
      discount_offer_en: '',
      discount_offer_ar: '',
      discount_offer_es: '',
    };
    expect(discountOffer(loc, 'en')).toBe('');
    expect(discountOffer(loc, 'ar')).toBe('');
  });
});

// --- googleMapsUrl -------------------------------------------------------

describe('googleMapsUrl', () => {
  it('produces a Google Maps directions URL with the location lat/lng', () => {
    const url = googleMapsUrl(baseLoc);
    expect(url).toContain('https://www.google.com/maps/dir/');
    expect(url).toContain('33.75');
    expect(url).toContain('-84.39');
  });

  it('percent-encodes the query parameter', () => {
    const url = googleMapsUrl(baseLoc);
    // Space in name+address gets encoded; raw space must NOT appear in query param.
    expect(url).not.toMatch(/query=[^&]*\s/);
  });

  it('handles an empty address without throwing', () => {
    const loc = { ...baseLoc, address: '' };
    const url = googleMapsUrl(loc);
    expect(url).toContain('destination=');
  });

  it('handles special characters in name', () => {
    const loc = { ...baseLoc, name_en: "Ahmad's Grill & Café" };
    expect(() => googleMapsUrl(loc)).not.toThrow();
    const url = googleMapsUrl(loc);
    expect(url).toContain('query=');
  });
});

// --- halalLabel ----------------------------------------------------------

describe('halalLabel', () => {
  it('verified: tone is "verified" for all langs', () => {
    for (const lang of ['en', 'ar', 'es']) {
      expect(halalLabel({ ...baseLoc, halal_status: 'verified' }, lang).tone).toBe('verified');
    }
  });

  it('verified: English text includes the verifier name', () => {
    const l = halalLabel({ ...baseLoc, halal_status: 'verified', verified_by: 'IFANCA' }, 'en');
    expect(l.text).toContain('IFANCA');
    expect(l.text).toContain('verified by');
  });

  it('verified: falls back to "certifier" when verified_by is empty', () => {
    const l = halalLabel({ ...baseLoc, halal_status: 'verified', verified_by: '' }, 'en');
    expect(l.text).toContain('certifier');
  });

  it('verified: Arabic text contains verifier', () => {
    const l = halalLabel({ ...baseLoc, halal_status: 'verified', verified_by: 'IFANCA' }, 'ar');
    expect(l.text).toContain('IFANCA');
    expect(l.text).toContain('حلال');
  });

  it('community-listed: tone is "listed" for all langs', () => {
    for (const lang of ['en', 'ar', 'es']) {
      expect(
        halalLabel({ ...baseLoc, halal_status: 'community-listed' }, lang).tone
      ).toBe('listed');
    }
  });

  it('community-listed: English text contains "community-listed"', () => {
    const l = halalLabel({ ...baseLoc, halal_status: 'community-listed' }, 'en');
    expect(l.text).toContain('community-listed');
  });

  it('unverified: tone is "none" and text is empty', () => {
    const l = halalLabel({ ...baseLoc, halal_status: 'unverified' }, 'en');
    expect(l.tone).toBe('none');
    expect(l.text).toBe('');
  });

  it('unverified: same for all langs', () => {
    for (const lang of ['en', 'ar', 'es']) {
      const l = halalLabel({ ...baseLoc, halal_status: 'unverified' }, lang);
      expect(l.tone).toBe('none');
      expect(l.text).toBe('');
    }
  });
});
