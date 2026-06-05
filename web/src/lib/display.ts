import type { Lang, Location, LocationType } from './types';
import { TYPE_LABELS } from '@/i18n/strings';

/** Per-type visual identity: emoji marker + gradient for image placeholders. */
export const TYPE_STYLE: Record<
  LocationType,
  { icon: string; from: string; to: string; pin: string }
> = {
  masjid:        { icon: '🕌', from: '#0f766e', to: '#065f46', pin: '#0f766e' },
  restaurant:    { icon: '🍽️', from: '#ea580c', to: '#b91c1c', pin: '#ea580c' },
  coffee:        { icon: '☕', from: '#92400e', to: '#451a03', pin: '#92400e' },
  grocery:       { icon: '🛒', from: '#15803d', to: '#14532d', pin: '#15803d' },
  garments:      { icon: '🧕', from: '#7c3aed', to: '#4c1d95', pin: '#7c3aed' },
  park:          { icon: '🌳', from: '#16a34a', to: '#166534', pin: '#16a34a' },
  museum:        { icon: '🏛️', from: '#0369a1', to: '#0c4a6e', pin: '#0369a1' },
  attraction:    { icon: '🎡', from: '#db2777', to: '#831843', pin: '#db2777' },
  mall:          { icon: '🛍️', from: '#9333ea', to: '#581c87', pin: '#9333ea' },
  worldcup_venue:{ icon: '🏟️', from: '#ca8a04', to: '#854d0e', pin: '#ca8a04' },
};

export function typeStyle(type: LocationType) {
  return TYPE_STYLE[type] ?? TYPE_STYLE.attraction;
}

export function typeLabel(type: LocationType, lang: Lang): string {
  return TYPE_LABELS[type]?.[lang] ?? type;
}

/** Pick a localized field, falling back to English then the raw value. */
export function localized(loc: Location, base: 'name' | 'hours', lang: Lang): string {
  const key = `${base}_${lang}` as keyof Location;
  const val = loc[key] as string;
  if (val) return val;
  return (loc[`${base}_en` as keyof Location] as string) || '';
}

export function discountOffer(loc: Location, lang: Lang): string {
  const key = `discount_offer_${lang}` as keyof Location;
  return (loc[key] as string) || (loc.discount_offer_en as string) || '';
}

/** Google Maps directions URL — opens the native app on mobile, web otherwise. */
export function googleMapsUrl(loc: Location): string {
  const q = encodeURIComponent(`${loc.name_en} ${loc.address}`.trim());
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}&destination_place_id=&query=${q}`;
}

export interface HalalLabel {
  text: string;
  tone: 'verified' | 'listed' | 'unverified' | 'none';
}

/** Return honest halal label based on halal_status field. */
export function halalLabel(loc: Location, lang: Lang): HalalLabel {
  if (loc.halal_status === 'verified') {
    // Verified by a mosque or certifier
    const verifier = loc.verified_by || 'certifier';
    const text = lang === 'ar'
      ? `حلال - تم التحقق من قبل ${verifier}`
      : lang === 'es'
      ? `Halal — verificado por ${verifier}`
      : `Halal — verified by ${verifier}`;
    return { text, tone: 'verified' };
  }

  if (loc.halal_status === 'community-listed') {
    // Community-listed but not officially verified
    const text = lang === 'ar'
      ? 'حلال (قائمة المجتمع، غير تم التحقق)'
      : lang === 'es'
      ? 'Halal (listado comunitario, no verificado)'
      : 'Halal (community-listed, unverified)';
    return { text, tone: 'listed' };
  }

  // unverified status and halal_certified is false -> no halal chip
  return { text: '', tone: 'none' };
}
