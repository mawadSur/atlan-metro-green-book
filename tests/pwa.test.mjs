// Tests for web/src/lib/pwa.ts
// pwa.ts has module-level side effects that attach to `window`, so this suite
// uses vi.stubGlobal to control the environment per-test.  The module is
// re-imported via dynamic import inside each describe block so the side effects
// run against the stubbed globals.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --------------------------------------------------------------------------
// isStandalone
// --------------------------------------------------------------------------

describe('isStandalone — server (no window)', () => {
  it('returns false when window is undefined (SSR guard)', async () => {
    vi.stubGlobal('window', undefined);
    const { isStandalone } = await import('../web/src/lib/pwa.ts?ssr');
    expect(isStandalone()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('isStandalone — iOS standalone (navigator.standalone)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns true when navigator.standalone is true (iOS installed)', async () => {
    vi.stubGlobal('window', {
      navigator: { standalone: true },
      matchMedia: () => ({ matches: false }),
      addEventListener: vi.fn(),
    });
    // Re-import after stubbing.
    const mod = await import('../web/src/lib/pwa.ts?ios-standalone');
    expect(mod.isStandalone()).toBe(true);
  });

  it('returns false when navigator.standalone is false (iOS browser)', async () => {
    vi.stubGlobal('window', {
      navigator: { standalone: false },
      matchMedia: () => ({ matches: false }),
      addEventListener: vi.fn(),
    });
    const mod = await import('../web/src/lib/pwa.ts?ios-browser');
    expect(mod.isStandalone()).toBe(false);
  });
});

describe('isStandalone — Chrome/Edge via matchMedia', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns true when display-mode is standalone', async () => {
    vi.stubGlobal('window', {
      navigator: {},
      matchMedia: (query) => ({ matches: query.includes('standalone') }),
      addEventListener: vi.fn(),
    });
    const mod = await import('../web/src/lib/pwa.ts?chrome-standalone');
    expect(mod.isStandalone()).toBe(true);
  });

  it('returns false in normal browser (non-standalone matchMedia)', async () => {
    vi.stubGlobal('window', {
      navigator: {},
      matchMedia: () => ({ matches: false }),
      addEventListener: vi.fn(),
    });
    const mod = await import('../web/src/lib/pwa.ts?chrome-browser');
    expect(mod.isStandalone()).toBe(false);
  });
});

// --------------------------------------------------------------------------
// promptInstall
// --------------------------------------------------------------------------

describe('promptInstall', () => {
  it('throws when called with no deferred prompt available (canInstall() = false)', async () => {
    // Fresh import in a window-free context so deferredPrompt stays null.
    vi.stubGlobal('window', { addEventListener: vi.fn(), navigator: {} });
    const mod = await import('../web/src/lib/pwa.ts?no-prompt');
    await expect(mod.promptInstall()).rejects.toThrow(/not available/i);
    vi.unstubAllGlobals();
  });
});

// --------------------------------------------------------------------------
// canInstall — default false (no beforeinstallprompt fired)
// --------------------------------------------------------------------------

describe('canInstall', () => {
  it('returns false when no install prompt has been captured', async () => {
    vi.stubGlobal('window', { addEventListener: vi.fn(), navigator: {} });
    const mod = await import('../web/src/lib/pwa.ts?no-install');
    expect(mod.canInstall()).toBe(false);
    vi.unstubAllGlobals();
  });
});
