import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../src/lib/LangContext';
import { getLocations, getSeedLocations } from '../../src/lib/supabase';
import type { Location, Filters } from '../../src/lib/types';
import type { Coordinates } from '../../src/lib/geo';
import { LocationCard } from '../../src/components/LocationCard';
import { FilterChips } from '../../src/components/FilterChips';
import { typeStyle } from '../../src/lib/display';
import { t } from '../../src/i18n/strings';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, maxFontScale, contentMaxWidth } from '../../src/theme/colors';

const ATLANTA_CENTER = { lat: 33.7545, lng: -84.3898 };
const MAX_MARKERS = 300;

export default function MapListScreen() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  // Default to the List view (not the map). On iPad the react-native-maps
  // MapView (New Arch / Fabric) can retain the touch responder so the header
  // controls render but stop responding — the likely cause of the repeated iPad
  // 2.1(a) "unable to set the widgets" rejections. Landing on the List keeps the
  // first screen a plain, reliably-tappable FlatList; the map is one tap away.
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoords, setUserCoords] = useState<Coordinates | undefined>(undefined);

  const [filters, setFilters] = useState<Filters>({
    halal_certified: false,
    alcohol_free: false,
    prayer_space: false,
    family_friendly: false,
  });

  // Load locations on mount
  useEffect(() => {
    loadLocations();
    loadUserLocation();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      setError(null);
      const data = await getLocations('atlanta');
      // getLocations already falls back to the bundled seed on failure, but
      // guard here too so the reviewer is never left on an empty screen with no
      // controls to operate.
      setLocations(data.length > 0 ? data : getSeedLocations('atlanta'));
    } catch (err) {
      // Last-resort fallback: render the bundled data instead of an error wall
      // that hides the search box, filters, and map/list toggle entirely.
      console.warn('Failed to load locations; using offline seed:', err);
      const seed = getSeedLocations('atlanta');
      if (seed.length > 0) {
        setLocations(seed);
      } else {
        setError(t.errorLoadingPlaces[lang]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadUserLocation() {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const location = await ExpoLocation.getCurrentPositionAsync({});
      setUserCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (err) {
      console.warn('Failed to get user location:', err);
    }
  }

  const toggleFilter = (key: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Apply filters and search
  const filteredLocations = useMemo(() => {
    let result = locations;

    // Apply attribute filters
    const activeFilters = Object.entries(filters).filter(([, active]) => active);
    if (activeFilters.length > 0) {
      result = result.filter((loc) =>
        activeFilters.every(([key]) => {
          if (key === 'halal_certified') {
            return loc.halal_status === 'verified' || loc.halal_certified;
          }
          return loc[key as keyof Location] === true;
        })
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.name_en.toLowerCase().includes(query) ||
          loc.name_ar.includes(query) ||
          loc.name_es.toLowerCase().includes(query) ||
          loc.address.toLowerCase().includes(query)
      );
    }

    return result;
  }, [locations, filters, searchQuery]);

  // Cap markers for performance
  const displayMarkers = useMemo(() => {
    return filteredLocations.slice(0, MAX_MARKERS);
  }, [filteredLocations]);

  const handleMarkerPress = (location: Location) => {
    router.push(`/location/${location.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>{t.loading[lang]}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle} maxFontSizeMultiplier={maxFontScale}>{t.errorTitle[lang]}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={loadLocations}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText} maxFontSizeMultiplier={maxFontScale}>{t.retry[lang]}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.inkMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.search[lang]}
          placeholderTextColor={colors.placeholderText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          maxFontSizeMultiplier={maxFontScale}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={
              lang === 'ar' ? 'مسح البحث' : lang === 'es' ? 'Borrar búsqueda' : 'Clear search'
            }
          >
            <Ionicons name="close-circle" size={20} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <FilterChips filters={filters} onToggle={toggleFilter} lang={lang} />

      {/* View mode toggle */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
          onPress={() => setViewMode('map')}
          accessibilityRole="button"
          accessibilityLabel={
            lang === 'ar' ? 'عرض الخريطة' : lang === 'es' ? 'Vista de mapa' : 'Map view'
          }
          accessibilityState={{ selected: viewMode === 'map' }}
        >
          <Ionicons
            name="map"
            size={18}
            color={viewMode === 'map' ? colors.bg : colors.inkSoft}
          />
          <Text
            style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}
            maxFontSizeMultiplier={maxFontScale}
          >
            {t.map[lang]}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
          accessibilityRole="button"
          accessibilityLabel={
            lang === 'ar' ? 'عرض القائمة' : lang === 'es' ? 'Vista de lista' : 'List view'
          }
          accessibilityState={{ selected: viewMode === 'list' }}
        >
          <Ionicons
            name="list"
            size={18}
            color={viewMode === 'list' ? colors.bg : colors.inkSoft}
          />
          <Text
            style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}
            maxFontSizeMultiplier={maxFontScale}
          >
            {t.list[lang]}
          </Text>
        </Pressable>
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText} maxFontSizeMultiplier={maxFontScale}>
          {filteredLocations.length} {t.results[lang]}
        </Text>
        {filteredLocations.length > MAX_MARKERS && viewMode === 'map' && (
          <Text style={styles.resultsHint}>
            (showing {MAX_MARKERS} on map)
          </Text>
        )}
      </View>
      </View>

      {/* Map view */}
      {viewMode === 'map' && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: ATLANTA_CENTER.lat,
            longitude: ATLANTA_CENTER.lng,
            latitudeDelta: 0.4,
            longitudeDelta: 0.4,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {displayMarkers.map((location) => {
            const style = typeStyle(location.type);
            return (
              <Marker
                key={location.id}
                coordinate={{
                  latitude: location.lat,
                  longitude: location.lng,
                }}
                pinColor={style.pin}
                onPress={() => handleMarkerPress(location)}
              >
                <View style={styles.markerContainer}>
                  <Text style={styles.markerIcon}>{style.icon}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <>
          {filteredLocations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.placeholderText} />
              <Text style={styles.emptyText}>{t.noResults[lang]}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <LocationCard location={item} lang={lang} userCoords={userCoords} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Cap + center the search/filter/toggle controls on the large iPad canvas so
  // they don't stretch full width (no-op on phones). The map stays full-bleed.
  headerArea: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkSoft,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.brand,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
  },
  clearButton: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.border,
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  toggleButtonActive: {
    backgroundColor: colors.brand,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  toggleTextActive: {
    color: colors.bg,
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inkSoft,
  },
  resultsHint: {
    fontSize: 12,
    color: colors.placeholderText,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  markerIcon: {
    fontSize: 20,
  },
  listContent: {
    paddingVertical: 8,
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
