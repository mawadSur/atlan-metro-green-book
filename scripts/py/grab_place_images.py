#!/usr/bin/env python3
"""
Headful Google Maps photo grabber for Green Book locations.

WHY HEADFUL: Google blocks *headless* automation hard (the existing
scrape_images.py empirically returns 0 from headless). A real, visible Chrome
window driving a persistent profile (so the cookie-consent click sticks) gets
past most of that. You watch it work in the tab.

WHAT IT DOES: for each of the 87 locations, opens its Google Maps listing,
opens the photo gallery, and saves the first 3-4 distinct high-res photos to
  scraped_images/<location-id>/1.jpg ... 4.jpg
plus a manifest.json mapping location -> files -> source Maps URL.

IMPORTANT — this is a LOCAL grabber only. It does NOT touch Supabase or the DB.
You review the images, then we decide what (if anything) gets uploaded. This
keeps the live 87 images safe until you approve.

LEGAL NOTE (unchanged from project history): scraping Google Maps photos
violates Google ToS and the photos are third-party copyrighted. The user
explicitly chose this path (CEO reviews 2026-06-03/04) and owns the risk. The
ToS-safe alternative is the Google Places Photos API.

USAGE:
  # one-time: install the Chrome channel for Playwright if needed
  python3 grab_place_images.py --limit 3            # try 3 places, watch the window
  python3 grab_place_images.py --all                # all 87
  python3 grab_place_images.py --all --min 3 --max 4 # 3-4 images each (default)
  python3 grab_place_images.py --ids <id1>,<id2>    # specific locations
  python3 grab_place_images.py --all --headless     # opt in to headless (will likely fail)
"""

import argparse
import json
import os
import re
import sys
import time
import random
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote

import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# --- paths ---------------------------------------------------------------
HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
ENV_PATH = REPO_ROOT / ".secrets" / "supabase.env"
OUT_DIR = REPO_ROOT / "scraped_images"          # gitignored; local review area
PROFILE_DIR = HERE / ".chrome-profile"          # persistent profile (consent sticks)
MANIFEST_PATH = OUT_DIR / "manifest.json"

# A real desktop UA helps; the persistent Chrome profile carries the rest.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


