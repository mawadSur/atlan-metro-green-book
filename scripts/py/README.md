# Image Scraper for Atlan Metro Green Book

Python tool that scrapes location photos from Google Maps (primary), Wikimedia Commons, or stock images (fallback), then uploads to Supabase Storage.

## Legal Warning

**Scraping Google Maps photos violates Google Terms of Service.** Photos are copyrighted and republishing them (especially in App/Play Store apps) carries DMCA and app rejection risk. This risk was explicitly accepted by the CEO (2026-06-04). Wikimedia and stock fallbacks ensure coverage when Google blocks or changes layout.

## Setup

```bash
cd /Users/mawad/Desktop/green/scripts/py
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
```

## Usage

```bash
# Dry run (test sourcing without uploading)
python3 scrape_images.py --limit 3 --dry

# Process 5 locations (default)
python3 scrape_images.py --limit 5

# Process all missing images
python3 scrape_images.py --all

# Reprocess locations that already have images
python3 scrape_images.py --force --limit 10

# Filter by type
python3 scrape_images.py --type mosque --all

# Custom source order (skip Google)
python3 scrape_images.py --source-order wikimedia,stock --limit 10

# Debug mode (visible browser)
python3 scrape_images.py --headful --limit 2
```

## How It Works

1. Fetches locations from Supabase where `image_url` is null/empty
2. For each location, tries sources in order (default: Google → Wikimedia → Stock)
3. Downloads image, converts to WebP (max 1024px, quality 80)
4. Uploads to `location-photos` bucket in Supabase Storage
5. Updates `locations.image_url` with public URL

## Source Priority

- **Google Maps**: Playwright headless browser scrapes hero photos
- **Wikimedia Commons**: Geosearch (600m radius) or text search
- **Stock**: License-clean fallback images per location type (100% coverage)

## Flags

- `--limit N`: Process N locations (default: 5)
- `--all`: Process all missing images
- `--force`: Reprocess even if image_url is set
- `--dry`: Resolve sources without uploading
- `--source-order`: Comma-separated source priority
- `--type`: Filter by location type
- `--headful`: Non-headless browser (debugging)
