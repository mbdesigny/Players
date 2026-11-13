# Reciter photos

Drop reciter photos here as JPG. The app picks them up automatically.

`player-frame.svg` is the player artwork design source (mandala frame with the
red reciter-photo placeholder in the center and the gold progress ring). The
app embeds the same artwork inline and turns the placeholder into the reciter
photo (or the surah number) and animates the ring with playback progress.

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
