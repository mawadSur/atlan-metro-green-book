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
import { getLocations } from '../../src/lib/supabase';
import type { Location, Filters } from '../../src/lib/types';
import type { Coordinates } from '../../src/lib/geo';
import { LocationCard } from '../../src/components/LocationCard';
import { FilterChips } from '../../src/components/FilterChips';
import { typeStyle } from '../../src/lib/display';
import { t } from '../../src/i18n/strings';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ATLANTA_CENTER = { lat: 33.7545, lng: -84.3898 };
const MAX_MARKERS = 300;

export default function MapListScreen() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
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
      setLocations(data);
    } catch (err) {
      setError(t.errorLoadingPlaces[lang]);
      console.error('Failed to load locations:', err);
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
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>{t.loading[lang]}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text style={styles.errorTitle}>{t.errorTitle[lang]}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadLocations}>
          <Text style={styles.retryButtonText}>{t.retry[lang]}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#78716c" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.search[lang]}
          placeholderTextColor="#a8a29e"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#78716c" />
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
        >
          <Ionicons
            name="map"
            size={18}
            color={viewMode === 'map' ? '#fafaf9' : '#57534e'}
          />
          <Text
            style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}
          >
            {t.map[lang]}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={18}
            color={viewMode === 'list' ? '#fafaf9' : '#57534e'}
          />
          <Text
            style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}
          >
            {t.list[lang]}
          </Text>
        </Pressable>
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredLocations.length} {t.results[lang]}
        </Text>
        {filteredLocations.length > MAX_MARKERS && viewMode === 'map' && (
          <Text style={styles.resultsHint}>
            (showing {MAX_MARKERS} on map)
          </Text>
        )}
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
              <Ionicons name="search-outline" size={48} color="#a8a29e" />
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
    backgroundColor: '#fafaf9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#57534e',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0f766e',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fafaf9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1c1917',
  },
  clearButton: {
    padding: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#e7e5e4',
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
    backgroundColor: '#0f766e',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#57534e',
  },
  toggleTextActive: {
    color: '#fafaf9',
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
    color: '#57534e',
  },
  resultsHint: {
    fontSize: 12,
    color: '#a8a29e',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#0f766e',
  },
  markerIcon: {
    fontSize: 20,
  },
  listContent: {
    paddingVertical: 8,
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
    color: '#78716c',
    textAlign: 'center',
  },
});
