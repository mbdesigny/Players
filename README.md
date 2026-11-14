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

## Deploy (Cloudflare Pages — static)

The build output is fully static (`dist/`), so Cloudflare Pages needs **no
adapter and no deploy command**. `wrangler.jsonc` points Pages at `dist/`.

### Option 1 — Git integration (recommended)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**
   and pick this repository.
2. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Deploy command**: **leave empty** — Pages uploads `dist/` automatically
     after the build. Never set `npx wrangler preview` (it is a Workers-only
     beta command and fails the deploy).
3. Every push to the production branch deploys automatically.

### Option 2 — CLI

```bash
npm run build
npx wrangler pages deploy dist
```

### Domain

Update `site` in `astro.config.mjs` to the final public domain so canonical,
Open Graph and sitemap URLs are absolute.

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
