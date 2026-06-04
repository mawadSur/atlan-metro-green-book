#!/usr/bin/env python3
"""
WARNING: Scraping Google Maps photos violates Google ToS; photos are copyrighted
and republishing them (esp. in an App/Play Store app) carries DMCA/rejection risk.
The user explicitly accepted this risk (CEO review 2026-06-04). A Wikimedia/stock
fallback is included so coverage survives when Google blocks or changes layout.
"""

import argparse
import os
import sys
import time
import random
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, urlencode
from io import BytesIO

import requests
from PIL import Image
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


# Stock fallback images - license-clean sources (Unsplash free-to-use)
STOCK_IMAGES = {
    'mosque': 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1024&q=80',
    'masjid': 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1024&q=80',
    'restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1024&q=80',
    'coffee': 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1024&q=80',
    'cafe': 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1024&q=80',
    'grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1024&q=80',
    'garments': 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1024&q=80',
    'park': 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1024&q=80',
    'museum': 'https://images.unsplash.com/photo-1565626424178-c699f6601afd?w=1024&q=80',
    'attraction': 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1024&q=80',
    'mall': 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=1024&q=80',
    'worldcup_venue': 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1024&q=80',
}


def load_env(env_path: str) -> Dict[str, str]:
    """Load environment variables from KEY=VALUE file."""
    env = {}
    if not os.path.exists(env_path):
        print(f"ERROR: Environment file not found: {env_path}")
        sys.exit(1)

    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                env[key.strip()] = value.strip()
    return env


def fetch_locations(supabase_url: str, service_role: str, force: bool = False, location_type: Optional[str] = None) -> List[Dict]:
    """Fetch locations from Supabase."""
    url = f"{supabase_url}/rest/v1/locations"
    params = {
        'select': 'id,name_en,type,address,lat,lng,image_url',
        'order': 'name_en'
    }

    if location_type:
        params['type'] = f'eq.{location_type}'

    headers = {
        'apikey': service_role,
        'Authorization': f'Bearer {service_role}'
    }

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    locations = response.json()

    # Filter for missing images unless --force
    if not force:
        locations = [loc for loc in locations if not loc.get('image_url')]

    return locations


def try_google_maps(location: Dict, headless: bool = True) -> Optional[str]:
    """Attempt to scrape a photo from Google Maps using Playwright."""
    search_query = f"{location['name_en']} {location.get('address', '')}"
    search_url = f"https://www.google.com/maps/search/{quote(search_query)}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale='en-US',
                viewport={'width': 1280, 'height': 900}
            )
            page = context.new_page()

            # Navigate and wait
            page.goto(search_url, wait_until='networkidle', timeout=15000)
            time.sleep(2)  # Let JS render

            # Try to dismiss consent dialogs
            try:
                consent_selectors = [
                    'button:has-text("Accept all")',
                    'button:has-text("Reject all")',
                    'button:has-text("I agree")',
                    'button[aria-label*="Accept"]',
                    'button[aria-label*="Agree"]',
                ]
                for selector in consent_selectors:
                    try:
                        page.click(selector, timeout=2000)
                        time.sleep(1)
                        break
                    except:
                        continue
            except:
                pass

            # Extract photo URLs from various sources
            photo_url = None

            # Try hero image
            try:
                img_elements = page.query_selector_all('img[src*="googleusercontent.com"], img[src*="streetviewpixels"]')
                for img in img_elements:
                    src = img.get_attribute('src')
                    if src and ('lh3.googleusercontent.com' in src or 'streetviewpixels' in src):
                        # Upscale the image size
                        photo_url = re.sub(r'=w\d+-h\d+(-[a-z]+)*', '=w1024-h768', src)
                        break
            except:
                pass

            # Try photo button background
            if not photo_url:
                try:
                    buttons = page.query_selector_all('button[aria-label*="Photo"], button[style*="background-image"]')
                    for btn in buttons:
                        style = btn.get_attribute('style') or ''
                        match = re.search(r'url\(["\']?(https://[^"\']+googleusercontent\.com[^"\']+)["\']?\)', style)
                        if match:
                            photo_url = re.sub(r'=w\d+-h\d+(-[a-z]+)*', '=w1024-h768', match.group(1))
                            break
                except:
                    pass

            browser.close()
            return photo_url

    except PlaywrightTimeout:
        return None
    except Exception as e:
        print(f"  [Google Maps error: {str(e)[:60]}]")
        return None


