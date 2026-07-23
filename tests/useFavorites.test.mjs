// Tests for src/lib/useFavorites.tsx
//
// SETUP REQUIRED: needs @testing-library/react-native:
//   npm install --save-dev @testing-library/react-native
// All tests are .todo until that dep is available.

import { describe, it, vi, expect, beforeEach } from 'vitest';

// Uncomment when @testing-library/react-native is available:
// import { renderHook, act } from '@testing-library/react-native';
// import React from 'react';
// import { FavoritesProvider, useFavorites } from '../src/lib/useFavorites.tsx';

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
  },
}));

const mockFrom = vi.fn();
vi.mock('../src/lib/supabase.ts', () => ({
  supabase: { from: mockFrom },
}));

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// useFavorites — outside provider (error guard)
// ---------------------------------------------------------------------------

describe('useFavorites — outside provider', () => {
  it.todo('throws "useFavorites must be used within FavoritesProvider"');
  // const { result } = renderHook(() => useFavorites());
  // This should throw — wrap with expect(() => ...).toThrow() inside act.
  // OR: renderHook outside a provider wraps automatically; check error boundary.
});

// ---------------------------------------------------------------------------
// FavoritesProvider — initial load
// ---------------------------------------------------------------------------

describe('FavoritesProvider — initial load from AsyncStorage', () => {
  it.todo('isLoading=true initially, false after storage resolves');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify(['id-1']));
  // const wrapper = ({ children }) => React.createElement(FavoritesProvider, null, children);
  // const { result } = renderHook(() => useFavorites(), { wrapper });
  // expect(result.current.isLoading).toBe(true);
  // await act(async () => {});
  // expect(result.current.isLoading).toBe(false);

  it.todo('favorites is [] when AsyncStorage has null (first launch)');
  // mockGetItem.mockResolvedValueOnce(null);
  // ...
  // expect(result.current.favorites).toEqual([]);

  it.todo('favorites populated when AsyncStorage has a valid JSON array');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify(['id-1', 'id-2']));
  // ...
  // expect(result.current.favorites).toEqual(['id-1', 'id-2']);

  it.todo('favorites is [] when stored value is not an array (guard against corruption)');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify({ id: 'x' }));
  // ...
  // expect(result.current.favorites).toEqual([]);

  it.todo('favorites is [] when AsyncStorage.getItem throws (does not crash)');
  // mockGetItem.mockRejectedValueOnce(new Error('storage unavailable'));
  // ...
  // expect(result.current.isLoading).toBe(false);
  // expect(result.current.favorites).toEqual([]);
});

// ---------------------------------------------------------------------------
// isSaved
// ---------------------------------------------------------------------------

describe('isSaved', () => {
  it.todo('returns true when id is in favorites');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify(['id-1']));
  // ...
  // await act(async () => {});
  // expect(result.current.isSaved('id-1')).toBe(true);

  it.todo('returns false when id is not in favorites');
  // expect(result.current.isSaved('id-99')).toBe(false);
});

// ---------------------------------------------------------------------------
// toggle — add path
// ---------------------------------------------------------------------------

describe('toggle — add (not yet favorited)', () => {
  it.todo('adds the id to favorites and calls AsyncStorage.setItem');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify([]));
  // mockSetItem.mockResolvedValueOnce(undefined);
  // ...
  // await act(async () => { await result.current.toggle('id-new'); });
  // expect(result.current.favorites).toContain('id-new');
  // expect(mockSetItem).toHaveBeenCalledWith(
  //   'gb_favorites',
  //   JSON.stringify(['id-new'])
  // );

  it.todo('setItem failure is non-fatal (no throw into UI)');
  // mockSetItem.mockRejectedValueOnce(new Error('quota'));
  // await act(async () => { await result.current.toggle('id-new'); });
  // (no throw — caught internally)
});

// ---------------------------------------------------------------------------
// toggle — remove path
// ---------------------------------------------------------------------------

describe('toggle — remove (already favorited)', () => {
  it.todo('removes the id from favorites and persists the shorter list');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify(['id-1', 'id-2']));
  // mockSetItem.mockResolvedValueOnce(undefined);
  // ...
  // await act(async () => { await result.current.toggle('id-1'); });
  // expect(result.current.favorites).toEqual(['id-2']);
  // expect(mockSetItem).toHaveBeenCalledWith('gb_favorites', JSON.stringify(['id-2']));
});

// ---------------------------------------------------------------------------
// savedLocations — Supabase query
// ---------------------------------------------------------------------------

describe('savedLocations', () => {
  it.todo('returns [] when favorites is empty (skips DB call)');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify([]));
  // ...
  // const locs = await result.current.savedLocations();
  // expect(locs).toEqual([]);
  // expect(mockFrom).not.toHaveBeenCalled();

  it.todo('queries Supabase with .in("id", favorites) when list is non-empty');
  // mockGetItem.mockResolvedValueOnce(JSON.stringify(['id-1']));
  // const mockSelect = vi.fn().mockReturnThis();
  // const mockIn = vi.fn().mockResolvedValueOnce({ data: [{ id: 'id-1', name_en: 'Zafran' }], error: null });
  // mockFrom.mockReturnValue({ select: mockSelect.mockReturnValue({ in: mockIn }) });
  // ...
  // const locs = await result.current.savedLocations();
  // expect(locs[0].id).toBe('id-1');

  it.todo('returns [] on Supabase error (does not throw into UI)');
  // const mockIn = vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB down' } });
  // ...
  // const locs = await result.current.savedLocations();
  // expect(locs).toEqual([]);
});
