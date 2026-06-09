import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { LangProvider, useLang } from '../src/lib/LangContext';
import { configureNotifications, refreshPushRegistration } from '../src/lib/push';

/**
 * Wires push notifications into the app shell:
 *  - configures the foreground handler + Android channel on launch
 *  - silently refreshes an opted-in device's token/language
 *  - routes a notification tap to its `data.url` (e.g. a /match/... deep link),
 *    including the cold-start case where the app was opened by the tap.
 * Renders nothing; it lives inside LangProvider so it can re-register on a
 * language change.
 */
function NotificationsBridge() {
  const router = useRouter();
  const { lang } = useLang();
  const handledColdStart = useRef(false);

  // Route helper: only follow in-app paths we recognize; ignore anything else.
  const routeFromData = (data: unknown) => {
    const url = (data as { url?: unknown })?.url;
    if (typeof url === 'string' && url.startsWith('/')) {
      router.push(url as never);
    }
  };

  useEffect(() => {
    configureNotifications();
  }, []);

  useEffect(() => {
    refreshPushRegistration(lang);
  }, [lang]);

  useEffect(() => {
    // Cold start: app launched by tapping a notification.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          routeFromData(response.notification.request.content.data);
        }
      });
    }

    // Warm taps while the app is running/backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        routeFromData(response.notification.request.content.data);
      }
    );
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <NotificationsBridge />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="location/[id]"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </LangProvider>
    </SafeAreaProvider>
  );
}
