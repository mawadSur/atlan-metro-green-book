import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Location, Lang } from '../lib/types';
import { colors, maxFontScale } from '../theme/colors';

interface HalalBadgeProps {
  location: Location;
  lang: Lang;
}

/**
 * Honest halal badge showing provenance-aware status.
 * - verified: green badge with certifier name
 * - community-listed: amber warning badge
 * - unverified: nothing shown
 */
export function HalalBadge({ location, lang }: HalalBadgeProps) {
  const { halal_status, verified_by } = location;

  if (halal_status === 'verified') {
    const verifier = verified_by || 'certifier';
    const text =
      lang === 'ar'
        ? `حلال — تم التحقق من قبل ${verifier}`
        : lang === 'es'
        ? `Halal — verificado por ${verifier}`
        : `Halal — verified by ${verifier}`;

    return (
      <View style={[styles.badge, styles.verified]}>
        <Text style={[styles.text, styles.verifiedText]} maxFontSizeMultiplier={maxFontScale}>{text}</Text>
      </View>
    );
  }

  if (halal_status === 'community-listed') {
    const text =
      lang === 'ar'
        ? 'حلال (قائمة المجتمع، غير تم التحقق)'
        : lang === 'es'
        ? 'Halal (listado comunitario, no verificado)'
        : 'Halal (community-listed, unverified)';

    return (
      <View style={[styles.badge, styles.communityListed]}>
        <Text style={[styles.text, styles.communityText]} maxFontSizeMultiplier={maxFontScale}>{text}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  verified: {
    backgroundColor: colors.brandDark,
  },
  communityListed: {
    backgroundColor: colors.accent,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  verifiedText: {
    color: '#d1fae5',
  },
  communityText: {
    color: '#fef3c7',
  },
});