def load_env(path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not path.exists():
        print(f"ERROR: env file not found: {path}", file=sys.stderr)
        sys.exit(1)
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def fetch_locations(env: Dict[str, str]) -> List[Dict]:
    """Read the canonical 87 locations from Supabase (anon read is allowed)."""
    url = env.get("SUPABASE_URL")
    key = (env.get("SUPABASE_ANON_KEY")
           or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
           or env.get("SUPABASE_SERVICE_ROLE"))
    if not url or not key:
        print("ERROR: need SUPABASE_URL + an anon/service key in .secrets/supabase.env",
              file=sys.stderr)
        sys.exit(1)
    resp = requests.get(
        f"{url}/rest/v1/locations",
        params={"select": "id,name_en,type,address,lat,lng", "city_id": "eq.atlanta",
                "order": "name_en"},
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def upscale(url: str) -> str:
    """Google image URLs carry a size suffix like =w203-h152-k-no; bump it."""
    return re.sub(r"=w\d+-h\d+[^&]*", "=w1280-h960-k-no", url)


def dismiss_consent(page) -> None:
    for sel in (
        'button[aria-label*="Accept all"]',
        'button:has-text("Accept all")',
        'button:has-text("Reject all")',
        'form[action*="consent"] button',
        'button[aria-label*="Agree"]',
    ):
        try:
            page.click(sel, timeout=2000)
            time.sleep(1.0)
            return
        except Exception:
            continue


def collect_photo_urls(page, want: int) -> List[str]:
    """Open the photo gallery and collect distinct high-res photo URLs.

    Strategy: open the gallery overlay (click the hero / "Photos" button), then
    scroll the overlay to lazy-load thumbnails and harvest their googleusercontent
    URLs. We need DISTINCT photos (different base path), not the same image at
    different sizes, so we dedupe on the path before the size suffix.
    """
    found: List[str] = []
    seen = set()

    def harvest():
        try:
            imgs = page.query_selector_all(
                'img[src*="googleusercontent.com"], img[src*="streetviewpixels"], '
                'a[style*="googleusercontent"], div[style*="googleusercontent"]')
        except Exception:
            # page navigated / element handles went stale mid-harvest — skip this pass
            return
        for el in imgs:
            try:
                src = el.get_attribute("src") or ""
                if not src:
                    # gallery thumbs are often background-image on a/div
                    style = el.get_attribute("style") or ""
                    m = re.search(r'url\(["\']?(https://[^"\')]+googleusercontent[^"\')]+)', style)
                    if m:
                        src = m.group(1)
            except Exception:
                continue  # stale element handle — skip it
            if "googleusercontent.com" not in src and "streetviewpixels" not in src:
                continue
            if re.search(r"=s\d{1,2}-", src):       # tiny avatar/profile thumb
                continue
            if "/a/" in src or "=s64" in src or "=s48" in src:  # reviewer avatars
                continue
            big = upscale(src)
            base = big.split("=")[0]
            if base in seen:
                continue
            seen.add(base)
            found.append(big)

    # 1) Open the gallery overlay. The hero image button is the most reliable entry.
    opened = False
    for sel in (
        'button[jsaction*="heroHeaderImage"]',
        'button[aria-label^="Photo of"]',
        'button[aria-label*="All photos"]',
        'button[aria-label*="Photos"]',
        'div[role="img"][aria-label*="Photo"]',
    ):
        try:
            page.click(sel, timeout=2500)
            opened = True
            time.sleep(2.2)
            break
        except Exception:
            continue

    harvest()  # grab what's visible (hero + any inline strip)

    # 2) Scroll the gallery to lazy-load more. Scroll the overlay if present,
    #    else the main results panel. Repeat until we have enough or it stops growing.
    stagnant = 0
    for _ in range(10):
        if len(found) >= want:
            break
        before = len(found)
        try:
            # prefer scrolling a scrollable container in the overlay
            page.evaluate("""() => {
                const panels = [...document.querySelectorAll('div')]
                  .filter(d => d.scrollHeight > d.clientHeight + 200);
                const target = panels.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];
                if (target) target.scrollBy(0, 1000);
            }""")
        except Exception:
            try:
                page.mouse.wheel(0, 1000)
            except Exception:
                break
        time.sleep(1.1)
        harvest()
        if len(found) == before:
            stagnant += 1
            if stagnant >= 3:
                break
        else:
            stagnant = 0

    return found[:want]


def _haversine_mi(lat1, lng1, lat2, lng2) -> float:
    import math
    R = 3958.8
    p = math.pi / 180
    dlat = (lat2 - lat1) * p
    dlng = (lng2 - lng1) * p
    a = (math.sin(dlat / 2) ** 2
         + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin(dlng / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def _resolved_coords(page):
    """Read the @lat,lng Google puts in the URL once a place actually opens."""
    m = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", page.url)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None


def grab_one(context, loc: Dict, want: int, guard_mi: float = 0.6) -> List[str]:
    # Disambiguation fix for near-identical names (the Al-Farooq / Al-Hedaya /
    # Al-Quran mosques): search by the UNIQUE street ADDRESS first (names collide,
    # addresses don't), biased to the target coords. Then GUARD: after the place
    # opens, read Google's resolved @lat,lng from the URL and REJECT the photos if
    # it landed more than guard_mi from the real location — better to return zero
    # than to save another mosque's photos.
    lat, lng = loc.get("lat"), loc.get("lng")
    addr = (loc.get("address") or "").strip()
    name = loc["name_en"]
    # address-first query; fall back to name if no address
    query = f"{name}, {addr}" if addr else name
    if lat is not None and lng is not None:
        search_url = (f"https://www.google.com/maps/search/{quote(query)}/"
                      f"@{lat},{lng},16z")
    else:
        search_url = f"https://www.google.com/maps/search/{quote(query)}"
    page = context.new_page()
    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.0)
        dismiss_consent(page)
        try:
            page.click('a[href*="/maps/place/"]', timeout=4000)
            time.sleep(2.0)
        except Exception:
            pass

        # Coordinate guard: confirm we opened the RIGHT place before trusting photos.
        if lat is not None and lng is not None:
            rc = _resolved_coords(page)
            if rc:
                d = _haversine_mi(lat, lng, rc[0], rc[1])
                if d > guard_mi:
                    print(f"[guard: opened place {d:.1f}mi off target, skipping] ", end="")
                    return []

        return collect_photo_urls(page, want)
    except PlaywrightTimeout:
        return []
    finally:
        page.close()


def download(url: str, dest: Path) -> bool:
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": UA})
        if r.status_code != 200 or "image" not in r.headers.get("Content-Type", ""):
            return False
        if len(r.content) < 4096:        # skip tiny/blank
            return False
        dest.write_bytes(r.content)
        return True
    except Exception:
        return False


def main() -> None:
    ap = argparse.ArgumentParser(description="Headful Google Maps photo grabber (local only)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--all", action="store_true", help="process all 87 locations")
    g.add_argument("--limit", type=int, default=3, help="process first N (default 3)")
    ap.add_argument("--ids", help="comma-separated location ids to process")
    ap.add_argument("--min", type=int, default=3, help="min images per place (informational)")
    ap.add_argument("--max", type=int, default=4, help="max images per place (default 4)")
    ap.add_argument("--headless", action="store_true",
                    help="run headless (Google will likely block — default is a visible window)")
    ap.add_argument("--refresh", action="store_true",
                    help="re-grab even locations already saved (default: resume/skip done)")
    args = ap.parse_args()

    env = load_env(ENV_PATH)
    locations = fetch_locations(env)

    if args.ids:
        wanted = {s.strip() for s in args.ids.split(",")}
        locations = [l for l in locations if l["id"] in wanted]
    elif not args.all:
        locations = locations[: args.limit]

    if not locations:
        print("No locations to process.")
        return

    OUT_DIR.mkdir(exist_ok=True)
    PROFILE_DIR.mkdir(exist_ok=True)
    manifest: Dict[str, Dict] = {}
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text())
        except Exception:
            manifest = {}

    want = max(args.max, args.min)
    print(f"Grabbing up to {want} photos each for {len(locations)} locations "
          f"({'headless' if args.headless else 'VISIBLE Chrome window'}).")
    if not args.headless:
        print("A Chrome window will open. If Google shows a consent screen on the "
              "first place, accept it once — the persistent profile remembers it.")

    stats = {"ok": 0, "partial": 0, "none": 0}
    with sync_playwright() as p:
        # Persistent context = the consent click + cookies survive across all 87.
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            channel="chrome",
            headless=args.headless,
            viewport={"width": 1280, "height": 900},
            user_agent=UA,
            locale="en-US",
        )
        try:
            for i, loc in enumerate(locations, 1):
                name = loc["name_en"]
                print(f"[{i}/{len(locations)}] {name} ...", end=" ", flush=True)

                # Resume: skip locations already grabbed to >= min (unless --refresh).
                prior = manifest.get(loc["id"])
                if (not args.refresh and prior and len(prior.get("files", [])) >= args.min
                        and (OUT_DIR / loc["id"]).exists()):
                    stats["ok"] += 1
                    print(f"-> already have {len(prior['files'])} (skip)")
                    continue

                # One bad page must not abort the whole 87-run.
                try:
                    urls = grab_one(context, loc, want)
                except Exception as e:
                    urls = []
                    print(f"[error: {str(e)[:50]}]", end=" ")

                loc_dir = OUT_DIR / loc["id"]
                saved: List[str] = []
                if urls:
                    loc_dir.mkdir(parents=True, exist_ok=True)
                    for n, u in enumerate(urls, 1):
                        dest = loc_dir / f"{n}.jpg"
                        try:
                            if download(u, dest):
                                saved.append(dest.name)
                        except Exception:
                            pass
                manifest[loc["id"]] = {
                    "name_en": name,
                    "type": loc.get("type"),
                    "source_urls": urls,
                    "files": saved,
                    "dir": str((OUT_DIR / loc["id"]).relative_to(REPO_ROOT)),
                }
                if len(saved) >= args.min:
                    stats["ok"] += 1
                    print(f"-> {len(saved)} photos")
                elif saved:
                    stats["partial"] += 1
                    print(f"-> {len(saved)} photo(s) (under min {args.min})")
                else:
                    stats["none"] += 1
                    print("-> NONE (blocked or no gallery)")
                # write manifest incrementally so a crash keeps progress
                MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
                time.sleep(random.uniform(1.5, 3.5))
        finally:
            context.close()

    print("\n" + "=" * 56)
    print(f"DONE. full(>={args.min}): {stats['ok']}  partial: {stats['partial']}  "
          f"none: {stats['none']}  of {len(locations)}")
    print(f"Images: {OUT_DIR}")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
