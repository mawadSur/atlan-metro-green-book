import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../../src/lib/LangContext';
import { t, LANGS } from '../../src/i18n/strings';
import { colors, spacing } from '../../src/theme/colors';

export default function MoreScreen() {
  const { lang, setLang } = useLang();

  const handleOpenPortal = () => {
    Linking.openURL('https://atlan-green-book.vercel.app/portal');
  };

  const handleOpenAdmin = () => {
    Linking.openURL('https://atlan-green-book.vercel.app/admin');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.more[lang]}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.language[lang]}</Text>
        {LANGS.map((l) => (
          <Pressable
            key={l.code}
            onPress={() => setLang(l.code)}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
          >
            <Text style={styles.optionText}>{l.label}</Text>
            {lang === l.code && (
              <Ionicons name="checkmark" size={24} color={colors.brand} />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.about[lang]}</Text>
        <Text style={styles.aboutText}>{t.aboutText[lang]}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.worldCup2026[lang]}</Text>
        <View style={styles.worldCupCard}>
          <Text style={styles.worldCupIcon}>🏟️</Text>
          <Text style={styles.worldCupText}>{t.worldCupInfo[lang]}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={handleOpenPortal}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.linkButtonPressed,
          ]}
        >
          <Text style={styles.linkButtonText}>{t.businessPortal[lang]}</Text>
          <Ionicons name="open-outline" size={20} color={colors.brand} />
        </Pressable>

        <Pressable
          onPress={handleOpenAdmin}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.linkButtonPressed,
          ]}
        >
          <Text style={styles.linkButtonText}>{t.adminPanel[lang]}</Text>
          <Ionicons name="open-outline" size={20} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Atlan Metro Green Book v1.0.0</Text>
        <Text style={styles.footerSubtext}>Made with care for the Muslim community</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
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
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 16,
    color: colors.ink,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  worldCupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
  },
  worldCupIcon: {
    fontSize: 40,
    marginEnd: spacing.md,
  },
  worldCupText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  linkButtonPressed: {
    opacity: 0.7,
  },
  linkButtonText: {
    fontSize: 16,
    color: colors.brand,
    fontWeight: '500',
  },
  footer: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
});
