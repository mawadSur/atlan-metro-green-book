// Tests for src/lib/LangContext.tsx
//
// SETUP REQUIRED: needs @testing-library/react-native:
//   npm install --save-dev @testing-library/react-native
// All tests are .todo until that dep is available.
//
// Note: LangProvider gates render behind `isHydrated` — it returns null until
// AsyncStorage resolves. Tests must flush the effect before asserting state.

import { describe, it, vi, expect, beforeEach } from 'vitest';

// Uncomment when @testing-library/react-native is available:
// import { renderHook, act } from '@testing-library/react-native';
// import React from 'react';
// import { LangProvider, useLang } from '../src/lib/LangContext.tsx';

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
  },
}));

vi.mock('react-native', () => ({
  I18nManager: {
    isRTL: false,
    allowRTL: vi.fn(),
    forceRTL: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// useLang — outside provider
// ---------------------------------------------------------------------------

describe('useLang — outside provider', () => {
  it.todo('throws "useLang must be used within LangProvider"');
  // const { result } = renderHook(() => useLang());
  // (expect the thrown error)
});

// ---------------------------------------------------------------------------
// LangProvider — hydration gate
// ---------------------------------------------------------------------------

describe('LangProvider — hydration gate', () => {
  it.todo('renders null (returns no children) before AsyncStorage resolves');
  // The component returns null while !isHydrated; children should not render yet.
  // This is primarily a render-tree test — verify via the wrapper fixture.

  it.todo('renders children once AsyncStorage resolves');
  // mockGetItem.mockResolvedValueOnce('en');
  // ...await act(async () => {}); // flush storage effect
  // expect the hook to be callable (provider is in the tree)
});

// ---------------------------------------------------------------------------
// LangProvider — persisted language restore
// ---------------------------------------------------------------------------

describe('LangProvider — persisted language restore', () => {
  it.todo('defaults to "en" when storage has null (first launch)');
  // mockGetItem.mockResolvedValueOnce(null);
  // ...
  // expect(result.current.lang).toBe('en');

  it.todo('restores "ar" when storage has "ar"');
  // mockGetItem.mockResolvedValueOnce('ar');
  // ...
  // expect(result.current.lang).toBe('ar');

  it.todo('restores "es" when storage has "es"');
  // mockGetItem.mockResolvedValueOnce('es');
  // ...
  // expect(result.current.lang).toBe('es');

  it.todo('defaults to "en" when stored value is not a valid Lang code');
  // mockGetItem.mockResolvedValueOnce('fr'); // not a valid Lang
  // ...
  // expect(result.current.lang).toBe('en');

  it.todo('defaults to "en" when AsyncStorage.getItem throws (storage error)');
  // mockGetItem.mockRejectedValueOnce(new Error('storage broken'));
  // ...
  // expect(result.current.lang).toBe('en');
  // (and isHydrated=true so children render)
});

// ---------------------------------------------------------------------------
// setLang — state + persistence
// ---------------------------------------------------------------------------

describe('setLang', () => {
  it.todo('updates lang in state immediately');
  // mockGetItem.mockResolvedValueOnce('en');
  // mockSetItem.mockResolvedValueOnce(undefined);
  // ...
  // await act(async () => { result.current.setLang('ar'); });
  // expect(result.current.lang).toBe('ar');

  it.todo('calls AsyncStorage.setItem with the new lang');
  // expect(mockSetItem).toHaveBeenCalledWith('@greenbook:lang', 'ar');

  it.todo('setItem failure is fire-and-forget — does not throw into the caller');
  // mockSetItem.mockRejectedValueOnce(new Error('quota'));
  // await act(async () => { result.current.setLang('es'); });
  // expect(result.current.lang).toBe('es'); // state still updated
});

// ---------------------------------------------------------------------------
// RTL — I18nManager side-effects
// ---------------------------------------------------------------------------

describe('LangProvider — RTL side-effects', () => {
  it.todo('calls I18nManager.forceRTL(true) when lang is "ar"');
  // const { I18nManager } = await import('react-native');
  // mockGetItem.mockResolvedValueOnce('ar');
  // ...
  // expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);

  it.todo('calls I18nManager.forceRTL(false) when switching from "ar" to "en"');
  // Start with 'ar', call setLang('en'), verify forceRTL(false).

  it.todo('does not call forceRTL when isRTL already matches (no-op)');
  // I18nManager.isRTL = false; setLang('en') → forceRTL should NOT be called.
});
