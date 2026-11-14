# Mushaf Flip-Book — Implementation Plan

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
