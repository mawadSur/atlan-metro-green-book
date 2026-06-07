import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PrayerTimesComponent } from '../../src/components/PrayerTimes';
import { QiblaCompass } from '../../src/components/QiblaCompass';
import type { Lang } from '../../src/lib/types';

export default function PrayerScreen() {
  // For now, default to English. In production, this would come from app-wide context.
  const [lang] = useState<Lang>('en');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <PrayerTimesComponent lang={lang} />
      </View>

      <View style={styles.section}>
        <QiblaCompass lang={lang} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
});
