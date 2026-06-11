import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../src/lib/LangContext';
import { useFavorites } from '../../src/lib/useFavorites';
import { t } from '../../src/i18n/strings';
import { colors, spacing } from '../../src/theme/colors';
import { typeStyle, localized, typeLabel } from '../../src/lib/display';
import type { Location } from '../../src/lib/types';

function LocationCard({ location, lang }: { location: Location; lang: 'en' | 'ar' | 'es' }) {
  const style = typeStyle(location.type);
  const name = localized(location, 'name', lang);
  const label = typeLabel(location.type, lang);

  return (
    <Pressable
      onPress={() => router.push(`/location/${location.id}`)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{style.icon}</Text>
        <View style={styles.cardContent}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.type}>{label}</Text>
        </View>
      </View>
      {location.address && (
        <Text style={styles.address} numberOfLines={1}>
          {location.address}
        </Text>
      )}
    </Pressable>
  );
}

export default function SavedScreen() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { favorites, savedLocations, isLoading: favoritesLoading } = useFavorites();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  // Re-fetch whenever the favorites array changes (toggle on detail screen).
  useEffect(() => {
    if (!favoritesLoading) {
      loadSaved();
    }
  }, [favoritesLoading, favorites]);

  const loadSaved = async () => {
    if (!hasLoaded.current) {
      setIsLoading(true);
    }
    try {
      const saved = await savedLocations();
      setLocations(saved);
    } catch (error) {
      console.error('Failed to load saved locations:', error);
    } finally {
      if (!hasLoaded.current) {
        setIsLoading(false);
        hasLoaded.current = true;
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔖</Text>
        <Text style={styles.emptyTitle}>{t.noSavedPlaces[lang]}</Text>
        <Text style={styles.emptyMessage}>{t.tapBookmark[lang]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>{t.savedPlaces[lang]}</Text>
      </View>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LocationCard location={item} lang={lang} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 32,
    marginEnd: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 2,
  },
  type: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  address: {
    fontSize: 14,
    color: colors.inkSoft,
    marginStart: 48,
  },
});
