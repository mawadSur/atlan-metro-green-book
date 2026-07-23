// Tests for the useUserLocation hook in web/src/lib/geo.ts.
//
// SETUP REQUIRED: needs @testing-library/react (web, not RN) installed:
//   npm install --save-dev @testing-library/react
//
// The hook calls navigator.geolocation.getCurrentPosition, which we stub via
// vi.stubGlobal. All tests are .todo until the dep is confirmed available.

import { describe, it, vi, expect, afterEach } from 'vitest';

// Uncomment when @testing-library/react is available:
// import { renderHook, act } from '@testing-library/react';
// import { useUserLocation } from '../web/src/lib/geo.ts';

afterEach(() => vi.unstubAllGlobals());

// ---------------------------------------------------------------------------
// Geolocation granted — returns real coords
// ---------------------------------------------------------------------------

describe('useUserLocation — geolocation available and granted', () => {
  it.todo('returns real coords with usingFallback=false on success');
  // vi.stubGlobal('navigator', {
  //   geolocation: {
  //     getCurrentPosition: vi.fn((success) =>
  //       success({ coords: { latitude: 33.749, longitude: -84.388 } })
  //     ),
  //   },
  // });
  // const { result } = renderHook(() => useUserLocation());
  // await act(async () => {});
  // expect(result.current.coords).toEqual({ lat: 33.749, lng: -84.388 });
  // expect(result.current.usingFallback).toBe(false);
});

// ---------------------------------------------------------------------------
// Geolocation denied — Atlanta fallback
// ---------------------------------------------------------------------------

describe('useUserLocation — geolocation denied (permission error)', () => {
  it.todo('falls back to Atlanta coords with usingFallback=true on permission error');
  // vi.stubGlobal('navigator', {
  //   geolocation: {
  //     getCurrentPosition: vi.fn((_, error) =>
  //       error(new Error('User denied geolocation'))
  //     ),
  //   },
  // });
  // const { result } = renderHook(() => useUserLocation());
  // await act(async () => {});
  // expect(result.current.usingFallback).toBe(true);
  // expect(result.current.coords?.lat).toBeCloseTo(33.7545, 3);
  // expect(result.current.coords?.lng).toBeCloseTo(-84.3898, 3);
});

// ---------------------------------------------------------------------------
// Geolocation API absent (old browser / non-secure context)
// ---------------------------------------------------------------------------

describe('useUserLocation — geolocation unavailable', () => {
  it.todo('uses Atlanta fallback with usingFallback=true when navigator.geolocation is absent');
  // vi.stubGlobal('navigator', {}); // no .geolocation property
  // const { result } = renderHook(() => useUserLocation());
  // await act(async () => {});
  // expect(result.current.usingFallback).toBe(true);
  // expect(result.current.coords).not.toBeNull();
});

// ---------------------------------------------------------------------------
// Initial state (before effect fires)
// ---------------------------------------------------------------------------

describe('useUserLocation — initial state', () => {
  it.todo('returns coords=null and usingFallback=false before the effect resolves');
  // vi.stubGlobal('navigator', {
  //   geolocation: {
  //     getCurrentPosition: vi.fn(), // never calls callback
  //   },
  // });
  // const { result } = renderHook(() => useUserLocation());
  // // Do NOT flush the effect — check the synchronous initial state.
  // expect(result.current.coords).toBeNull();
  // expect(result.current.usingFallback).toBe(false);
});
