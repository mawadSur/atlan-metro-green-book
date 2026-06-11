import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import type { Lang } from './types';

// Remote push notifications (World Cup match alerts + app-wide announcements).
//
// Flow: the user opts in from the More tab -> we request OS permission, fetch
// this device's Expo push token, and register it via the write-only
// register_push_token RPC (migration 0006). The broadcast Edge Function later
// reads enabled tokens with the service role and fans messages out through the
// Expo Push API. Opting out flips the row to enabled=false via set_push_enabled
// (no deletion), and clears the local opt-in flag.
//
// Everything here is best-effort and never throws into the UI: a denied
// permission, a simulator with no push support, or a transient network error
// just resolves to a falsy result so the toggle can reflect reality.

const OPT_IN_KEY = 'gb_push_opt_in';
const TOKEN_KEY = 'gb_push_token';

export type PushOptInResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'denied' | 'unsupported' | 'error' };

/** Read the persisted opt-in flag (what the user last chose on this device). */
export async function getPushOptIn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OPT_IN_KEY)) === 'true';
  } catch {
    return false;
  }
}

/** The Expo projectId is required to mint a push token in SDK 49+. */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // Fallback for classic/embedded manifests.
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

function devicePlatform(): 'ios' | 'android' | 'unknown' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unknown';
}

/**
 * Configure how notifications surface while the app is foregrounded, and create
 * the Android notification channel (required on Android 8+ for any heads-up
 * display). Safe to call repeatedly; cheap and idempotent.
 */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#0f766e',
    });
  }
}

/**
 * Opt this device in: request permission, mint the Expo push token, and
 * register it server-side. Persists the opt-in flag + token on success. Returns
 * a discriminated result so the caller can show the right message.
 */
export async function enablePush(lang: Lang): Promise<PushOptInResult> {
  // Push tokens are not available on simulators/emulators.
  if (!Device.isDevice) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    await configureNotifications();

    const existing = await Notifications.getPermissionsAsync();
    let granted =
      existing.granted ||
      existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted && existing.canAskAgain !== false) {
      const req = await Notifications.requestPermissionsAsync();
      granted =
        req.granted ||
        req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }

    if (!granted) return { ok: false, reason: 'denied' };

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse.data;

    const { data, error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: devicePlatform(),
      p_lang: lang,
    });
    if (error || data !== true) return { ok: false, reason: 'error' };

    await AsyncStorage.multiSet([
      [OPT_IN_KEY, 'true'],
      [TOKEN_KEY, token],
    ]);
    return { ok: true, token };
  } catch (err) {
    console.warn('enablePush failed:', err);
    return { ok: false, reason: 'error' };
  }
}

/**
 * Opt this device out: flip the server row to enabled=false (best-effort) and
 * clear the local flag. We keep the stored token so a later re-enable can tell
 * the server to flip the same row back on.
 */
export async function disablePush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await supabase.rpc('set_push_enabled', {
        p_token: token,
        p_enabled: false,
      });
    }
  } catch (err) {
    console.warn('disablePush server update failed:', err);
  } finally {
    // Local intent is the source of truth for the toggle; clear it regardless.
    await AsyncStorage.setItem(OPT_IN_KEY, 'false');
  }
}

/**
 * DEV-only: schedule a local notification (no server, no push creds) to verify
 * the notification handler, Android channel, and tap→deep-link routing end to
 * end on-device. Also logs this device's Expo push token so you can copy it
 * into `scripts/send-push.mjs` to test the real remote-delivery leg. Returns
 * the token (or null if unavailable / not a physical device).
 *
 * NOTE: /match/* deep links open the canonical web page (atlan-green-book.vercel.app)
 * since the native app does not yet implement match screens.
 */
export async function sendLocalTest(): Promise<string | null> {
  try {
    await configureNotifications();

    // Ensure we at least have permission to display it.
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return null;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test notification',
        body: 'Tap me — I should deep-link to the Spain vs Saudi match.',
        data: { url: '/match/spain-saudi-arabia' },
      },
      trigger: { seconds: 2 } as Notifications.TimeIntervalTriggerInput,
    });

    let token: string | null = null;
    if (Device.isDevice) {
      const projectId = getProjectId();
      const resp = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = resp.data;
      console.log('[push] this device Expo token:', token);
    } else {
      console.log('[push] simulator — no remote push token available');
    }
    return token;
  } catch (err) {
    console.warn('sendLocalTest failed:', err);
    return null;
  }
}

/**
 * If the user previously opted in, silently refresh their token + language on
 * launch (tokens can rotate, and the user may have switched app language).
 * No permission prompt is shown — we only re-register an already-granted token.
 */
export async function refreshPushRegistration(lang: Lang): Promise<void> {
  try {
    if (!(await getPushOptIn())) return;
    if (!Device.isDevice) return;

    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await supabase.rpc('register_push_token', {
      p_token: tokenResponse.data,
      p_platform: devicePlatform(),
      p_lang: lang,
    });
    await AsyncStorage.setItem(TOKEN_KEY, tokenResponse.data);
  } catch (err) {
    console.warn('refreshPushRegistration failed:', err);
  }
}
