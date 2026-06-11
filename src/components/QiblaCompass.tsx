import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Coordinates, Qibla } from 'adhan';
import { useDeviceHeading } from '../lib/useDeviceHeading';
import { t } from '../i18n/strings';
import type { Lang } from '../lib/types';

interface QiblaCompassProps {
  lang?: Lang;
}

const ATLANTA_COORDS = { latitude: 33.7545, longitude: -84.3898 };

export function QiblaCompass({ lang = 'en' }: QiblaCompassProps) {
  const [qiblaBearing, setQiblaBearing] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied'>('granted');
  const { heading, accuracy, hasPermission, requestPermission } =
    useDeviceHeading();

  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Calculate Qibla bearing
  useEffect(() => {
    let mounted = true;

    const calculateQibla = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        let coords = ATLANTA_COORDS;

        if (status === 'granted') {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.LocationAccuracy.Balanced,
            });
            coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            if (mounted) setLocationStatus('granted');
          } catch (err) {
            console.warn('Could not get location, using Atlanta:', err);
            if (mounted) setLocationStatus('denied');
          }
        } else {
          if (mounted) setLocationStatus('denied');
        }

        // Calculate Qibla direction
        const adhanCoords = new Coordinates(coords.latitude, coords.longitude);
        const bearing = Qibla(adhanCoords);

        if (mounted) {
          setQiblaBearing(bearing);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error calculating Qibla:', err);
        if (mounted) setLoading(false);
      }
    };

    calculateQibla();

    return () => {
      mounted = false;
    };
  }, []);

  // Request compass permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Animate needle rotation based on device heading and Qibla bearing
  useEffect(() => {
    if (loading || heading === -1) return;

    // Calculate the angle: Qibla bearing minus device heading
    // This makes the needle point to Qibla regardless of device orientation
    const targetAngle = qiblaBearing - heading;

    Animated.timing(rotateAnim, {
      toValue: targetAngle,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [heading, qiblaBearing, loading]);

  const getCardinalDirection = (degrees: number): string => {
    const normalized = ((degrees % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'N';
    if (normalized >= 22.5 && normalized < 67.5) return 'NE';
    if (normalized >= 67.5 && normalized < 112.5) return 'E';
    if (normalized >= 112.5 && normalized < 157.5) return 'SE';
    if (normalized >= 157.5 && normalized < 202.5) return 'S';
    if (normalized >= 202.5 && normalized < 247.5) return 'SW';
    if (normalized >= 247.5 && normalized < 292.5) return 'W';
    return 'NW';
  };

  const getAccuracyLabel = (acc: number): string => {
    if (acc >= 3) return t.accuracyHigh[lang];
    if (acc === 2) return t.accuracyMedium[lang];
    if (acc === 1) return t.accuracyLow[lang];
    return t.calibrating[lang];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>{t.loading[lang]}</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t.qiblaDirection[lang]}</Text>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>{t.compassNotAvailable[lang]}</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>{t.enableCompass[lang]}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const spin = rotateAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.qiblaDirection[lang]}</Text>

      {locationStatus === 'denied' && (
        <Text style={styles.locationNote}>{t.locationDenied[lang]}</Text>
      )}

      {heading === -1 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{t.noAbsoluteHeading[lang]}</Text>
          <Text style={styles.warningSubtext}>{t.staticBearingOnly[lang]}</Text>
        </View>
      )}

      <View style={styles.compassContainer}>
        <View style={styles.compass}>
          {/* Compass circle with cardinal directions */}
          <View style={styles.compassCircle}>
            <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
            <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
            <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
            <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

            {/* Center point */}
            <View style={styles.centerDot} />

            {/* Animated needle */}
            <Animated.View
              style={[
                styles.needle,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View style={styles.needleArrow} />
            </Animated.View>
          </View>
        </View>

        {/* Info display */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.qibla[lang]}:</Text>
            <Text style={styles.infoValue}>
              {Math.round(qiblaBearing)}° {getCardinalDirection(qiblaBearing)}
            </Text>
          </View>

          {heading !== -1 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {lang === 'ar' ? 'الاتجاه' : lang === 'es' ? 'Rumbo' : 'Heading'}:
              </Text>
              <Text style={styles.infoValue}>
                {Math.round(heading)}° {getCardinalDirection(heading)}
              </Text>
            </View>
          )}

          <View style={styles.accuracyBadge}>
            <Text
              style={[
                styles.accuracyText,
                accuracy >= 3 && styles.accuracyHigh,
                accuracy === 2 && styles.accuracyMedium,
                accuracy <= 1 && styles.accuracyLow,
              ]}
            >
              {getAccuracyLabel(accuracy)}
            </Text>
          </View>

          {accuracy < 3 && (
            <Text style={styles.calibrationHint}>{t.calibrateHint[lang]}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 12,
  },
  locationNote: {
    fontSize: 12,
    color: '#78716c',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  permissionBox: {
    padding: 20,
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#78350f',
  },
  compassContainer: {
    alignItems: 'center',
  },
  compass: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  compassCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    borderColor: '#0f766e',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardinal: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: '700',
    color: '#0f766e',
  },
  cardinalN: { top: 12 },
  cardinalE: { right: 12 },
  cardinalS: { bottom: 12 },
  cardinalW: { left: 12 },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0f766e',
  },
  needle: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  needleArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 80,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#dc2626',
  },
  infoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#78716c',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1c1917',
    fontWeight: '600',
  },
  accuracyBadge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#e7e5e4',
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accuracyHigh: {
    color: '#065f46',
    backgroundColor: '#d1fae5',
  },
  accuracyMedium: {
    color: '#92400e',
    backgroundColor: '#fef3c7',
  },
  accuracyLow: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
  },
  calibrationHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
