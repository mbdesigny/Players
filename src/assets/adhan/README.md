# Adhan audio (self-hosted, served statically)

The recordings live in `public/adhan/` so they are **not** bundled into the JS
build — the browser downloads only the selected voice, on demand.

- `public/adhan/adhan.mp3` — general adhan (Abdul Basit Abdul Samad), all prayers
- `public/adhan/adhan-fajr.mp3` — Fajr adhan (Abu Hazim), Fajr only
- `public/adhan/voices/*.mp3` — selectable adhan voices (Makkah, Madinah,
  Aqsa, Egypt, Turkey, Qatami, Boulaidi/Algeria)

Sources are documented in the root `NOTICE` file. Replace files (keeping the
same names) to change a voice.
