# City Onboarding Engine

The onboarding "agent" discovers Muslim-friendly businesses for **any city** from
**OpenStreetMap** and emits a data file in the app's exact location schema — the
mechanism that makes Atlan Metro Green Book a true multi-city platform.

**No API key required.** OSM (Nominatim + Overpass) is free and global.

## Run it

```bash
# Whole metro area (recommended for big cities): 40km radius around center
npm run onboard -- "Atlanta, Georgia, USA" --id atlanta --radius 40

# City core only (uses the geocoded bounding box)
npm run onboard -- "Doha, Qatar" --id doha

# Preview without writing a file
npm run onboard -- "Toronto, Canada" --id toronto --radius 30 --dry

# Drop OSM rows that duplicate the hand-curated seed (src/data/seed.json)
npm run onboard -- "Atlanta, Georgia, USA" --id atlanta --radius 40 --merge-seed
```

Output: `src/data/cities/<id>.json`

### Flags
| Flag | Meaning |
|------|---------|
| `--id <slug>` | City id (default: slug of the first part of the query) |
| `--radius <km>` | Search a radius around the city center instead of the geocoded bbox. Use for metro-wide coverage. |
| `--merge-seed` | Dedupe OSM results against the curated seed so curated entries win. |
| `--dry` | Print the summary; don't write a file. |

## How it works

```
"Atlanta, GA"
     │  1. geocode.mjs  → Nominatim → center + bounding box
     ▼
  bbox / radius
     │  2. overpass.mjs → OpenStreetMap Overpass API
     ▼            queries by category (mirror failover, polite rate limit)
  raw OSM elements
     │  3. normalize.mjs → app schema + dedupe (osm_id, name+proximity)
     ▼
  clean records
     │  4. translate.mjs → EN/AR/ES (OSM name:ar/es tags, optional LibreTranslate)
     ▼
  src/data/cities/<id>.json   { city, counts, locations[] }
```

## What counts as a "Muslim business"

We use the highest-precision OpenStreetMap signals:

| App `type` | OSM tags matched |
|-----------|------------------|
| `masjid` | `amenity=place_of_worship` + `religion=muslim` |
| `restaurant` | `amenity=restaurant\|fast_food` + (`diet:halal=yes\|only` or `cuisine~halal`) |
| `coffee` | `amenity=cafe` + `diet:halal=yes\|only` |
| `grocery` | `shop=supermarket\|convenience\|greengrocer\|butcher` + halal tag |
| `garments` | `shop=clothes` + `clothes~muslim\|islamic\|abaya\|hijab` |

Mosques are auto-flagged `prayer_space=true` and `alcohol_free=true`. Halal food
is flagged `halal_certified=true`. All flags are editable afterward (the data is
a starting point, not the final word).

## Output schema

Each location matches the seed schema exactly, plus two provenance fields:

- `source: "osm"` — where it came from
- `osm_id: "node/123"` — stable id for re-runs / dedupe / linking back to OSM

## Translation

By default only OSM's own `name:ar` / `name:es` tags are used; missing fields are
left blank for human editors or the business portal to fill. To machine-translate,
set environment variables before running:

```bash
export LIBRETRANSLATE_URL="https://libretranslate.com/translate"
export LIBRETRANSLATE_KEY="..."   # if your host requires one
npm run onboard -- "Madrid, Spain" --id madrid --radius 25
```

## Limitations & next steps

- OSM coverage varies by city. Some real businesses aren't tagged with halal/diet
  tags yet, so they won't appear — the data improves as OSM does (and as editors
  add entries via the business portal).
- `family_friendly` defaults to `true`; refine per-record later.
- Phone/hours are only as good as the OSM tags.
- A future enhancement can upsert results straight into Supabase (deduping on
  `osm_id`) — see `docs/DATABASE.md`.
