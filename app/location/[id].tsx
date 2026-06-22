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
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLocationById } from '../../src/lib/supabase';
import { useLang } from '../../src/lib/LangContext';
import { typeStyle, typeLabel, localized, discountOffer, googleMapsUrl } from '../../src/lib/display';
import { HalalBadge } from '../../src/components/HalalBadge';
import { useFavorites } from '../../src/lib/useFavorites';
import { t } from '../../src/i18n/strings';
import type { Location, Lang } from '../../src/lib/types';
import { colors, maxFontScale, contentMaxWidth } from '../../src/theme/colors';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { isSaved, toggle } = useFavorites();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function fetchLocation() {
      if (!id) return;
      try {
        // Resolves from the live backend, falling back to bundled data when
        // offline so seed records (and a down backend) still open.
        const data = await getLocationById(id as string);
        setLocation(data);
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
      <>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      </>
    );
  }

  if (!location) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t.errorLoadingPlaces[lang]}</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>{t.close[lang]}</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const style = typeStyle(location.type);
  const name = localized(location, 'name', lang);
  const hours = localized(location, 'hours', lang);
  const offer = discountOffer(location, lang);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
                styles.solidPlaceholder,
                { backgroundColor: style.from },
              ]}
            >
              <Text style={styles.placeholderIcon}>{style.icon}</Text>
            </View>
          )}

          <Pressable
            style={[styles.backButton, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={lang === 'ar' ? 'رجوع' : lang === 'es' ? 'Atrás' : 'Back'}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <Pressable
            style={[styles.favoriteButton, { top: insets.top + 8 }]}
            onPress={handleFavorite}
            accessibilityRole="button"
            accessibilityLabel={
              isSaved(id as string)
                ? (lang === 'ar' ? 'إزالة من المحفوظات' : lang === 'es' ? 'Quitar de guardados' : 'Remove from saved')
                : (lang === 'ar' ? 'حفظ' : lang === 'es' ? 'Guardar' : 'Save')
            }
          >
            <Ionicons
              name={isSaved(id as string) ? 'heart' : 'heart-outline'}
              size={24}
              color={isSaved(id as string) ? colors.heart : 'white'}
            />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: style.pin }]}>
            <Text style={styles.typeBadgeText} maxFontSizeMultiplier={maxFontScale}>{typeLabel(location.type, lang)}</Text>
          </View>

          {/* Name */}
          <Text style={styles.name} maxFontSizeMultiplier={maxFontScale}>{name}</Text>

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
                  <Text style={styles.codeLabel}>{t.code[lang]}:</Text>
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
          accessibilityRole="button"
        >
          <Ionicons name="navigate" size={20} color="white" />
          <Text style={styles.primaryButtonText} maxFontSizeMultiplier={maxFontScale}>{t.directions[lang]}</Text>
        </Pressable>

        {location.phone && (
          <Pressable
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleCall}
            accessibilityRole="button"
          >
            <Ionicons name="call-outline" size={20} color="#0f766e" />
            <Text style={styles.secondaryButtonText} maxFontSizeMultiplier={maxFontScale}>{t.call[lang]}</Text>
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
  // Cap + center the detail column on the large iPad canvas (no-op on phones).
  scrollContent: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
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
  solidPlaceholder: {
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
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
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
