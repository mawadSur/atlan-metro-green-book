export const colors = {
  brand: '#0f766e',
  brandDark: '#065f46',
  accent: '#ca8a04',
  bg: '#fafaf9',
  surface: '#ffffff',
  ink: '#1c1917',
  inkSoft: '#57534e',
  // Second muted grey that was hardcoded across screens (#78716c). Slightly
  // lighter than inkSoft; use for secondary text/icons over light surfaces.
  inkMuted: '#78716c',
  // Placeholder / disabled text (was hardcoded #a8a29e in the search bar).
  placeholderText: '#a8a29e',
  border: '#e7e5e4',
  danger: '#dc2626',
  // Favorite heart fill (was hardcoded #ef4444 on the detail screen).
  heart: '#ef4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Type scale (pt). Display > title > heading > body > label > caption > micro.
// Use these instead of magic font sizes so hierarchy stays consistent.
export const typeScale = {
  display: 28,
  title: 20,
  heading: 18,
  body: 16,
  label: 14,
  caption: 13,
  micro: 12,
};

// Cap Dynamic Type so very large accessibility text sizes don't shatter
// fixed-height layouts. Pass to <Text maxFontSizeMultiplier={maxFontScale}>.
export const maxFontScale = 1.4;

// Max width for a single content column. The app is universal (iPhone + iPad);
// on the large iPad canvas this caps and centers content so lists, forms, and
// reading surfaces stay legible instead of stretching edge-to-edge. On phones
// (screen width < this) it's a no-op. Apply as:
//   { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }
export const contentMaxWidth = 640;
