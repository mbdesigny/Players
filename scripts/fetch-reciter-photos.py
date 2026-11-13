#!/usr/bin/env python3
"""Fetch high-quality reciter photos from Wikipedia/Wikimedia Commons.

Usage:
  python3 scripts/fetch-reciter-photos.py                 # fetch all catalog entries missing on disk
  python3 scripts/fetch-reciter-photos.py --only sudais   # fetch one or more: --only sudais,afasy
  python3 scripts/fetch-reciter-photos.py --force dosari  # re-download even if the file exists

Photos are saved to public/img/<slug>.jpg (square, 640x640, JPEG q88).
The app picks them up automatically via src/scripts/app.js RECITER_PHOTOS /
RECITER_PHOTOS_EXACT maps or the <reciter-id>.jpg convention.

To add a reciter, add an entry to CATALOG below (list Arabic Wikipedia titles
first, then English ones; the first article whose description looks like a
Quran reciter wins). If no article exists, upload the photo manually to
public/img/<slug>.jpg.
"""

import argparse
import io
import json
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

CATALOG = {
    "minshawi": ["محمد صديق المنشاوي"],
    "abdulbasit": ["عبد الباسط عبد الصمد"],
    "badr-turki": ["بدر التركي"],
    "shuraim": ["سعود الشريم"],
    "dosari": ["ياسر الدوسري"],
    "muaiqly": ["ماهر المعيقلي"],
    "sudais": ["عبد الرحمن السديس"],
    "afasy": ["مشاري راشد العفاسي"],
    "husary": ["محمود خليل الحصري"],
    "tablawi": ["محمد الطبلاوي", "Mohamed Tablawi", "Muhammad Tablawi"],
    "mustafa": ["مصطفى إسماعيل (قارئ)", "مصطفى إسماعيل"],
    "saad-ghamdi": ["سعد الغامدي"],
    "ajmi": ["أحمد العجمي"],
    "faris-abbad": ["فارس عباد", "Fares Abbad", "فارس عباد (قارئ)"],
    "dibirov": ["محمد ديبيروف", "Muhammad Dibirov"],
    "al-mousa": ["عبد الله الموسى (إمام)", "عبد الله الموسى"],
    "suhaim": ["عبد العزيز السحيم", "Abdulaziz Al-Suhaim"],
    "dukayn": ["هيثم الدخين", "Haitham Al-Dukhayn"],
}

# Quranify (quranify.pro) hosts real photos for some reciters by their own id.
# Only entries whose photo_url is .../photo.jpg are real; white_avatar.jpg is a
# placeholder. Find ids on https://quranify.pro/en/reciters (initialReciters JSON).
QURANIFY = {
    "faris-abbad": 1029,
    "mustafa": 1020,
}

OK_DESC = ("قارئ", "إمام", "reciter", "imam", "qur", " muezzin", "المصحف")
BAD_DESC = ("كرة", "لاعب", "football", "سياسي", "politician", "ممثل", "actor", "singer", "مغني")
OUT_DIR = "public/img"
TARGET = 640
UA = {"User-Agent": "OunsApp/1.0 (Quran player; contact: mbdesigny)"}


def get(url, binary=False, tries=4):
    for i in range(tries):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
            return d if binary else d.decode("utf-8", "ignore")
        except urllib.error.HTTPError as e:
            if e.code in (404, 403):
                raise
            if e.code == 429:
                time.sleep(15 * (i + 1))
                continue
            raise
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(3)
    raise RuntimeError("unreachable")


def summary(title, lang):
    q = urllib.parse.quote(title.replace(" ", "_"))
    return json.loads(get(f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{q}"))


def pick_url(j):
    oi = j.get("originalimage") or {}
    th = j.get("thumbnail") or {}
    w = oi.get("width") or 0
    src = oi.get("source")
    if src and 0 < w <= 1600:
        return src
    if th.get("source"):
        return th["source"].replace("/330px-", f"/{TARGET}px-")
    return src


def commons_search(term):
    q = urllib.parse.quote(term)
    u = (f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
         f"&gsrsearch={q}%20reciter&gsrnamespace=6&gsrlimit=3&prop=imageinfo"
         f"&iiprop=url&iiurlwidth={TARGET}&format=json")
    j = json.loads(get(u))
    for p in (j.get("query", {}).get("pages") or {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("thumburl"):
            return ii["thumburl"]
    return None


def save_square(data, path):
    im = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    if im.size[0] > TARGET:
        im = im.resize((TARGET, TARGET), Image.LANCZOS)
    im.save(path, "JPEG", quality=88)


def fetch(slug, titles, force=False):
    path = f"{OUT_DIR}/{slug}.jpg"
    if not force:
        try:
            with open(path, "rb"):
                return "exists"
        except FileNotFoundError:
            pass
    qid = QURANIFY.get(slug)
    if qid:
        try:
            data = get(f"https://media.quranify.pro/images/reciters/{qid}/photo.jpg", binary=True)
            save_square(data, path)
            return f"ok quranify:{qid}"
        except Exception as e:
            print(f"  quranify fail: {e}")
    for title in titles:
        for lang in ("ar", "en"):
            try:
                j = summary(title, lang)
            except Exception:
                continue
            if j.get("type") == "disambiguation":
                continue
            desc = (j.get("description") or "").lower()
            if desc and not any(k in desc for k in OK_DESC) and any(k in desc for k in BAD_DESC):
                print(f"  skip {lang}:{title} (wrong subject: {desc})")
                continue
            url = pick_url(j)
            if not url:
                continue
            try:
                data = get(url, binary=True)
                save_square(data, path)
                return f"ok {lang}:{title}"
            except Exception as e:
                print(f"  dl fail {lang}:{title}: {e}")
    alt = commons_search(titles[0])
    if alt:
        try:
            save_square(get(alt, binary=True), path)
            return "ok commons-search"
        except Exception as e:
            print(f"  commons fail: {e}")
    return "NOT FOUND"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated slugs")
    ap.add_argument("--force", help="comma-separated slugs to re-download")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    force = set(a.force.split(",")) if a.force else set()
    results = {}
    for i, (slug, titles) in enumerate(CATALOG.items()):
        if only and slug not in only:
            continue
        if i:
            time.sleep(2.5)
        r = fetch(slug, titles, force=slug in force)
        results[slug] = r
        print(f"{slug}: {r}")
    missing = [k for k, v in results.items() if "NOT FOUND" in v]
    if missing:
        print("\nmissing (add manually to public/img/):", ", ".join(missing))
        sys.exit(1)


if __name__ == "__main__":
    main()
