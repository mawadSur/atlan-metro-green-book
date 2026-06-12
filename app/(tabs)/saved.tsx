import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../src/lib/LangContext';
import { useFavorites } from '../../src/lib/useFavorites';
import { t } from '../../src/i18n/strings';
import { colors, spacing, maxFontScale } from '../../src/theme/colors';
import type { Location } from '../../src/lib/types';
import { LocationCard } from '../../src/components/LocationCard';

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
        <Text style={styles.emptyTitle} maxFontSizeMultiplier={maxFontScale}>{t.noSavedPlaces[lang]}</Text>
        <Text style={styles.emptyMessage}>{t.tapBookmark[lang]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={maxFontScale}>{t.savedPlaces[lang]}</Text>
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
});
