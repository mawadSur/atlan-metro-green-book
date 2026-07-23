import { describe, it, expect } from 'vitest';

const { detectInstallTarget, appendTrackingParams, getSmartInstallUrl } = await import('../web/src/lib/smartRoute.ts');

describe('smart route target detection', () => {
  it('detects iOS user agents', () => {
    expect(detectInstallTarget('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
  });

  it('detects Android user agents', () => {
    expect(detectInstallTarget('Mozilla/5.0 (Linux; Android 15; Pixel)')).toBe('android');
  });

  it('falls back to web for desktop/unknown', () => {
    expect(detectInstallTarget('Mozilla/5.0 (Macintosh; Intel Mac OS X)')).toBe('web');
    expect(detectInstallTarget(null)).toBe('web');
  });
});

describe('smart route tracking params', () => {
  it('preserves UTM params', () => {
    const source = new URL('https://atlan-green-book.vercel.app/go?utm_source=qr-t1&utm_medium=print&utm_campaign=worldcup26');
    const destination = appendTrackingParams(new URL('https://apps.apple.com/app/id123'), source);
    expect(destination.searchParams.get('utm_source')).toBe('qr-t1');
    expect(destination.searchParams.get('utm_medium')).toBe('print');
    expect(destination.searchParams.get('utm_campaign')).toBe('worldcup26');
  });

  it('uses source as utm_source when utm_source is absent', () => {
    const source = new URL('https://atlan-green-book.vercel.app/go?source=mosque_alfarooq');
    const destination = appendTrackingParams(new URL('https://atlan-green-book.vercel.app/'), source);
    expect(destination.searchParams.get('utm_source')).toBe('mosque_alfarooq');
  });

  it('routes iOS users to the App Store with tracking params', () => {
    const url = getSmartInstallUrl(
      'https://atlan-green-book.vercel.app/go?utm_source=reddit_worldcup&utm_medium=community',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
    );
    expect(url).toBe(
      'https://apps.apple.com/us/app/muslim-green-book/id6778497186?utm_source=reddit_worldcup&utm_medium=community'
    );
  });

  it('falls back to the web app for Android until the Play Store listing is configured', () => {
    const url = getSmartInstallUrl(
      'https://atlan-green-book.vercel.app/go?utm_source=tabletent&utm_medium=print',
      'Mozilla/5.0 (Linux; Android 15; Pixel)'
    );
    expect(url).toBe('https://atlan-green-book.vercel.app/?utm_source=tabletent&utm_medium=print');
  });
});
