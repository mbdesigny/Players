# Ouns — Implementation Roadmap

> Status updated to match the actual codebase. The app is an **Astro static
> site + one client-side vanilla JS module** (`src/scripts/app.js`) — it has a
> build step (`npm run build`), despite earlier drafts describing a
> single-file no-build app. RTL-first, ar/en, light/dark, `ouns_`-prefixed
> localStorage state, `api()` helper for JSON endpoints, `render()` view
> router.

---

## Phase 1 — Mushaf reading tab (real Madani pages)

**Status**: **shipped** — per product decisions: ayah-by-ayah playback was
cancelled (audio quality from full-surah files is the top priority), the
fullscreen verses panel was removed, and the mushaf became a reading-only
fullscreen tab.

Implemented:

- Sidebar tab «المصحف»: fullscreen immersive reading mode — sidebar, top bar,
  player bar and NP panel are hidden while reading; opening jumps straight to
  the last page read (no surah index; surah/juz navigation lives in the top
  bar dropdowns).
- Cover page = page 0 of the reading flow (per-riwaya cover:
  `public/mushaf-cover.jpg` Warsh, `public/mushaf-cover-hafs.jpg` Hafs),
  full container width, with a «continue reading — page N» button and a
  resume popup.
- Page turns treat the cover as page 0: cover → spread (1,2) → (3,4) → … →
  (603,604); odd page right, even left. Mobile shows one page per screen with
  swipe gestures.
- Open-book two-page spread on desktop (≥900px) with live re-render when
  crossing the breakpoint.
- **Pages are self-hosted SVGs** in `src/assets/mushaf/` (Hafs 604) and
  `src/assets/mushaf-warsh/` (Warsh), resolved at build time via
  `import.meta.glob`. Missing pages fall back to a remote chain
  (jsdelivr SVG → raw GitHub SVG → PNG CDN). Pages 1–2 are pre-wrapped into
  the standard 345×550 page frame. **License: CC-BY-NC 4.0** (see `NOTICE`).
- «Download all pages» ZIP: **streamed** (deflate, per-file fetch, progress,
  cancel, failure cap) — no 100MB+ memory spike.
- Riwaya chooser popup on first visit + setting; Hafs and Warsh 'an Nafi'.
- Top bar: surah dropdown + juz dropdown; bottom bar full-width slider;
  bars hidden by default, revealed by tap, auto-hide after 3s.
- Dark theme: SVG pages inverted via CSS filter, **except the cover**
  (`filter:none` on `.cover-page`).
- Touch/swipe navigation available across pages and the app.

Pending polish: none planned for this phase.

---

## Phase 2 — Prayer times with adhan

**Status**: **shipped** (core), with pending items below.

Implemented:

- Hero next-prayer card with weather (Open-Meteo) and countdown; full prayer
  view with today's prayers, sunrise, first/last third of the night.
- Data: `api.aladhan.com/v1/timings` (method 3), daily cache.
- Location: GPS geolocation + network/IP fallback + city search via Nominatim,
  with a default city; manual search UI.
- Adhan: 7 selectable voices self-hosted under `public/adhan/`
  (Makkah, Madinah, Aqsa, Egypt, Turkey, Qatami, Algeria/Boulaidi), played
  from a dedicated `Audio` element; on-screen adhan card with stop button.
- Per-prayer ±minutes offset correction (each prayer individually).
- Settings live in a modal opened from the prayer view.

Audit item **A9 is done**: an adhan-behavior setting (pause recitation or
`duck` — lower its volume to 15% during the adhan and restore it after), an
optional desktop notification at prayer time (Notification API, permission
requested when enabled), and a fixed quick-cities list in the location
search panel as a reliable fallback when detection fails.

**Pending** (tracked in the audit):
- Adhan must pause **all** players (Quran audio + YouTube) — the Quran
  audio element is paused in `stop` mode, but YouTube pausing and full
  visual state rollback are audit item B4.

---

## Phase 3 — Adhkar

**Status**: **shipped** (core), with pending persistence below.

Implemented:

- Sidebar view with categories (morning, evening, sleep, after prayer, …)
  from `src/data/adhkar.json` (Hisn al-Muslim based, see `NOTICE`).
- Card per dhikr with tap counter; completion state per category.

Daily progress is persisted (audit item A8 done): tap counts are saved per
category under `ouns_adhkar_YYYY-MM-DD` (auto-reset next day, old day keys
purged at startup), the category header shows «done X/Y», progress is
restored on reopen, and the morning/evening tab is auto-selected by time of
day (overridable via the back button).

---

## Phase 4 — YouTube player for best recitations

**Status**: **shipped** (core), with pending polish below.

Implemented:

