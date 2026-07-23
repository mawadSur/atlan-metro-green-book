import { describe, it, expect } from 'vitest';
import { hasStoreLink, storeLinks } from '../web/src/lib/storeLinks.ts';

describe('hasStoreLink', () => {
  it('returns false for null', () => {
    expect(hasStoreLink(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasStoreLink(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasStoreLink('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(hasStoreLink('   ')).toBe(false);
  });

  it('returns true for a valid https URL', () => {
    expect(hasStoreLink('https://apps.apple.com/app/id123456')).toBe(true);
  });

  it('returns true for any non-empty string (no URL validation)', () => {
    // hasStoreLink only checks non-empty, not URL shape.
    expect(hasStoreLink('some-string')).toBe(true);
  });
});

describe('storeLinks', () => {
  it('exports storeLinks with appStoreUrl and playStoreUrl fields', () => {
    expect(storeLinks).toHaveProperty('appStoreUrl');
    expect(storeLinks).toHaveProperty('playStoreUrl');
  });

  it('points iOS users at the live App Store listing', () => {
    expect(storeLinks.appStoreUrl).toBe('https://apps.apple.com/us/app/muslim-green-book/id6778497186');
    expect(hasStoreLink(storeLinks.appStoreUrl)).toBe(true);
  });

  it('keeps Android in coming-soon mode until the Play Store listing is live', () => {
    expect(hasStoreLink(storeLinks.playStoreUrl)).toBe(false);
  });
});
