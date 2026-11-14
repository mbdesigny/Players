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

## Deploy

The app is a **fully static** build, deployed to **Cloudflare Workers Static
Assets** — see [wrangler.jsonc](wrangler.jsonc) (worker `ounsapp` →
`ounsapp.<account>.workers.dev`, matching `site` in `astro.config.mjs`). No
server adapter is required because there is no SSR or API route.

Manual deploy:

```bash
npm install
npx wrangler login    # once — opens the browser to authorise your account
npm run deploy        # astro build (+ SW cache bump) then wrangler deploy
```

`npm run deploy` uploads `dist/` as static assets via `wrangler deploy`.

CI: a push to `main` lints, tests, builds and deploys through
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). Add two
repository secrets first — `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`.

## Quality checks

```bash
npm test          # unit tests (node:test) for src/scripts/lib modules
npm run lint      # ESLint over src/scripts/lib and tests/
npm run format    # Prettier over src/scripts/lib and tests/
```

Pure logic (text helpers, surah metadata, audio sources, mushaf paging, prayer
times) lives in `src/scripts/lib/` and is covered by tests in `tests/`. Node
>= 18 is required (`engines` in `package.json`). `app.js` and `global.css` are
excluded from Prettier for now to keep diffs small; formatting there is
gradual.

## Structure

- `src/pages/index.astro` — page composition
- `src/layouts/Base.astro` — head, fonts, global CSS
- `src/components/` — Sidebar, Center (topbar + view outlet), NowPlayingPanel,
  PlayerBar, FullscreenPlayer, Modals (settings / confirm / downloads drawer)
- `src/scripts/app.js` — all app logic (state, API, audio, rendering)
- `src/styles/global.css` — design tokens + all styles
- `src/assets/player-frame.svg` — player mandala design source (embedded inline)
- `public/img/` — reciter photos (see `public/img/README.md`)

## Features & roadmap

Shipped: a reciters/riwayat player (favorites, recents, downloads, sleep
timer), a full mushaf reading tab (Hafs + Warsh, self-hosted pages), prayer
times with per-prayer adhan and offsets, adhkar with daily progress, and a
YouTube player for video recitations.

See `docs/ROADMAP.md` for the full status. The A1–A19 and B1–B6 audit stages
are all done; the only open wishlist items (a CC-disable and a fullscreen
button for the YouTube shell) sit outside that audit.

## Licenses & attribution

The project code is MIT-licensed (see `LICENSE`). Bundled third-party assets
(mushaf pages CC-BY-NC, reciter photos from Wikimedia Commons, adhan
recordings, adhkar texts) and runtime data sources are documented with their
licenses in [`NOTICE`](NOTICE). The mushaf pages are **non-commercial**
(CC-BY-NC 4.0) — review `NOTICE` before any commercial redistribution.
