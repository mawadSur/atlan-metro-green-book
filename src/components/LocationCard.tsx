import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { Location, Lang } from '../lib/types';
import type { Coordinates } from '../lib/geo';
import { localized, typeLabel, typeStyle, halalLabel } from '../lib/display';
import { haversineDistance, formatDistance } from '../lib/geo';
import { router } from 'expo-router';

interface LocationCardProps {
  location: Location;
  lang: Lang;
  userCoords?: Coordinates;
}

export function LocationCard({ location, lang, userCoords }: LocationCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const name = localized(location, 'name', lang);
  const style = typeStyle(location.type);
  const typeText = typeLabel(location.type, lang);
  const halal = halalLabel(location, lang);

  let distance: string | null = null;
  if (userCoords) {
    const d = haversineDistance(userCoords, { lat: location.lat, lng: location.lng });
    distance = formatDistance(d, lang);
  }

  const handlePress = () => {
    router.push(`/location/${location.id}` as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.imageContainer}>
        {!imageError && location.image_url ? (
          <>
            <Image
              source={{ uri: location.image_url }}
              style={styles.image}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="#0f766e" />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: style.from }]}>
            <Text style={styles.placeholderIcon}>{style.icon}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.badges}>
          <View style={[styles.badge, styles.badgeType]}>
            <Text style={styles.badgeText}>{typeText}</Text>
          </View>

          {halal.tone !== 'none' && (
            <View
              style={[
                styles.badge,
                halal.tone === 'verified' && styles.badgeVerified,
                halal.tone === 'listed' && styles.badgeListed,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  halal.tone === 'verified' && styles.badgeTextVerified,
                  halal.tone === 'listed' && styles.badgeTextListed,
                ]}
              >
                {halal.text.split('—')[0].trim()}
              </Text>
            </View>
          )}
        </View>

        {distance && (
          <Text style={styles.distance} numberOfLines={1}>
            {distance}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 6,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  cardPressed: {
    opacity: 0.7,
  },
  imageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f4',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeType: {
    backgroundColor: '#e7e5e4',
  },
  badgeVerified: {
    backgroundColor: '#d1fae5',
  },
  badgeListed: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#57534e',
  },
  badgeTextVerified: {
    color: '#065f46',
  },
  badgeTextListed: {
    color: '#92400e',
  },
  distance: {
    fontSize: 13,
    color: '#78716c',
  },
});
