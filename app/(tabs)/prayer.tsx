import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../src/lib/LangContext';
import { PrayerTimesComponent } from '../../src/components/PrayerTimes';
import { QiblaCompass } from '../../src/components/QiblaCompass';
import { contentMaxWidth } from '../../src/theme/colors';

export default function PrayerScreen() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
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
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 16,
  },
});
