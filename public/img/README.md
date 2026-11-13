# Reciter photos

Drop reciter photos here as JPG. The app picks them up automatically.

## Automatic fetch (recommended)

`scripts/fetch-reciter-photos.py` downloads high-quality photos from
Wikipedia/Wikimedia Commons, crops them to a 640×640 square and saves them
here. It validates that the article is actually about a Quran reciter
(it rejects athletes/actors with similar names) and rate-limits politely.

```bash
python3 scripts/fetch-reciter-photos.py                  # all catalog entries missing on disk
python3 scripts/fetch-reciter-photos.py --only sudais    # one reciter
python3 scripts/fetch-reciter-photos.py --force dosari   # re-download
```

To add a reciter, add an entry to `CATALOG` in the script (Arabic Wikipedia
titles first, then English), run it, then map the slug in
`src/scripts/app.js` (`RECITER_PHOTOS` substring map or
`RECITER_PHOTOS_EXACT` exact-name map).

## Manual

`<slug>.jpg` or `<reciter-id>.jpg` (mp3quran catalog id, e.g. `103.jpg`).
If no photo is found (or the file fails to load), the app falls back to the
generated ornamental avatar, so nothing breaks when images are missing.

Recommended: square images, 512×512 or larger. The same photo is used on
reciter cards, the surah-page hero, the now-playing panel, and the
full-screen player (blurred, as a video-frame background).

The player mandala design source lives at `src/assets/player-frame.svg`; it is
embedded inline at build time (the red placeholder circle becomes the reciter
photo and the gold ring animates with playback progress).
