# Atlan Metro Green Book — Design System

Source of truth for UI. Derived from the `/ui-ux-pro-max` skill, adapted to the
Islamic-green brand the product calls for.

## Brand & mood
Trustworthy, warm, community, faith-respectful. Elegant — NOT playful/neon.
Mobile-first. Light + dark ready.

## Color tokens (use these names; defined in globals.css / Tailwind)
| Token | Light | Use |
|-------|-------|-----|
| `--brand` | `#0f766e` (teal-700) | primary actions, active states, header |
| `--brand-dark` | `#065f46` (emerald-800) | gradients, hover |
| `--brand-soft` | `#ccfbf1` (teal-100) | subtle backgrounds, chips |
| `--accent` | `#ca8a04` (amber-600) | World Cup / highlights / offers |
| `--bg` | `#fafaf9` (stone-50) | page background |
| `--surface` | `#ffffff` | cards, sheets |
| `--ink` | `#1c1917` (stone-900) | primary text |
| `--ink-soft` | `#57534e` (stone-600) | secondary text |
| `--border` | `#e7e5e4` (stone-200) | dividers |
| `--danger` | `#dc2626` | destructive |

Per-type accent colors already live in `src/lib/display.ts` (`TYPE_STYLE`).

## Typography
- Latin UI: **Geist** (already wired as `--font-sans`).
- Arabic: **Noto Sans Arabic** (already wired as `--font-arabic`), auto-applied under `[dir=rtl]`.
- Scale: 12 / 14 / 16(base) / 18 / 24 / 32. Line-height 1.5 body.
- Headings 600–700, body 400, labels 500.

## Icons — IMPORTANT
- **UI chrome (nav, buttons, controls, fields): use `lucide-react` SVG icons.** No emoji.
  - directions → `Navigation`, call → `Phone`, search → `Search`, close → `X`,
    filter → `SlidersHorizontal`, prayer → `Clock`/`Sunrise`, qibla → `Compass`,
    mosque/place markers → keep the existing emoji ONLY on map pins & type badges
    (they read as friendly category glyphs there, not UI controls).
- Consistent stroke width (use Lucide default 2px). Icon sizes: 16 / 20 / 24.

## Interaction (from skill, CRITICAL)
- Touch targets ≥ 44px. 8px+ gaps between targets.
- Every interactive element: `cursor-pointer`, visible focus ring (`focus-visible:ring-2 ring-teal-600`).
- Transitions 150–300ms, `ease-out` enter. Wrap motion in `motion-safe:`; respect `prefers-reduced-motion`.
- Press feedback: subtle scale (active:scale-[0.98]) or bg shift. Never layout-shifting.
- Loading > 300ms → skeleton, not blank.

## Layout
- `min-h-dvh` not `100vh`. Safe-area padding on fixed bars (`env(safe-area-inset-*)`).
- Breakpoints: 375 / 768 / 1024 / 1440. No horizontal scroll on mobile.
- z-index scale: base 0, sticky header 30, map panes ≤400 (clamped), bottom nav 40, modal/sheet 2000.
- 4/8px spacing rhythm.

## Components in play
- Existing: AppShell, MapView, LocationCard, ImageThumb, LocationDetail, FilterBar, SearchBar, LangSwitcher.
- New this round: PrayerTimes, QiblaCompass, BusinessPortal (login + edit), WorldCup section, bottom nav / view tabs upgrade.

## Accessibility checklist (run before done)
- [ ] Contrast ≥ 4.5:1 text. [ ] Focus rings. [ ] aria-labels on icon-only buttons.
- [ ] Color never the only signal. [ ] reduced-motion. [ ] keyboard nav + Esc closes modals.
