import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Filters, Lang } from '../lib/types';
import { t } from '../i18n/strings';
import { colors, maxFontScale } from '../theme/colors';

interface FilterChipsProps {
  filters: Filters;
  onToggle: (key: keyof Filters) => void;
  lang: Lang;
}

export function FilterChips({ filters, onToggle, lang }: FilterChipsProps) {
  const chips: { key: keyof Filters; label: string }[] = [
    { key: 'halal_certified', label: t.halal[lang] },
    { key: 'prayer_space', label: t.prayer_space[lang] },
    { key: 'alcohol_free', label: t.alcohol_free[lang] },
    { key: 'family_friendly', label: t.family_friendly[lang] },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {chips.map(({ key, label }) => {
        const active = filters[key];
        return (
          <Pressable
            key={key}
            onPress={() => onToggle(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            {active && (
              <Ionicons
                name="checkmark"
                size={15}
                color={colors.bg}
                style={styles.chipIcon}
              />
            )}
            <Text style={[styles.chipText, active && styles.chipTextActive]} maxFontSizeMultiplier={maxFontScale}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    minHeight: 44,
    justifyContent: 'center',
    marginRight: 8,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inkSoft,
  },
  chipTextActive: {
    color: colors.bg,
  },
});
