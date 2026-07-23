// Tests for web/src/lib/saveList.ts — localStorage helpers only.
// encodeSavedIds / decodeSavedIds (the codec) are already covered in
// match.test.mjs.  This file fills the gap: getSaved, toggleSaved, isSaved.
//
// These functions are window-guarded; we control `window` via vi.stubGlobal.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Wipe module cache between describe blocks so each import sees fresh state.
// (saveList has module-level no state, but localStorage is stubbed per-block.)

afterEach(() => vi.unstubAllGlobals());

// ---------------------------------------------------------------------------
// Helper: build a minimal window stub with a map-backed localStorage.
// ---------------------------------------------------------------------------
function makeWindow(initial = {}) {
  const store = { ...initial };
  return {
    localStorage: {
      getItem: vi.fn((k) => store[k] ?? null),
      setItem: vi.fn((k, v) => { store[k] = v; }),
      removeItem: vi.fn((k) => { delete store[k]; }),
    },
  };
}

// ---------------------------------------------------------------------------
// getSaved
// ---------------------------------------------------------------------------

describe('getSaved — server guard (no window)', () => {
  it('returns [] when window is undefined (SSR)', async () => {
    vi.stubGlobal('window', undefined);
    const { getSaved } = await import('../web/src/lib/saveList.ts?srv');
    expect(getSaved()).toEqual([]);
  });
});

describe('getSaved — browser', () => {
  it('returns [] when localStorage key is absent', async () => {
    vi.stubGlobal('window', makeWindow());
    const { getSaved } = await import('../web/src/lib/saveList.ts?b-absent');
    expect(getSaved()).toEqual([]);
  });

  it('returns parsed ids from localStorage', async () => {
    const id = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
    vi.stubGlobal('window', makeWindow({ gb_saved_v1: JSON.stringify([id]) }));
    const { getSaved } = await import('../web/src/lib/saveList.ts?b-present');
    expect(getSaved()).toEqual([id]);
  });

  it('returns [] on invalid JSON (corrupted storage)', async () => {
    vi.stubGlobal('window', makeWindow({ gb_saved_v1: '{{{not-json' }));
    const { getSaved } = await import('../web/src/lib/saveList.ts?b-corrupt');
    expect(getSaved()).toEqual([]);
  });

  it('returns [] when stored value is not an array', async () => {
    vi.stubGlobal('window', makeWindow({ gb_saved_v1: JSON.stringify({ id: 'abc' }) }));
    const { getSaved } = await import('../web/src/lib/saveList.ts?b-obj');
    expect(getSaved()).toEqual([]);
  });

  it('filters non-id-like entries from stored array', async () => {
    const good = 'abcdef12-1234-abcd-ef01-234567890abc';
    vi.stubGlobal('window', makeWindow({
      gb_saved_v1: JSON.stringify([good, 'not-an-id!', '', 42, null]),
    }));
    const { getSaved } = await import('../web/src/lib/saveList.ts?b-filter');
    expect(getSaved()).toEqual([good]);
  });

  it('caps at 25 even if storage has more', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `a1b2c3d4-0000-0000-0000-${String(i).padStart(12, '0')}`);
    vi.stubGlobal('window', makeWindow({ gb_saved_v1: JSON.stringify(ids) }));
    const { getSaved } = await import('../web/src/lib/saveList.ts?b-cap');
    expect(getSaved().length).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// toggleSaved
// ---------------------------------------------------------------------------

describe('toggleSaved — server guard', () => {
  it('returns [] when window is undefined', async () => {
    vi.stubGlobal('window', undefined);
    const { toggleSaved } = await import('../web/src/lib/saveList.ts?ts-srv');
    expect(toggleSaved('a1b2c3d4-1234-5678-abcd-ef0123456789')).toEqual([]);
  });
});

describe('toggleSaved — add path', () => {
  it('adds an id to an empty list and persists', async () => {
    const win = makeWindow();
    vi.stubGlobal('window', win);
    const { toggleSaved } = await import('../web/src/lib/saveList.ts?ts-add');
    const id = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
    const result = toggleSaved(id);
    expect(result).toContain(id);
    expect(win.localStorage.setItem).toHaveBeenCalledWith('gb_saved_v1', JSON.stringify([id]));
  });

  it('does not add an invalid (non-id-like) id', async () => {
    const win = makeWindow();
    vi.stubGlobal('window', win);
    const { toggleSaved } = await import('../web/src/lib/saveList.ts?ts-bad-id');
    const result = toggleSaved('not!!an-id');
    expect(result).toEqual([]);
    expect(win.localStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('toggleSaved — remove path', () => {
  it('removes an existing id and persists the shorter list', async () => {
    const id = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
    const win = makeWindow({ gb_saved_v1: JSON.stringify([id]) });
    vi.stubGlobal('window', win);
    const { toggleSaved } = await import('../web/src/lib/saveList.ts?ts-remove');
    const result = toggleSaved(id);
    expect(result).not.toContain(id);
    expect(win.localStorage.setItem).toHaveBeenCalledWith('gb_saved_v1', JSON.stringify([]));
  });
});

describe('toggleSaved — cap at 25', () => {
  it('does not exceed 25 ids when adding to a full list', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `a1b2c3d4-0000-0000-0000-${String(i).padStart(12, '0')}`);
    const win = makeWindow({ gb_saved_v1: JSON.stringify(ids) });
    vi.stubGlobal('window', win);
    const { toggleSaved } = await import('../web/src/lib/saveList.ts?ts-cap');
    const newId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const result = toggleSaved(newId);
    expect(result.length).toBe(25);
    expect(result).not.toContain(newId);
  });
});

describe('toggleSaved — localStorage quota failure (non-fatal)', () => {
  it('still returns the intended list even if setItem throws', async () => {
    const id = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
    const win = makeWindow();
    win.localStorage.setItem = vi.fn(() => { throw new DOMException('QuotaExceededError'); });
    vi.stubGlobal('window', win);
    const { toggleSaved } = await import('../web/src/lib/saveList.ts?ts-quota');
    expect(() => toggleSaved(id)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isSaved
// ---------------------------------------------------------------------------

describe('isSaved', () => {
  it('returns false when window is undefined (server)', async () => {
    vi.stubGlobal('window', undefined);
    const { isSaved } = await import('../web/src/lib/saveList.ts?is-srv');
    expect(isSaved('a1b2c3d4-1234-5678-abcd-ef0123456789')).toBe(false);
  });

  it('returns true when id is in localStorage', async () => {
    const id = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
    vi.stubGlobal('window', makeWindow({ gb_saved_v1: JSON.stringify([id]) }));
    const { isSaved } = await import('../web/src/lib/saveList.ts?is-present');
    expect(isSaved(id)).toBe(true);
  });

  it('returns false when id is not in localStorage', async () => {
    const id = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
    vi.stubGlobal('window', makeWindow({ gb_saved_v1: JSON.stringify([id]) }));
    const { isSaved } = await import('../web/src/lib/saveList.ts?is-absent');
    expect(isSaved('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(false);
  });
});
