#!/usr/bin/env python3
"""
Grab 3-4 photos from an EXACT Google Maps place URL you provide.

For locations the automatic name/address search can't disambiguate (e.g. several
mosques sharing a name that Google collapses to one listing), a human pastes the
correct Maps place URL and we grab from that exact page — 100% correct, no guessing.

Reads pairs from a mapping file (location_id <TAB or space> URL), one per line,
or from --id + --url for a single location. Saves to scraped_images/<id>/1-4.jpg
and updates manifest.json. LOCAL ONLY — does not touch the DB.

USAGE:
  python3 grab_by_url.py --id <loc-id> --url "https://www.google.com/maps/place/..."
  python3 grab_by_url.py --file mosque_urls.txt      # lines: <id> <url>
"""
import argparse
import json
import time
from pathlib import Path
from typing import List

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# reuse the proven harvest + consent logic from the main grabber
import importlib.util
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("gpi", HERE / "grab_place_images.py")
gpi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gpi)

OUT_DIR = gpi.OUT_DIR
PROFILE_DIR = gpi.PROFILE_DIR
MANIFEST_PATH = gpi.MANIFEST_PATH
UA = gpi.UA


def grab_from_url(context, url: str, want: int) -> List[str]:
    page = context.new_page()
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.0)
        gpi.dismiss_consent(page)
        # If it's a /search/ or /place/ URL that lands on a list, open the place
        try:
            page.click('a[href*="/maps/place/"]', timeout=3000)
            time.sleep(2.0)
        except Exception:
            pass
        return gpi.collect_photo_urls(page, want)
    except PlaywrightTimeout:
        return []
    finally:
        page.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="single location id")
    ap.add_argument("--url", help="exact Google Maps URL for --id")
    ap.add_argument("--file", help="mapping file: lines of '<location_id> <url>'")
    ap.add_argument("--max", type=int, default=4)
    ap.add_argument("--min", type=int, default=3)
    args = ap.parse_args()

    pairs = []
    if args.file:
        for line in Path(args.file).read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(None, 1)
            if len(parts) == 2:
                pairs.append((parts[0], parts[1]))
    elif args.id and args.url:
        pairs.append((args.id, args.url))
    else:
        ap.error("provide either --file or both --id and --url")

    OUT_DIR.mkdir(exist_ok=True)
    PROFILE_DIR.mkdir(exist_ok=True)
    manifest = {}
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())

    want = max(args.max, args.min)
    print(f"Grabbing up to {want} photos for {len(pairs)} location(s) from exact URLs.")
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR), channel="chrome", headless=False,
            viewport={"width": 1280, "height": 900}, user_agent=UA, locale="en-US",
        )
        try:
            for lid, url in pairs:
                print(f"  {lid[:8]} <- {url[:60]}...", end=" ", flush=True)
                try:
                    urls = grab_from_url(context, url, want)
                except Exception as e:
                    urls = []
                    print(f"[err {str(e)[:40]}]", end=" ")
                loc_dir = OUT_DIR / lid
                saved = []
                if urls:
                    # wipe old (wrong) images for this id first
                    if loc_dir.exists():
                        for old in loc_dir.glob("*.jpg"):
                            old.unlink()
                    loc_dir.mkdir(parents=True, exist_ok=True)
                    for n, u in enumerate(urls, 1):
                        dest = loc_dir / f"{n}.jpg"
                        try:
                            if gpi.download(u, dest):
                                saved.append(dest.name)
                        except Exception:
                            pass
                prev = manifest.get(lid, {})
                manifest[lid] = {**prev, "source_urls": urls, "files": saved,
                                 "dir": str((OUT_DIR / lid).relative_to(gpi.REPO_ROOT)),
                                 "manual_url": url}
                MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
                print(f"-> {len(saved)} photos")
        finally:
            context.close()
    print(f"\nDone. Images in {OUT_DIR}, manifest updated.")


if __name__ == "__main__":
    main()