- Independent «أفضل التلاوات» tab: curated video catalog embedded via the
  IFrame Player API; videos are fully standalone in their tab (no coupling
  with the audio player's queue state).
- In-site navigation only between the site's videos (no external exits).

**Pending** (user feedback): the custom player shell still lacks a CC
disable button and a fullscreen button; polish tracked under the B-stage
responsive/UX pass.

---

## Audit stages (A1–A19, B1–B6)

Tracked in `docs/IMPROVEMENTS-PROMPT.md`. Status:

| Stage | Scope | Status |
|---|---|---|
| A1 | Deployment setup (Cloudflare) | **pending** — no wrangler config/CI in repo yet |
| A2 | Mushaf pages off GitHub raw → self-hosted + CDN chain + Warsh PNG fallback | **done** |
| A3 | Streaming ZIP download with progress/cancel | **done** |
| A4 | CORS-safe audio (selective routing + element swap) | **done** |
| A5 | LICENSE + NOTICE + README attribution | **done** |
| A6 | Dead assets removed; adhan mp3s out of the bundle (`_astro` 8.5MB → 1.3MB) | **done** |
| A7 | This documentation sync | **done** |
| A8 | Adhkar daily progress | **done** |
| A9 | Adhan duck mode + notifications + location hardening | **done** |
| A10 | Split `app.js` into modules, ESLint/Prettier, unit tests | **done** — pure logic in `src/scripts/lib/` (text/surah/mushaf/sources/prayer), 29 unit tests via `node:test`, ESLint + Prettier wired (`npm run lint`/`format`/`test`), `engines.node >=18` |
| A11 | Deduplicate CSS; single `#view` click delegator | **done** — removed duplicate MUSHAF-1 section (merged unique props into MUSHAF-2), slimmed duplicate MOBILE-2 media blocks to unique rules (kept after base mushaf rules so cascade still wins), merged the two `#view` click handlers into one delegator; RESTORED-BASE section analyzed and intentionally kept (its 2 overlapping selectors are live partial overrides, not dead duplication) |
| A12 | `markPlayingRows()` null-number bug | **done** — rows now carry `data-n` (both reciter rows and collection rows), so un-marking always restores the real surah number; removed the dead `(row.dataset.coll!=null?null:null)` expression |
| A13 | Unified `apiFetch` layer (timeout/retry/cache) + Nominatim policy | **done** — `src/scripts/lib/api.js`: `apiFetch` with AbortController timeout, retry with backoff (5xx/429/network, fail-fast on 4xx), in-memory TTL cache; wired into mp3quran, alquran.cloud editions, open-meteo, bigdatacloud, geo IP chain, aladhan; `nominatimSearch` sends `Accept-Language` + identifying `User-Agent` and throttles to ~1 req/sec |
| A14 | Service worker cache versioning + mushaf offline | **done** — cache name versioned at build time from a content hash (`scripts/bump-sw.mjs`, `ouns-app-<hash>`); fixed a latent bug where same-origin responses were never cached (`res.clone()` ran after the browser consumed the body); mushaf pages cache-first in a dedicated unversioned `ouns-mushaf` cache (remote sources intercepted + `precache-mushaf` message from `mushafGo` for the current and next spread, capped at 700 entries); verified offline serving of shell, pages and cover |
| A15 | SSR-time lang/dir + missing i18n keys | **done** — blocking inline script in `Base.astro` `<head>` reads `ouns_lang` (JSON with bare-value fallback) and sets `documentElement.lang/dir` before first paint, so English users get `dir=ltr` with no flash (build default stays `lang="ar" dir="rtl"`); added missing translations: sidebar footer (`sideFoot` key + `data-i18n`), adhan voice names (`name_en` on all 8 voices, used in settings select and adhan banner), YouTube list (`reciter_en`/`title_en` on all 30 entries, used in cards and player caption), and adhkar categories (`AK_CAT_EN` generated from `adhkar.json`, 134 entries, full coverage — `akAutoCat`/`AK_FEATURED`/`AK_ICONS` still match on Arabic names) |
| A16 | sitemap.xml, robots, manifest screenshots/shortcuts | pending |
| A17 | Accessibility (slider roles, focus-visible, aria-labels) | pending |
| A18 | Escape all API-sourced `innerHTML` fields | pending |
| A19 | Self-host Google fonts | pending |
| B1–B3 | Systematic responsive + type/spacing scale pass | pending |
| B4 | Adhan pauses all players | pending |
| B5 | Mandala rotation bug (transform-origin, rAF-driven) | pending |
| B6 | WCAG AA contrast in both themes | pending |

---

## Suggested order

Remaining work, highest impact first: **B4 → B2 → B5 → B6 → B1/B3**, then
A16–A19 in numeric order (A1 deployment setup before the next production
deploy). Each stage ships independently on its own branch/PR; no breaking
changes to existing `ouns_` state keys.
