#!/usr/bin/env python3
"""
Headful Google Maps DATA grabber — phone, hours, address for Green Book locations.

Same proven approach as grab_place_images.py (visible Chrome + persistent profile
+ address-first search + coordinate guard), but instead of photos it reads the
phone number, opening hours, and street address shown on each place page.

LOCAL ONLY: writes to scraped_images/place_data.json for human review. Does NOT
touch the DB — a separate uploader applies reviewed data, filling BLANK fields only.

USAGE:
  python3 grab_place_data.py --missing        # only locations missing phone/hours/address
  python3 grab_place_data.py --ids a,b,c
  python3 grab_place_data.py --all
"""
import argparse
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

import importlib.util
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("gpi", HERE / "grab_place_images.py")
gpi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gpi)

OUT_DIR = gpi.OUT_DIR
PROFILE_DIR = gpi.PROFILE_DIR
DATA_PATH = OUT_DIR / "place_data.json"
UA = gpi.UA


def fetch_locations(env) -> List[Dict]:
    url = env["SUPABASE_URL"]
    key = (env.get("SUPABASE_ANON_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
           or env.get("SUPABASE_SERVICE_ROLE"))
    r = requests.get(f"{url}/rest/v1/locations",
                     params={"select": "id,name_en,type,address,lat,lng,phone,hours_en",
                             "city_id": "eq.atlanta", "order": "name_en"},
                     headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=30)
    r.raise_for_status()
    return r.json()


def extract_data(page) -> Dict[str, Optional[str]]:
    """Read phone / address / hours from an open Google Maps place page."""
    out = {"phone": None, "address": None, "hours": None}
    # Phone: button aria-label often "Phone: +1 404-..."
    try:
        for sel in ('button[aria-label^="Phone:"]', 'button[data-item-id^="phone"]',
                    'a[href^="tel:"]'):
            el = page.query_selector(sel)
            if el:
                lbl = el.get_attribute("aria-label") or el.get_attribute("href") or el.inner_text()
                m = re.search(r"(\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})", lbl or "")
                if m:
                    digits = re.sub(r"[^\d]", "", m.group(1))
                    if len(digits) == 10:           # normalize to E.164 (+1...) like the DB
                        out["phone"] = "+1" + digits
                    elif len(digits) == 11 and digits[0] == "1":
                        out["phone"] = "+" + digits
                    break
    except Exception:
        pass
    # Address: button with data-item-id="address" or aria-label "Address:"
    try:
        for sel in ('button[data-item-id="address"]', 'button[aria-label^="Address:"]'):
            el = page.query_selector(sel)
            if el:
                lbl = el.get_attribute("aria-label") or el.inner_text()
                out["address"] = (lbl or "").replace("Address:", "").strip()
                if out["address"]:
                    break
    except Exception:
        pass
    # Hours: the open-hours table/summary. Grab the aria-label of the hours button.
    try:
        for sel in ('button[aria-label*="Hours"]', 'div[aria-label*="Hours"]',
                    'button[data-item-id="oh"]'):
            el = page.query_selector(sel)
            if el:
                lbl = el.get_attribute("aria-label") or el.inner_text()
                if lbl:
                    clean = re.sub(r"\s+", " ", lbl).strip()
                    # Reject the collapsed UI summary ("Open · Closes 10 PM · See more
                    # hours") — that's a fragment, not real hours. Only accept text that
                    # carries an actual time RANGE (e.g. "9 AM–5 PM" or "Fri 1:00 PM").
                    if "See more" in clean or "Suggest" in clean:
                        continue
                    if re.search(r"\d{1,2}(:\d{2})?\s*[AP]M.*[–\-].*\d{1,2}(:\d{2})?\s*[AP]M", clean) \
                       or re.search(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)", clean):
                        out["hours"] = clean[:200]
                        break
    except Exception:
        pass
    return out


def grab_one(context, loc: Dict, guard_mi: float = 0.6) -> Dict:
    lat, lng = loc.get("lat"), loc.get("lng")
    addr = (loc.get("address") or "").strip()
    query = f"{loc['name_en']}, {addr}" if addr else loc["name_en"]
    if lat is not None and lng is not None:
        search_url = f"https://www.google.com/maps/search/{gpi.quote(query)}/@{lat},{lng},16z"
    else:
        search_url = f"https://www.google.com/maps/search/{gpi.quote(query)}"
    page = context.new_page()
    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.0)
        gpi.dismiss_consent(page)
        try:
            page.click('a[href*="/maps/place/"]', timeout=4000)
            time.sleep(2.0)
        except Exception:
            pass
        if lat is not None and lng is not None:
            rc = gpi._resolved_coords(page)
            if rc and gpi._haversine_mi(lat, lng, rc[0], rc[1]) > guard_mi:
                return {"_skipped": "place off-target"}
        return extract_data(page)
    except PlaywrightTimeout:
        return {}
    finally:
        page.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--all", action="store_true")
    g.add_argument("--missing", action="store_true",
                   help="only locations missing phone OR hours_en OR address")
    ap.add_argument("--ids")
    args = ap.parse_args()

    env = gpi.load_env(gpi.ENV_PATH)
    locs = fetch_locations(env)
    if args.ids:
        want = {s.strip() for s in args.ids.split(",")}
        locs = [l for l in locs if l["id"] in want]
    elif args.missing:
        locs = [l for l in locs if not (l.get("phone") or "").strip()
                or not (l.get("hours_en") or "").strip()
                or not (l.get("address") or "").strip()]
    if not locs:
        print("Nothing to do."); return

    OUT_DIR.mkdir(exist_ok=True); PROFILE_DIR.mkdir(exist_ok=True)
    data = json.loads(DATA_PATH.read_text()) if DATA_PATH.exists() else {}
    print(f"Grabbing phone/hours/address for {len(locs)} locations (visible Chrome).")
    got = {"phone": 0, "hours": 0, "address": 0}
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR), channel="chrome", headless=False,
            viewport={"width": 1280, "height": 900}, user_agent=UA, locale="en-US")
        try:
            for i, loc in enumerate(locs, 1):
                print(f"[{i}/{len(locs)}] {loc['name_en'][:32]:32}", end=" ", flush=True)
                d = grab_one(ctx, loc)
                if d.get("_skipped"):
                    print("-> skipped (off-target)")
                else:
                    # only record fields the DB is missing
                    rec = {}
                    if d.get("phone") and not (loc.get("phone") or "").strip():
                        rec["phone"] = d["phone"]; got["phone"] += 1
                    if d.get("hours") and not (loc.get("hours_en") or "").strip():
                        rec["hours_en"] = d["hours"]; got["hours"] += 1
                    if d.get("address") and not (loc.get("address") or "").strip():
                        rec["address"] = d["address"]; got["address"] += 1
                    if rec:
                        data[loc["id"]] = {"name_en": loc["name_en"], **rec}
                    print(f"-> {', '.join(rec.keys()) or 'nothing new'}")
                DATA_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))
                time.sleep(gpi.random.uniform(1.5, 3.0))
        finally:
            ctx.close()
    print(f"\nDone. New: phone {got['phone']}, hours {got['hours']}, address {got['address']}")
    print(f"Review file: {DATA_PATH}")


if __name__ == "__main__":
    main()