def try_wikimedia(location: Dict) -> Optional[str]:
    """Try to find a photo on Wikimedia Commons via geosearch or text search."""
    # Geosearch first
    if location.get('lat') and location.get('lng'):
        params = {
            'action': 'query',
            'format': 'json',
            'generator': 'geosearch',
            'ggscoord': f"{location['lat']}|{location['lng']}",
            'ggsradius': 600,
            'ggslimit': 5,
            'prop': 'imageinfo',
            'iiprop': 'url',
            'iiurlwidth': 1024,
        }

        try:
            response = requests.get('https://commons.wikimedia.org/w/api.php', params=params, timeout=10)
            data = response.json()
            pages = data.get('query', {}).get('pages', {})
            for page in pages.values():
                imageinfo = page.get('imageinfo', [])
                if imageinfo and 'thumburl' in imageinfo[0]:
                    return imageinfo[0]['thumburl']
        except:
            pass

    # Text search fallback
    try:
        params = {
            'action': 'query',
            'format': 'json',
            'list': 'search',
            'srsearch': location['name_en'],
            'srnamespace': 6,  # File namespace
            'srlimit': 3,
        }
        response = requests.get('https://commons.wikimedia.org/w/api.php', params=params, timeout=10)
        data = response.json()
        results = data.get('query', {}).get('search', [])

        if results:
            filename = results[0]['title'].replace('File:', '')
            img_params = {
                'action': 'query',
                'format': 'json',
                'titles': f'File:{filename}',
                'prop': 'imageinfo',
                'iiprop': 'url',
                'iiurlwidth': 1024,
            }
            response = requests.get('https://commons.wikimedia.org/w/api.php', params=img_params, timeout=10)
            data = response.json()
            pages = data.get('query', {}).get('pages', {})
            for page in pages.values():
                imageinfo = page.get('imageinfo', [])
                if imageinfo and 'thumburl' in imageinfo[0]:
                    return imageinfo[0]['thumburl']
    except:
        pass

    return None


def try_stock(location: Dict) -> Optional[str]:
    """Get stock image for location type."""
    loc_type = location.get('type', '').lower()
    return STOCK_IMAGES.get(loc_type)


def download_and_process_image(url: str) -> Optional[bytes]:
    """Download image, validate, convert to WebP."""
    try:
        response = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        response.raise_for_status()

        if 'image' not in response.headers.get('Content-Type', ''):
            return None

        if len(response.content) < 2048:
            return None

        # Process with Pillow
        img = Image.open(BytesIO(response.content))

        # Convert to RGB
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize to max 1024px on long edge
        max_size = 1024
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Save as WebP
        output = BytesIO()
        img.save(output, format='WEBP', quality=80)
        return output.getvalue()

    except Exception as e:
        print(f"  [Process error: {str(e)[:60]}]")
        return None


def upload_to_storage(supabase_url: str, service_role: str, location_id: str, webp_bytes: bytes) -> Optional[str]:
    """Upload WebP to Supabase Storage."""
    object_path = f"{location_id}.webp"
    url = f"{supabase_url}/storage/v1/object/location-photos/{object_path}"

    headers = {
        'Authorization': f'Bearer {service_role}',
        'apikey': service_role,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
    }

    response = requests.post(url, data=webp_bytes, headers=headers)

    if response.status_code in (200, 201):
        public_url = f"{supabase_url}/storage/v1/object/public/location-photos/{object_path}"
        return public_url

    return None


