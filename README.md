# أُنس · Ouns — Quran Player

RTL-first Quran recitation player: reciters and riwayat from the mp3quran.net
catalog, audio fallback via the Islamic Network CDN, now-playing panel
(dockable/undockable), full-screen player with the mandala artwork, favorites,
recents, downloads, and sleep timer. Arabic/English UI (Alan Sans) with Quran
text in Amiri.

## Stack

[Astro](https://astro.build) — static shell + one client-side vanilla JS module.
No framework runtime is shipped to the browser.

## Develop

```bash
npm install
npm run dev       # http://localhost:4321
```

## Build

```bash
npm run build     # outputs static site to dist/
npm run preview   # serve the build locally
```

## Structure

- `src/pages/index.astro` — page composition
- `src/layouts/Base.astro` — head, fonts, global CSS
- `src/components/` — Sidebar, Center (topbar + view outlet), NowPlayingPanel,
  PlayerBar, FullscreenPlayer, Modals (settings / confirm / downloads drawer)
- `src/scripts/app.js` — all app logic (state, API, audio, rendering)
- `src/styles/global.css` — design tokens + all styles
- `src/assets/player-frame.svg` — player mandala design source (embedded inline)
- `public/img/` — reciter photos (see `public/img/README.md`)

## Roadmap

See `docs/ROADMAP.md` for the planned features: ayah-by-ayah text in the
full-screen player, prayer times with adhan, adhkar sabah/masaa, and a YouTube
player for video recitations.

## Licenses & attribution

The project code is MIT-licensed (see `LICENSE`). Bundled third-party assets
(mushaf pages CC-BY-NC, reciter photos from Wikimedia Commons, adhan
recordings, adhkar texts) and runtime data sources are documented with their
licenses in [`NOTICE`](NOTICE). The mushaf pages are **non-commercial**
(CC-BY-NC 4.0) — review `NOTICE` before any commercial redistribution.
