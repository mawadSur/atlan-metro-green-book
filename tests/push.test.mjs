// Tests for src/lib/push.ts
// All Expo native modules and React Native are mocked — no device required.
// The suite validates the business-logic branches (permission denied, non-device,
// RPC failure, storage writes) without touching real hardware.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- module mocks (hoisted) ------------------------------------------------

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    multiSet: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

const mockIsDevice = vi.fn(() => true);
vi.mock('expo-device', () => ({
  default: {},
  get isDevice() { return mockIsDevice(); },
}));

const mockGetPerms = vi.fn();
const mockReqPerms = vi.fn();
const mockGetToken = vi.fn();
const mockSetHandler = vi.fn();
const mockSetChannel = vi.fn();

vi.mock('expo-notifications', () => ({
  default: {},
  setNotificationHandler: mockSetHandler,
  setNotificationChannelAsync: mockSetChannel,
  getPermissionsAsync: mockGetPerms,
  requestPermissionsAsync: mockReqPerms,
  getExpoPushTokenAsync: mockGetToken,
  IosAuthorizationStatus: { PROVISIONAL: 2 },
  AndroidImportance: { DEFAULT: 3 },
}));

const mockRpc = vi.fn();
vi.mock('../src/lib/supabase.ts', () => ({
  supabase: { rpc: mockRpc },
}));

// Must set env vars before the module is imported so hasSupabaseCreds resolves.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
const { getPushOptIn, enablePush, disablePush, configureNotifications } =
  await import('../src/lib/push.ts');

// ---------------------------------------------------------------------------

describe('getPushOptIn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when storage has "true"', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    expect(await getPushOptIn()).toBe(true);
  });

  it('returns false when storage has "false"', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('false');
    expect(await getPushOptIn()).toBe(false);
  });

  it('returns false when storage has null (key absent)', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await getPushOptIn()).toBe(false);
  });

  it('returns false when AsyncStorage throws (best-effort)', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await getPushOptIn()).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('configureNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls setNotificationHandler (Android channel call is conditional)', async () => {
    // Platform.OS = 'ios' (from mock above) — channel should NOT be called.
    await configureNotifications();
    expect(mockSetHandler).toHaveBeenCalledOnce();
    expect(mockSetChannel).not.toHaveBeenCalled();
  });

  it('sets the notification handler with shouldShowBanner: true', async () => {
    await configureNotifications();
    const handlerArg = mockSetHandler.mock.calls[0][0];
    const result = await handlerArg.handleNotification({});
    expect(result.shouldShowBanner).toBe(true);
    expect(result.shouldPlaySound).toBe(true);
    expect(result.shouldSetBadge).toBe(false);
  });

  it('calls setNotificationChannelAsync on Android', async () => {
    // Temporarily override Platform.OS to android for this test only.
    const { Platform } = await import('react-native');
    const originalOS = Platform.OS;
    // vi.mock hoists, so we mutate the mock's property directly.
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    await configureNotifications();
    expect(mockSetChannel).toHaveBeenCalledOnce();
    expect(mockSetChannel).toHaveBeenCalledWith('default', expect.objectContaining({
      name: 'Announcements',
    }));

    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true, configurable: true });
  });
});

// ---------------------------------------------------------------------------

describe('enablePush — non-device (simulator)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { ok: false, reason: "unsupported" } on simulator', async () => {
    mockIsDevice.mockReturnValueOnce(false);
    const result = await enablePush('en');
    expect(result).toEqual({ ok: false, reason: 'unsupported' });
    expect(mockGetPerms).not.toHaveBeenCalled();
  });
});

describe('enablePush — permission denied', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns denied when OS permission is denied and canAskAgain is true', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    mockReqPerms.mockResolvedValueOnce({ granted: false });
    const result = await enablePush('en');
    expect(result).toEqual({ ok: false, reason: 'denied' });
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('returns denied without re-prompting when canAskAgain is false', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: false, canAskAgain: false });
    const result = await enablePush('en');
    expect(result).toEqual({ ok: false, reason: 'denied' });
    expect(mockReqPerms).not.toHaveBeenCalled();
  });

  it('skips the request when permission is already granted', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: true });
    mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    AsyncStorage.multiSet.mockResolvedValueOnce(undefined);

    const result = await enablePush('en');
    expect(mockReqPerms).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('treats iOS PROVISIONAL status as granted (skips re-request)', async () => {
    mockIsDevice.mockReturnValue(true);
    // ios.status === PROVISIONAL (2) → treated as granted without prompting.
    mockGetPerms.mockResolvedValueOnce({
      granted: false,
      ios: { status: 2 }, // IosAuthorizationStatus.PROVISIONAL
      canAskAgain: true,
    });
    mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[prov]' });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    AsyncStorage.multiSet.mockResolvedValueOnce(undefined);

    const result = await enablePush('en');
    expect(mockReqPerms).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.token).toBe('ExponentPushToken[prov]');
  });
});

describe('enablePush — RPC failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { ok: false, reason: "error" } when RPC returns an error object', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: true });
    mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB down' } });

    const result = await enablePush('en');
    expect(result).toEqual({ ok: false, reason: 'error' });
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it('returns { ok: false, reason: "error" } when RPC returns false (not true)', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: true });
    mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const result = await enablePush('en');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });

  it('returns { ok: false, reason: "error" } when getExpoPushTokenAsync throws', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: true });
    mockGetToken.mockRejectedValueOnce(new Error('No project ID'));

    const result = await enablePush('en');
    expect(result).toEqual({ ok: false, reason: 'error' });
  });
});

describe('enablePush — happy path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { ok: true, token } and persists opt-in + token', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: true });
    mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[xyz123]' });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    AsyncStorage.multiSet.mockResolvedValueOnce(undefined);

    const result = await enablePush('ar');
    expect(result).toEqual({ ok: true, token: 'ExponentPushToken[xyz123]' });
    expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
      ['gb_push_opt_in', 'true'],
      ['gb_push_token', 'ExponentPushToken[xyz123]'],
    ]);
  });

  it('passes lang to the RPC', async () => {
    mockIsDevice.mockReturnValue(true);
    mockGetPerms.mockResolvedValueOnce({ granted: true });
    mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[xyz]' });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    AsyncStorage.multiSet.mockResolvedValueOnce(undefined);

    await enablePush('es');
    expect(mockRpc).toHaveBeenCalledWith(
      'register_push_token',
      expect.objectContaining({ p_lang: 'es' })
    );
  });
});

// ---------------------------------------------------------------------------

describe('disablePush', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls set_push_enabled RPC when a token is stored', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('ExponentPushToken[abc]');
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    await disablePush();
    expect(mockRpc).toHaveBeenCalledWith('set_push_enabled', {
      p_token: 'ExponentPushToken[abc]',
      p_enabled: false,
    });
  });

  it('skips the RPC when no token is stored (clean uninstall)', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    await disablePush();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does not throw when the RPC fails (best-effort, fire-and-forget)', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('ExponentPushToken[abc]');
    mockRpc.mockRejectedValueOnce(new Error('network down'));
    await expect(disablePush()).resolves.toBeUndefined();
  });

  it('does not throw when AsyncStorage.getItem fails', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage full'));
    await expect(disablePush()).resolves.toBeUndefined();
  });

  it('always clears the local opt-in flag (even when the RPC fails)', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('ExponentPushToken[abc]');
    mockRpc.mockRejectedValueOnce(new Error('network down'));

    await disablePush();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('gb_push_opt_in', 'false');
  });

  it('clears the local flag even when no token is stored', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    await disablePush();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('gb_push_opt_in', 'false');
  });
});
