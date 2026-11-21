# Adhkar data

`adhkar.json` — 132 categories / 267 adhkar from **Hisn al-Muslim** (حصن المسلم),
sourced from [rn0x/Adhkar-json](https://github.com/rn0x/Adhkar-json) (audio fields stripped).

Structure: `[{ category, array: [{ id, text, count }] }]`

"أذكار الصباح والمساء" is presented in the app as two entries (morning / evening) sharing the same texts.

`adhkar-audio.json` —Audio Adhkar (`/adhkar/audio`) track list: 2 reciters × morning / afternoon.
To update a file, edit its `src` (e.g. the Internet Archive URL) — page + cards update on rebuild.
`images[period]` maps each card hero; `sizeMB` stays in sync with the uploaded file.
