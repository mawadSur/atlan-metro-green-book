# Atlan Metro Green Book 🕌🟢

A tri-lingual (**English · العربية · Español**, with full RTL) guide to Muslim-friendly
places — mosques, halal restaurants, markets, family attractions and more — built as a
**multi-city platform** with an **automatic city-onboarding engine**.

Launch city: **Metro Atlanta**. Built for the **FIFA World Cup 2026**.

## Vision

1. **Find** Muslim-friendly places on a beautiful interactive map, filtered by halal,
   alcohol-free, prayer space, and family-friendly.
2. **Pray** — prayer times + Qibla compass anywhere.
3. **Save** with discount codes from partner businesses.
4. **Scale** — onboard *any new city* automatically by pulling open data (mosques,
   halal spots, markets) and auto-translating everything into EN/AR/ES.

## Tech

- **Expo (React Native)** — iOS, Android, and Web from one codebase
- **Leaflet + OpenStreetMap** — interactive maps, no API key required
- **Local-first seed data** with an optional **Supabase (Postgres)** backend
- **OpenStreetMap Overpass + Nominatim** — free data source for auto-onboarding cities
- Prayer times computed locally (no network needed)

See [`docs/DATABASE.md`](docs/DATABASE.md) for the two-tier data model and schema.

## Run

```bash
npm install
npm run web      # open in the browser
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Project layout

```
src/
  data/        seed locations + city registry
  i18n/        EN / AR / ES strings + RTL handling
  screens/     Map, List, World Cup, Discounts, Settings, Prayer
  components/   reusable UI
  lib/         prayer times, qibla, distance, storage
  onboarding/  automatic multi-city discovery + translation engine
  theme/       colors, spacing, typography
scripts/       data import / city onboarding CLI
docs/          specs & architecture
```

## Multi-city onboarding

A new city is added by running the onboarding engine, which:
1. Geocodes the city (Nominatim).
2. Queries OpenStreetMap (Overpass) for mosques, halal restaurants, markets, parks.
3. Normalizes them into the app's location schema.
4. Auto-translates names/hours into the three supported languages.
5. Emits a ready-to-import city data file.

```bash
# Pull Muslim-friendly places for all of Metro Atlanta
npm run onboard -- "Atlanta, Georgia, USA" --id atlanta --radius 40
```

This already generated `src/data/cities/atlanta.json` (39 live places: mosques,
halal restaurants, halal markets). See `docs/ONBOARDING.md` for all options.
