// Tests for web/src/lib/analytics.ts
// trackEvent wraps a third-party library and can't be meaningfully unit-tested
// beyond the "doesn't throw" contract. readUtm is pure logic and fully testable.

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@vercel/analytics/react', () => ({
  track: vi.fn(),
}));

const { readUtm, trackEvent } = await import('../web/src/lib/analytics.ts');

afterEach(() => vi.unstubAllGlobals());

// --------------------------------------------------------------------------
// readUtm
// --------------------------------------------------------------------------

describe('readUtm — server / no window', () => {
  it('returns {} when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined);
    expect(readUtm()).toEqual({});
  });
});

describe('readUtm — browser, no UTM params', () => {
  it('returns {} when the URL has no query string', () => {
    vi.stubGlobal('window', {
      location: { search: '' },
    });
    expect(readUtm()).toEqual({});
  });

  it('returns {} when the URL has unrelated query params', () => {
    vi.stubGlobal('window', {
      location: { search: '?foo=bar&baz=qux' },
    });
    expect(readUtm()).toEqual({});
  });
});

describe('readUtm — all three UTM params present', () => {
  it('extracts utm_source, utm_medium, and utm_campaign', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?utm_source=qr-t1&utm_medium=print&utm_campaign=worldcup26',
      },
    });
    expect(readUtm()).toEqual({
      utm_source: 'qr-t1',
      utm_medium: 'print',
      utm_campaign: 'worldcup26',
    });
  });
});

describe('readUtm — partial UTM params', () => {
  it('returns only the params that are present', () => {
    vi.stubGlobal('window', {
      location: { search: '?utm_source=partner&page=2' },
    });
    const result = readUtm();
    expect(result).toEqual({ utm_source: 'partner' });
    expect(result).not.toHaveProperty('utm_medium');
    expect(result).not.toHaveProperty('utm_campaign');
  });

  it('omits UTM keys whose value is empty string', () => {
    vi.stubGlobal('window', {
      location: { search: '?utm_source=&utm_medium=social' },
    });
    const result = readUtm();
    // utm_source is empty — URLSearchParams.get returns '' which is falsy
    expect(result).not.toHaveProperty('utm_source');
    expect(result.utm_medium).toBe('social');
  });
});

describe('readUtm — error resilience', () => {
  it('returns {} when accessing window.location throws', () => {
    vi.stubGlobal('window', {
      get location() {
        throw new Error('security error');
      },
    });
    expect(readUtm()).toEqual({});
  });
});

// --------------------------------------------------------------------------
// trackEvent
// --------------------------------------------------------------------------

describe('trackEvent — smoke tests', () => {
  it('does not throw when window is present', () => {
    vi.stubGlobal('window', { location: { search: '' } });
    expect(() => trackEvent('test_event')).not.toThrow();
  });

  it('does not throw when window is undefined (server guard)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => trackEvent('test_event', { count: 1 })).not.toThrow();
  });

  it('does not throw even if the underlying track() throws', async () => {
    const { track } = await import('@vercel/analytics/react');
    track.mockImplementationOnce(() => { throw new Error('analytics down'); });
    vi.stubGlobal('window', { location: { search: '' } });
    expect(() => trackEvent('fail_event')).not.toThrow();
  });
});
