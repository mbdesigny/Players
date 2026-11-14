# Mushaf Flip-Book — Implementation Plan

> **Status: v1 implemented.** `page-flip` (StPageFlip) is a dependency; the engine lives in
> `src/scripts/flipbook.js`, which `app.js` lazy-loads via `import('./flipbook.js')` only when
> the mushaf reading view is active (Vite emits it as a separate chunk, so StPageFlip and the
> `page-flip` import are never fetched on other tabs). It mounts the book over the static
> stage (kept as fallback).
> Desktop = two-page landscape spread, mobile = portrait single page. Pages are built once
> per mount with `data-src` images loaded lazily (IntersectionObserver + ±4-page prefetch
> on flip). RTL handled by mirroring the host and re-mirroring page content
> (`scaleX(-1)` on `.flip-host` and `.flip-in`), so forward turns read right-to-left.
> Page overlay labels (page number bottom corner, juz top-start, surah name top-end) are
> rendered per page. `mushafGo()` turns the book in place when mounted; riwaya switches
> and breakpoint changes destroy and re-mount.

A plan to evolve the current mushaf reader (two static page images side by side) into a real
page-flip book experience.

## Goal

Realistic book reading: pages that turn with a 3D flip animation, a visible book spine,
and support for both mouse dragging and touch swipe — while keeping the existing
offline-first source chain (local SVG → CDN fallbacks) and keyboard navigation.

## Recommended utility: StPageFlip (page-flip)

- Package: `page-flip` (StPageFlip) — ~15 KB gzipped, no dependencies, MIT license.
- Why: purpose-built for book flips, supports HTML/image pages, drag + touch + keyboard,
  and works with the existing two-page ("book") layout.
- Alternative considered: CSS-only 3D flip (cheap, but no drag interaction and weaker
  realism) or turn.js (jQuery-era, unmaintained).

## Integration steps

1. **Dependency** — `npm i page-flip`. Import lazily inside the mushaf view only
   (`import('page-flip')` on first open) so the main bundle stays small.
2. **Container** — replace `.mushaf-stage` inner markup in reading mode with a single
   `#flipBook` container; render all 604 pages as `<img>` children up-front is too heavy,
   so use StPageFlip's dynamic mode (`loadPage(page)`) and return the page image URL from
   `mushafSVGURL(page, riwaya)` with the existing fallback chain.
3. **Wire state** — map `S.readN` ↔ flipbook current page:
   - `mushafGo(n)` → `flipBook.turnToPage(...)` / `flipBook.flip(page)`
   - `"onFlip"` event → update `S.readN`, persist via `store.set('mushafLast', ...)`,
     update the slider, page indicator, surah/juz selects.
4. **Riwaya switch** — destroy and re-create the flipbook instance when
   `S.mushafRiwaya` changes (hafs/warsh have different page images).
5. **Fallback** — keep the current static `.mushaf-page` markup as a no-JS/failed-import
   fallback; initialize flipbook only when the dynamic import resolves.
6. **Responsive** — desktop: two-page spread with `width: 900`+ and hard/soft covers;
   mobile: single page (`usePortrait: true`) so the flipbook also replaces the mobile
   single-page view.
7. **Chrome integration** — keep the secondary sidebar (surah/juz/page) and the clean
   reading mode working: clean mode hides chrome, flipbook stays interactive.
8. **Prefetch** — prefetch page N±2 images during idle to avoid flip flicker on slow
   networks (extend the existing `mushafSources` fallback chain).

## Page overlay labels

StPageFlip wraps each rendered page in its own element, so page metadata is added as
overlay markup inside each page wrapper (StPageFlip supports arbitrary HTML inside
`loadFromHTML` pages):

```html
<div class="flip-page">
  <img src="…" alt="">
  <span class="fp-juz">الجزء ٢١</span>   <!-- top-start corner -->
  <span class="fp-surah">سورة البقرة</span> <!-- top-end corner -->
  <span class="fp-num">٣٤</span>        <!-- bottom corner -->
</div>
```

- Data source: the existing helpers already map page → metadata —
  `mushafSurah(page)` (surah index), `mushafJuz(page)` (juz number), and `SURAH` for
  names. Computed once per page in `loadPage`, no extra lookups needed.
- Placement: `fp-num` bottom-inline-end (bottom corner near the spine edge),
  `fp-juz` top-inline-start, `fp-surah` top-inline-end — all logical properties so
  they mirror correctly in both riwayat and languages.
- Styling: small, translucent chips (`background: rgba(0,0,0,.35); color: #fff;
  border-radius: 8px; font-size: var(--fs-2xs)`) absolutely positioned inside the
  page wrapper; hidden while the page is mid-turn (StPageFlip adds a turning class
  on the shadow element — target `.flip-page:not(.turning) .fp-*` if flicker shows).
- Accuracy note: a surah name shown on a spread belongs to the page where the surah
  starts; for the left (even) page of a spread, recompute `mushafSurah(page)` for
  that page rather than reusing the right page's value.

## Risks / notes

- StPageFlip renders into its own DOM; the current dark-theme `filter: invert(1)` on page
  images must be applied to the images inside the flipbook too.
- The embedded page SVGs are large; dynamic page loading + prefetch is required to keep
  memory sane on mobile.
- Keyboard arrows and touch swipes already exist — they must be routed to the flipbook
  instead of `mushafGo` when the flipbook is active to avoid double turns.

## Effort estimate

- Phase 1 (basic flip, desktop + mobile): ~1 day
- Phase 2 (prefetch, theme polish, fallbacks): ~0.5 day
