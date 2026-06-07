import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { Filters, Lang } from '../lib/types';
import { t } from '../i18n/strings';

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
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    minHeight: 44,
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#57534e',
  },
  chipTextActive: {
    color: '#fafaf9',
  },
});
