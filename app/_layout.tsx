import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LangProvider } from '../src/lib/LangContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
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
