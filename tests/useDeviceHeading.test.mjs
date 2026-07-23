// Tests for src/lib/useDeviceHeading.ts
//
// SETUP REQUIRED: Same as usePushOptIn.test.mjs — needs
// @testing-library/react-native installed:
//   npm install --save-dev @testing-library/react-native
// All tests are .todo until that dep is available.

import { describe, it, vi, expect, beforeEach } from 'vitest';

// Uncomment when @testing-library/react-native is available:
// import { renderHook, act } from '@testing-library/react-native';
// import { useDeviceHeading } from '../src/lib/useDeviceHeading.ts';

const mockGetForegroundPermissions = vi.fn();
const mockRequestForegroundPermissions = vi.fn();
const mockWatchHeading = vi.fn();

vi.mock('expo-location', () => ({
  getForegroundPermissionsAsync: mockGetForegroundPermissions,
  requestForegroundPermissionsAsync: mockRequestForegroundPermissions,
  watchHeadingAsync: mockWatchHeading,
}));

describe('useDeviceHeading — permission denied', () => {
  it.todo('returns hasPermission=false and heading=-1 when permission not granted');
  // mockGetForegroundPermissions.mockResolvedValue({ status: 'denied' });
  // const { result } = renderHook(() => useDeviceHeading());
  // await act(async () => {});
  // expect(result.current.hasPermission).toBe(false);
  // expect(result.current.heading).toBe(-1);
  // expect(mockWatchHeading).not.toHaveBeenCalled();
});

describe('useDeviceHeading — permission granted', () => {
  it.todo('starts the heading subscription when permission is granted');
  // mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
  // mockWatchHeading.mockResolvedValue({ remove: vi.fn() });
  // const { result } = renderHook(() => useDeviceHeading());
  // await act(async () => {});
  // expect(result.current.hasPermission).toBe(true);
  // expect(mockWatchHeading).toHaveBeenCalledOnce();

  it.todo('updates heading and accuracy when the subscription fires');
  // mockWatchHeading.mockImplementation(async (cb) => {
  //   cb({ trueHeading: 270, accuracy: 3 });
  //   return { remove: vi.fn() };
  // });
  // const { result } = renderHook(() => useDeviceHeading());
  // await act(async () => {});
  // expect(result.current.heading).toBe(270);
  // expect(result.current.accuracy).toBe(3);
});

describe('useDeviceHeading — requestPermission()', () => {
  it.todo('sets hasPermission=true after the user grants it');
  // mockGetForegroundPermissions.mockResolvedValueOnce({ status: 'denied' });
  // mockRequestForegroundPermissions.mockResolvedValueOnce({ status: 'granted' });
  // const { result } = renderHook(() => useDeviceHeading());
  // await act(async () => { await result.current.requestPermission(); });
  // expect(result.current.hasPermission).toBe(true);

  it.todo('keeps hasPermission=false when request is denied');
  // mockRequestForegroundPermissions.mockResolvedValueOnce({ status: 'denied' });
  // ...
});

describe('useDeviceHeading — cleanup', () => {
  it.todo('calls subscription.remove() on unmount');
  // const mockRemove = vi.fn();
  // mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
  // mockWatchHeading.mockResolvedValue({ remove: mockRemove });
  // const { unmount } = renderHook(() => useDeviceHeading());
  // await act(async () => {});
  // unmount();
  // expect(mockRemove).toHaveBeenCalledOnce();

  it.todo('does not throw when watchHeadingAsync throws (e.g. compass unavailable)');
  // mockGetForegroundPermissions.mockResolvedValue({ status: 'granted' });
  // mockWatchHeading.mockRejectedValueOnce(new Error('No compass'));
  // const { result } = renderHook(() => useDeviceHeading());
  // await act(async () => {});
  // expect(result.current.heading).toBe(-1); // still the default
});
