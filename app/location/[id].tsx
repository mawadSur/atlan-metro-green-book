import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { typeStyle, typeLabel, localized, discountOffer, googleMapsUrl } from '../../src/lib/display';
import { HalalBadge } from '../../src/components/HalalBadge';
import { useFavorites } from '../../src/lib/useFavorites';
import { t } from '../../src/i18n/strings';
import type { Location, Lang } from '../../src/lib/types';

const { width } = Dimensions.get('window');

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { isSaved, toggle } = useFavorites();
  const lang: Lang = 'en';

  useEffect(() => {
    async function fetchLocation() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setLocation(data as Location);
      } catch (err) {
        console.error('Error fetching location:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLocation();
  }, [id]);

  const handleDirections = () => {
    if (!location) return;
    const url = googleMapsUrl(location);
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (!location?.phone) return;
    Linking.openURL(`tel:${location.phone}`);
  };

  const handleFavorite = () => {
    if (!id) return;
    toggle(id as string);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t.errorLoadingPlaces[lang]}</Text>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>{t.close[lang]}</Text>
        </Pressable>
      </View>
    );
  }

  const style = typeStyle(location.type);
  const name = localized(location, 'name', lang);
  const hours = localized(location, 'hours', lang);
  const offer = discountOffer(location, lang);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {location.image_url && !imageError ? (
            <>
              {imageLoading && (
                <View style={[styles.imagePlaceholder, { backgroundColor: style.from }]}>
                  <ActivityIndicator size="large" color="white" />
                </View>
              )}
              <Image
                source={{ uri: location.image_url }}
                style={styles.heroImage}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            </>
          ) : (
            <View
              style={[
                styles.gradientPlaceholder,
                { backgroundColor: style.from },
              ]}
            >
              <Text style={styles.placeholderIcon}>{style.icon}</Text>
            </View>
          )}

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <Pressable
            style={styles.favoriteButton}
            onPress={handleFavorite}
          >
            <Ionicons
              name={isSaved(id as string) ? 'heart' : 'heart-outline'}
              size={24}
              color={isSaved(id as string) ? '#ef4444' : 'white'}
            />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: style.pin }]}>
            <Text style={styles.typeBadgeText}>{typeLabel(location.type, lang)}</Text>
          </View>

          {/* Name */}
          <Text style={styles.name}>{name}</Text>

          {/* Address */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text style={styles.address}>{location.address}</Text>
          </View>

          {/* Halal Badge */}
          <View style={styles.section}>
            <HalalBadge location={location} lang={lang} />
          </View>

          {/* Hours */}
          {hours && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.hours[lang]}</Text>
              <Text style={styles.hoursText}>{hours}</Text>
            </View>
          )}

          {/* Feature Chips */}
          <View style={styles.featuresContainer}>
            {location.prayer_space && (
              <View style={styles.featureChip}>
                <Ionicons name="moon-outline" size={16} color="#0f766e" />
                <Text style={styles.featureText}>{t.prayer_space[lang]}</Text>
              </View>
            )}
            {location.alcohol_free && (
              <View style={styles.featureChip}>
                <Ionicons name="close-circle-outline" size={16} color="#0f766e" />
                <Text style={styles.featureText}>{t.alcohol_free[lang]}</Text>
              </View>
            )}
            {location.family_friendly && (
              <View style={styles.featureChip}>
                <Ionicons name="people-outline" size={16} color="#0f766e" />
                <Text style={styles.featureText}>{t.family_friendly[lang]}</Text>
              </View>
            )}
          </View>

          {/* Discount Offer */}
          {offer && (
            <View style={styles.offerContainer}>
              <View style={styles.offerBadge}>
                <Ionicons name="pricetag" size={16} color="#ca8a04" />
                <Text style={styles.offerBadgeText}>{t.offer[lang]}</Text>
              </View>
              <Text style={styles.offerText}>{offer}</Text>
              {location.discount_code && (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>Code:</Text>
                  <Text style={styles.codeText}>{location.discount_code}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleDirections}
        >
          <Ionicons name="navigate" size={20} color="white" />
          <Text style={styles.primaryButtonText}>{t.directions[lang]}</Text>
        </Pressable>

        {location.phone && (
          <Pressable
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleCall}
          >
            <Ionicons name="call-outline" size={20} color="#0f766e" />
            <Text style={styles.secondaryButtonText}>{t.call[lang]}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fafaf9',
  },
  errorText: {
    fontSize: 16,
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  gradientPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  address: {
    fontSize: 15,
    color: '#78716c',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 15,
    color: '#57534e',
    lineHeight: 22,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
  },
  offerContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  offerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#854d0e',
  },
  offerText: {
    fontSize: 15,
    color: '#713f12',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#854d0e',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ca8a04',
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    minHeight: 52,
  },
  primaryButton: {
    backgroundColor: '#0f766e',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#0f766e',
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
