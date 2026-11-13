# Reciter photos

Drop reciter photos here as JPG. The app picks them up automatically.

## Naming

Two ways, checked in this order:

1. **By name** (preferred for the pinned homepage reciters):
   `minshawi.jpg`, `abdulbasit.jpg`, `badr-turki.jpg`, `shuraim.jpg`,
   `dibirov.jpg`, `dosari.jpg`, `muaiqly.jpg`, `al-mousa.jpg`,
   `suhaim.jpg`, `dukayn.jpg`

2. **By reciter id** (works for any reciter from the mp3quran catalog):
   `<reciter-id>.jpg` — e.g. `103.jpg`

If no photo is found (or the file fails to load), the app falls back to the
generated ornamental avatar, so nothing breaks when images are missing.

Recommended: square images, 512×512 or larger. The same photo is used on
reciter cards, the surah-page hero, the now-playing panel, and the
full-screen player (blurred, as a video-frame background).

The player mandala design source lives at `src/assets/player-frame.svg`; it is
embedded inline at build time (the red placeholder circle becomes the reciter
photo and the gold ring animates with playback progress).
