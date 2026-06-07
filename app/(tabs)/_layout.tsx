import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../../src/lib/LangContext';
import { t } from '../../src/i18n/strings';
import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  const { lang } = useLang();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkSoft,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.map[lang],
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: t.prayerTimes[lang],
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t.saved[lang],
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t.more[lang],
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
