#!/usr/bin/env python3
"""
Upload the best grabbed photo per location to Supabase, then set image_url.

Pairs with grab_place_images.py. Reads scraped_images/<id>/*.jpg + manifest.json,
picks the highest-resolution image per location, converts to WebP, uploads to the
`location-photos` Storage bucket, and updates locations.image_url.

SAFETY:
- A backup of current image_urls must exist at scraped_images/_image_url_backup.json
  (grab/CEO flow writes it). Refuses to run without it so the change stays reversible.
- --dry shows exactly what WOULD change without writing.
- Only updates a location when its new WebP upload SUCCEEDS — never blanks a row.
- Restore anytime with: python3 upload_grabbed_images.py --restore

Requires SUPABASE_SERVICE_ROLE in .secrets/supabase.env (Storage write + DB update).
"""

import argparse
import json
import sys
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional

import requests
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
ENV_PATH = REPO_ROOT / ".secrets" / "supabase.env"
OUT_DIR = REPO_ROOT / "scraped_images"
MANIFEST_PATH = OUT_DIR / "manifest.json"
BACKUP_PATH = OUT_DIR / "_image_url_backup.json"
BUCKET = "location-photos"


def load_env() -> Dict[str, str]:
    env: Dict[str, str] = {}
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def best_image(loc_dir: Path) -> Optional[Path]:
    """Pick the largest-by-pixel-area JPG in the folder."""
    best, best_area = None, 0
    for f in sorted(loc_dir.glob("*.jpg")):
        try:
            with Image.open(f) as im:
                area = im.size[0] * im.size[1]
            if area > best_area:
                best, best_area = f, area
        except Exception:
            continue
    return best


def to_webp(path: Path) -> Optional[bytes]:
    try:
        img = Image.open(path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        if max(img.size) > 1280:
            ratio = 1280 / max(img.size)
            img = img.resize(tuple(int(d * ratio) for d in img.size), Image.Resampling.LANCZOS)
        out = BytesIO()
        img.save(out, format="WEBP", quality=82)
        return out.getvalue()
    except Exception as e:
        print(f"    [webp error: {str(e)[:60]}]")
        return None


def upload(env, loc_id: str, webp: bytes) -> Optional[str]:
    url = env["SUPABASE_URL"]
    sr = env["SUPABASE_SERVICE_ROLE"]
    obj = f"{loc_id}.webp"
    r = requests.post(
        f"{url}/storage/v1/object/{BUCKET}/{obj}",
        data=webp,
        headers={"Authorization": f"Bearer {sr}", "apikey": sr,
                 "Content-Type": "image/webp", "x-upsert": "true"},
        timeout=30,
    )
    if r.status_code in (200, 201):
        return f"{url}/storage/v1/object/public/{BUCKET}/{obj}"
    print(f"    [upload {r.status_code}: {r.text[:80]}]")
    return None


def set_image_url(env, loc_id: str, image_url: str) -> bool:
    url = env["SUPABASE_URL"]
    sr = env["SUPABASE_SERVICE_ROLE"]
    r = requests.patch(
        f"{url}/rest/v1/locations",
        params={"id": f"eq.{loc_id}"},
        json={"image_url": image_url},
        headers={"Authorization": f"Bearer {sr}", "apikey": sr,
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
        timeout=30,
    )
    return r.status_code in (200, 204)


def do_restore(env) -> None:
    if not BACKUP_PATH.exists():
        print("ERROR: no backup to restore from.", file=sys.stderr)
        sys.exit(1)
    rows = json.loads(BACKUP_PATH.read_text())
    ok = 0
    for row in rows:
        if set_image_url(env, row["id"], row.get("image_url") or ""):
            ok += 1
    print(f"Restored {ok}/{len(rows)} image_urls from backup.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Upload best grabbed image per location")
    ap.add_argument("--dry", action="store_true", help="show what would change, write nothing")
    ap.add_argument("--restore", action="store_true", help="restore image_urls from backup")
    ap.add_argument("--ids", help="comma-separated location ids only")
    args = ap.parse_args()

    env = load_env()
    if "SUPABASE_SERVICE_ROLE" not in env and not args.dry:
        print("ERROR: SUPABASE_SERVICE_ROLE required to write.", file=sys.stderr)
        sys.exit(1)

    if args.restore:
        do_restore(env)
        return

    if not BACKUP_PATH.exists():
        print("ERROR: refusing to run without a backup at "
              f"{BACKUP_PATH} (so changes stay reversible).", file=sys.stderr)
        sys.exit(1)
    if not MANIFEST_PATH.exists():
        print("ERROR: no manifest — run grab_place_images.py first.", file=sys.stderr)
        sys.exit(1)

    manifest = json.loads(MANIFEST_PATH.read_text())
    wanted = {s.strip() for s in args.ids.split(",")} if args.ids else None

    stats = {"updated": 0, "skipped_no_files": 0, "failed": 0}
    for loc_id, info in manifest.items():
        if wanted and loc_id not in wanted:
            continue
        loc_dir = OUT_DIR / loc_id
        name = info.get("name_en", loc_id)
        if not loc_dir.exists() or not info.get("files"):
            stats["skipped_no_files"] += 1
            continue
        pick = best_image(loc_dir)
        if not pick:
            stats["skipped_no_files"] += 1
            continue
        print(f"{name[:42]:42} <- {pick.name}", end=" ", flush=True)
        if args.dry:
            print("(dry)")
            continue
        webp = to_webp(pick)
        if not webp:
            stats["failed"] += 1
            print("webp-fail")
            continue
        public = upload(env, loc_id, webp)
        if not public:
            stats["failed"] += 1
            print("upload-fail")
            continue
        if set_image_url(env, loc_id, public):
            stats["updated"] += 1
            print("OK")
        else:
            stats["failed"] += 1
            print("db-fail")

    print("\n" + "=" * 50)
    print(f"updated: {stats['updated']}  failed: {stats['failed']}  "
          f"no-files: {stats['skipped_no_files']}")
    if not args.dry:
        print("Restore with: python3 scripts/py/upload_grabbed_images.py --restore")


if __name__ == "__main__":
    main()