def update_location_image(supabase_url: str, service_role: str, location_id: str, image_url: str) -> bool:
    """Update location.image_url in database."""
    url = f"{supabase_url}/rest/v1/locations"
    params = {'id': f'eq.{location_id}'}

    headers = {
        'apikey': service_role,
        'Authorization': f'Bearer {service_role}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }

    data = {'image_url': image_url}

    response = requests.patch(url, params=params, json=data, headers=headers)
    return response.status_code in (200, 204)


def process_location(
    location: Dict,
    supabase_url: str,
    service_role: str,
    source_order: List[str],
    dry_run: bool,
    headless: bool
) -> Tuple[str, Optional[str]]:
    """Process a single location. Returns (source, url_or_error)."""

    source_funcs = {
        'google': lambda: try_google_maps(location, headless),
        'wikimedia': lambda: try_wikimedia(location),
        'stock': lambda: try_stock(location),
    }

    photo_url = None
    source_used = None

    # Try each source in order
    for source in source_order:
        if source not in source_funcs:
            continue

        try:
            photo_url = source_funcs[source]()
            if photo_url:
                source_used = source
                break
        except Exception as e:
            print(f"  [{source} error: {str(e)[:60]}]")
            continue

    if not photo_url:
        return ('FAILED', None)

    if dry_run:
        return (source_used, photo_url)

    # Download and process
    webp_bytes = download_and_process_image(photo_url)
    if not webp_bytes:
        return (source_used, None)

    # Upload
    public_url = upload_to_storage(supabase_url, service_role, location['id'], webp_bytes)
    if not public_url:
        return (source_used, None)

    # Update DB
    if update_location_image(supabase_url, service_role, location['id'], public_url):
        return (source_used, public_url)

    return (source_used, None)


def main():
    parser = argparse.ArgumentParser(description='Scrape and upload location images')
    parser.add_argument('--limit', type=int, default=5, help='Process N locations (default: 5)')
    parser.add_argument('--all', action='store_true', help='Process all missing images')
    parser.add_argument('--force', action='store_true', help='Reprocess locations with existing images')
    parser.add_argument('--dry', action='store_true', help='Dry run: resolve sources without uploading')
    parser.add_argument('--source-order', default='google,wikimedia,stock', help='Source priority (default: google,wikimedia,stock)')
    parser.add_argument('--type', help='Filter by location type')
    parser.add_argument('--headful', action='store_true', help='Run browser in headful mode (for debugging)')

    args = parser.parse_args()

    # Load environment
    env_path = Path(__file__).parent.parent.parent / '.secrets' / 'supabase.env'
    env = load_env(str(env_path))

    supabase_url = env.get('SUPABASE_URL')
    service_role = env.get('SUPABASE_SERVICE_ROLE')

    if not supabase_url or not service_role:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in environment")
        sys.exit(1)

    source_order = [s.strip() for s in args.source_order.split(',')]

    # Fetch locations
    print(f"Fetching locations from {supabase_url}...")
    locations = fetch_locations(supabase_url, service_role, args.force, args.type)

    if not locations:
        print("No locations to process.")
        return

    # Apply limit
    if not args.all:
        locations = locations[:args.limit]

    print(f"Processing {len(locations)} locations (source order: {', '.join(source_order)})")
    if args.dry:
        print("DRY RUN - no uploads will be performed\n")

    # Track results
    stats = {'google': 0, 'wikimedia': 0, 'stock': 0, 'FAILED': 0}

    for i, location in enumerate(locations, 1):
        name = location['name_en']
        print(f"[{i}/{len(locations)}] {name}...", end=' ', flush=True)

        source, result = process_location(
            location,
            supabase_url,
            service_role,
            source_order,
            args.dry,
            headless=not args.headful
        )

        if result:
            print(f"-> {source} -> {result[:80]}")
            stats[source] += 1
        else:
            print(f"-> {source or 'FAILED'}")
            stats['FAILED'] += 1

        # Polite delay
        if i < len(locations):
            time.sleep(random.uniform(2.0, 4.0))

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for source in ['google', 'wikimedia', 'stock', 'FAILED']:
        if stats[source] > 0:
            print(f"{source.upper()}: {stats[source]}")

    successful = sum(stats[s] for s in ['google', 'wikimedia', 'stock'])
    print(f"\nTotal uploaded: {successful}/{len(locations)}")


if __name__ == '__main__':
    main()
