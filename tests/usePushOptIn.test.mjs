// Tests for src/lib/usePushOptIn.ts
//
// SETUP REQUIRED: These tests need `@testing-library/react-native` to call
// hooks outside a component. Install with:
//   npm install --save-dev @testing-library/react-native
// Until then every test is marked .todo so the suite still passes.

import { describe, it, vi, expect, beforeEach } from 'vitest';

// Uncomment when @testing-library/react-native is available:
// import { renderHook, act } from '@testing-library/react-native';
// import { usePushOptIn } from '../src/lib/usePushOptIn.ts';

// --- mock push module ------------------------------------------------------
const mockGetPushOptIn = vi.fn();
const mockEnablePush = vi.fn();
const mockDisablePush = vi.fn();

vi.mock('../src/lib/push.ts', () => ({
  getPushOptIn: mockGetPushOptIn,
  enablePush: mockEnablePush,
  disablePush: mockDisablePush,
}));

vi.mock('../src/lib/LangContext.tsx', () => ({
  useLang: () => ({ lang: 'en' }),
}));

describe('usePushOptIn — initial state (busy while loading)', () => {
  it.todo('starts with busy=true, enabled=false, lastError=null');
  // const { result } = renderHook(() => usePushOptIn());
  // expect(result.current.busy).toBe(true);
  // expect(result.current.enabled).toBe(false);
  // expect(result.current.lastError).toBeNull();
});

describe('usePushOptIn — resolves from storage', () => {
  it.todo('busy=false and enabled=true when storage returns true');
  // mockGetPushOptIn.mockResolvedValueOnce(true);
  // const { result } = renderHook(() => usePushOptIn());
  // await act(async () => {}); // flush effect
  // expect(result.current.busy).toBe(false);
  // expect(result.current.enabled).toBe(true);

  it.todo('busy=false and enabled=false when storage returns false');
  // mockGetPushOptIn.mockResolvedValueOnce(false);
  // const { result } = renderHook(() => usePushOptIn());
  // await act(async () => {});
  // expect(result.current.enabled).toBe(false);
});

describe('usePushOptIn — toggle(true) — success', () => {
  it.todo('sets enabled=true and clears lastError on successful enablePush');
  // mockGetPushOptIn.mockResolvedValueOnce(false);
  // mockEnablePush.mockResolvedValueOnce({ ok: true, token: 'ExponentPushToken[x]' });
  // const { result } = renderHook(() => usePushOptIn());
  // await act(async () => {});
  // await act(async () => { await result.current.toggle(true); });
  // expect(result.current.enabled).toBe(true);
  // expect(result.current.lastError).toBeNull();
  // expect(result.current.busy).toBe(false);
});

describe('usePushOptIn — toggle(true) — permission denied', () => {
  it.todo('stays disabled and sets lastError="denied" when enablePush is denied');
  // mockGetPushOptIn.mockResolvedValueOnce(false);
  // mockEnablePush.mockResolvedValueOnce({ ok: false, reason: 'denied' });
  // const { result } = renderHook(() => usePushOptIn());
  // await act(async () => {});
  // await act(async () => { await result.current.toggle(true); });
  // expect(result.current.enabled).toBe(false);
  // expect(result.current.lastError).toBe('denied');

  it.todo('sets lastError="unsupported" on simulator');
  // mockEnablePush.mockResolvedValueOnce({ ok: false, reason: 'unsupported' });
  // ...same pattern, expect lastError === 'unsupported'
});

describe('usePushOptIn — toggle(false)', () => {
  it.todo('calls disablePush and sets enabled=false');
  // mockGetPushOptIn.mockResolvedValueOnce(true);
  // const { result } = renderHook(() => usePushOptIn());
  // await act(async () => {});
  // await act(async () => { await result.current.toggle(false); });
  // expect(mockDisablePush).toHaveBeenCalledOnce();
  // expect(result.current.enabled).toBe(false);

  it.todo('busy is false after toggle completes');
  // (same setup — assert result.current.busy === false in finally)
});

describe('usePushOptIn — unmount cleanup', () => {
  it.todo('does not set state after unmount (avoids React warning)');
  // const { result, unmount } = renderHook(() => usePushOptIn());
  // unmount();
  // (No warning about "state update on unmounted component" in console)
});
