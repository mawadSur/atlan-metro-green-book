import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { t } from '../i18n/strings';
import type { Lang } from '../lib/types';

interface PrayerTimesProps {
  lang?: Lang;
}

interface PrayerTime {
  name: string;
  time: Date;
}

const ATLANTA_COORDS = { latitude: 33.7545, longitude: -84.3898 };

export function PrayerTimesComponent({ lang = 'en' }: PrayerTimesProps) {
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied'>('granted');

  useEffect(() => {
    let mounted = true;

    const loadPrayerTimes = async () => {
      try {
        // Request location permission
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

        // Calculate prayer times
        const adhanCoords = new Coordinates(coords.latitude, coords.longitude);
        const date = new Date();
        const params = CalculationMethod.NorthAmerica();
        const prayerTimes = new PrayerTimes(adhanCoords, date, params);

        const times: PrayerTime[] = [
          { name: t.fajr[lang], time: prayerTimes.fajr },
          { name: t.sunrise[lang], time: prayerTimes.sunrise },
          { name: t.dhuhr[lang], time: prayerTimes.dhuhr },
          { name: t.asr[lang], time: prayerTimes.asr },
          { name: t.maghrib[lang], time: prayerTimes.maghrib },
          { name: t.isha[lang], time: prayerTimes.isha },
        ];

        if (mounted) {
          setPrayers(times);
          setLoading(false);
        }

        // Determine next prayer
        const now = new Date();
        const upcoming = times.find((p) => p.time > now);
        if (upcoming && mounted) {
          setNextPrayer(upcoming.name);
        }
      } catch (err) {
        console.error('Error loading prayer times:', err);
        if (mounted) setLoading(false);
      }
    };

    loadPrayerTimes();

    return () => {
      mounted = false;
    };
  }, [lang]);

  // Countdown timer
  useEffect(() => {
    if (!prayers.length || !nextPrayer) return;

    const interval = setInterval(() => {
      const now = new Date();
      const next = prayers.find((p) => p.name === nextPrayer);
      if (next) {
        const diff = next.time.getTime() - now.getTime();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setCountdown('');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prayers, nextPrayer]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>{t.loading[lang]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.prayerTimes[lang]}</Text>
        {locationStatus === 'denied' && (
          <Text style={styles.locationNote}>{t.locationDenied[lang]}</Text>
        )}
      </View>

      {prayers.map((prayer, index) => (
        <View
          key={index}
          style={[
            styles.prayerRow,
            prayer.name === nextPrayer && styles.nextPrayerRow,
          ]}
        >
          <Text
            style={[
              styles.prayerName,
              prayer.name === nextPrayer && styles.nextPrayerText,
            ]}
          >
            {prayer.name}
            {prayer.name === nextPrayer && ` (${t.nextPrayer[lang]})`}
          </Text>
          <Text
            style={[
              styles.prayerTime,
              prayer.name === nextPrayer && styles.nextPrayerText,
            ]}
          >
            {prayer.time.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </Text>
        </View>
      ))}

      {nextPrayer && countdown && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>{t.nextPrayer[lang]}</Text>
          <Text style={styles.countdown}>{countdown}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
  },
  locationNote: {
    fontSize: 12,
    color: '#78716c',
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  nextPrayerRow: {
    backgroundColor: '#0f766e',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  prayerName: {
    fontSize: 16,
    color: '#1c1917',
    fontWeight: '500',
  },
  prayerTime: {
    fontSize: 16,
    color: '#57534e',
  },
  nextPrayerText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  countdownContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e0f2f1',
    borderRadius: 8,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#065f46',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  countdown: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f766e',
  },
});
