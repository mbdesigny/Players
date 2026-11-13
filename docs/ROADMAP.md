# Ouns — Implementation Roadmap

Updated plan for the four upcoming features. The app stays a single-file vanilla
HTML/CSS/JS application (no build step), RTL-first, with the existing helpers:
`api()` for JSON endpoints, `store` for `ouns_`-prefixed localStorage state,
`I18N` ar/en dictionary, and the view router in `render()`.

---

## Phase 1 — Mushaf reading tab (real Madani pages)

**Goal**: read the actual printed Madani mushaf (KFGQPC, Hafs 'an 'Asim,
604 pages) in a dedicated reading tab in the sidebar — not reflowed ayah
text, and not inside the fullscreen player.

**Status**: **shipped** — per product decisions: ayah-by-ayah playback was
cancelled (audio quality from full surah files is the top priority), the
fullscreen verses panel was removed, and the mushaf became a reading-only
sidebar tab showing real page images.

- Sidebar tab "المصحف / Mushaf": **fullscreen immersive reading mode** —
  while in the tab the sidebar, top bar, player bar and NP panel are all
  hidden; the mushaf shows its own minimal top bar (brand / search or
  surah + juz·page / theme / close) like desktop Quran apps.
- Index view: grid of all 114 surahs (name + start page + search-filterable
  with instant grid filtering) and a resume button for the last read page.
- Reader view: surah name + juz/page indicator (juz start-page table), page
  fitted to the viewport height, page-turn arrows in a bottom bar.
- Reader view: one page at a time, **SVG vector pages** (crisp at any zoom)
  from `raw.githubusercontent.com/Younes12345698/pro-muslim-mushaf` (KFGQPC
  artwork, Quran.ws/quranpedia SVG conversion, CC BY 4.0), with automatic
  fallback to the PNG CDN `SakinaDevGroup/mushaf-madani-cdn` (light/dark
  themes).
- Pages 1–604, prev/next navigation (RTL-aware), keyboard arrows, Escape
  exits to the app, page label with Arabic digits, last page persisted in
  `store`.
- Dark theme: native dark PNG fallback available; SVG pages are inverted
  via CSS filter (black ink → light ink) on the theme-matched background.

**Code touchpoints** (done):
- `SURAH_PAGE` mapping (surah → Madani start page), `mushafSVGURL` /
  `mushafPNGURL`, `mushafGo()`, `viewMushaf()`, `viewRead()` in `app.js`.
- `S.readN` (current page or null = index), `S.mushafPage` persisted.
- Sidebar nav item `data-view="mushaf"`; `render()` branch + `#view`
  delegation (`[data-read]`, `mushafback`, `mprev`, `mnext`).

---

## Phase 2 — Prayer times with adhan

**Goal**: next-prayer countdown in the sidebar, a full prayer-times view, and an
optional adhan when a prayer time enters while the app is open.

**Data source**: `https://api.aladhan.com/v1/timings/{DD-MM-YYYY}` — free, no
key, returns all five prayers + sunrise/midnight. Params: `latitude`,
`longitude`, `method` (calculation method), `school` (Asr madhab).

**Location**: browser geolocation on first use (explicit permission), with a
manual city fallback list (major cities, AR/EN labels) stored via `store`.
Never block the UI on geolocation.

**Code touchpoints**:
- New sidebar view `prayer` + compact widget card under the verse card showing
  next prayer name/time and a live countdown (reuse `sleepTick`-style interval).
- Settings: calculation method select (list from
  `https://api.aladhan.com/v1/methods`), Asr school, city override.
- Adhan: bundled `audio/adhan.mp3` in the repo (short Makkah adhan), played via
  a second `Audio` element at prayer time only if the Quran player is idle (or
  ducked, per setting). Optional desktop notification via the Notification API.
- State: `S.prayerCity`, `S.prayerMethod`, `S.adhan` (`'off'|'on'|'duck'`),
  daily timings cache keyed by date (one API call per day).

**Effort**: small-medium. **Risk**: geolocation denial (mitigated by city
fallback); adhan only works while a tab is open (documented in settings).

---

## Phase 3 — Adhkar sabah / masaa

**Goal**: morning and evening remembrances with tap counters and daily progress.

**Data**: static, bundled in the app (no API): Hisn al-Muslim (public domain)
— أذكار الصباح and أذكار المساء sections. Each item: `{text, count, source,
virtue?}`. Stored as a JS object in the single file (keeps offline/file://
behavior); ar text is original, en translation included.

**UI**:
- New sidebar view `adhkar` with two tabs (صباح / مساء). Auto-select tab by time
  of day (morning until Zuhr, evening after Asr), overridable.
- Card per dhikr: Amiri text, source line, and a tap counter that decrements
  `count` with a subtle fill animation; completed items collapse.
- Progress header ("7 / 12") persisted per calendar day in `store`
  (`ouns_adhkar_YYYY-MM-DD`), resetting automatically the next day.

**Code touchpoints**: `I18N` keys, view renderer, small CSS block. No changes
to the player.

**Effort**: small. **Risk**: none (static data).

---

## Phase 4 — YouTube player for best recitations

**Goal**: curated video recitations watchable inside Ouns, without breaking the
audio player's state.

**Approach**:
- **Curated catalog, no API key**: a `RECITER_VIDEOS` map (reciter key → list of
  `{videoId, title}`) maintained in code, embedded via the IFrame Player API
  with `youtube-nocookie.com`. A YouTube Data API key setting can be added later
  for search, but the default flow needs no key.
- New "Videos" tab inside the reciter page (next to the surah list) + a Videos
  view in the sidebar for featured playlists.
- Only one player active at a time: starting a video pauses the Quran audio
  (and vice versa). The sleep timer applies to video playback too.
- Theater-style frame reusing the full-screen overlay styles; mediaSession
  metadata updated for videos.

**Code touchpoints**: lazy-load the IFrame API script only when the tab is
opened; new `videoView()` renderer; playback-state guard in `loadTrack()`.

**Effort**: medium. **Risk**: video availability/region restrictions (curated
list mitigates); no background audio on mobile (platform limitation).

---

## Suggested order

1. **Phase 3** (adhkar) — smallest, fully offline, high daily-use value
2. **Phase 2** (prayer times + adhan) — small, complements adhkar
3. **Phase 1** (mushaf tab) — core reading upgrade, medium effort
4. **Phase 4** (YouTube) — largest surface, depends on curated catalog

Each phase ships independently behind the existing view router; no breaking
changes to current state keys.
