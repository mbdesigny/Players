# Ouns — Implementation Roadmap

Updated plan for the four upcoming features. The app stays a single-file vanilla
HTML/CSS/JS application (no build step), RTL-first, with the existing helpers:
`api()` for JSON endpoints, `store` for `ouns_`-prefixed localStorage state,
`I18N` ar/en dictionary, and the view router in `render()`.

---

## Phase 1 — Ayah-by-ayah text in the full-screen player

**Goal**: show the surah's verses next to the artwork in the full-screen player,
highlight the ayah currently being recited, auto-scroll, and let the user click
any ayah to jump to it.

**Data source** (already in use: `api.alquran.cloud`):
- Arabic text: `GET /v1/surah/{n}/quran-uthmani`
- Optional translation: `GET /v1/surah/{n}/{edition}` (e.g. `en.sahih`), edition
  chosen in settings.

**Status**: **1a shipped** — surah mode (proportional sync) is live: the
fullscreen player has a verses panel (`#ovAyahs`) with the active ayah
highlighted, auto-scroll with manual-scroll detection, click-to-jump, and an
optional translation (9 editions, chosen in settings). Text is fetched from
`api.alquran.cloud/v1/surah/{n}/editions/quran-uthmani[,trans]` and timing is
estimated by distributing `audio.duration` over ayah text-length weights
(plus a bismillah weight for surahs ≠ 1, 9). Works with every reciter and
riwayat without touching the playback model.

**Audio sync strategy** — two modes:
1. **Ayah mode (Phase 1b, exact sync)**: build the playlist from per-ayah
   files instead of the surah file:
   `https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{globalAyah}.mp3`
   The player already handles source lists and track queues, so each ayah
   becomes a queue item; the current highlight is then always exact.
   Availability must be probed per reciter edition (same `ED_KEYS` matching
   logic used in `buildSources()`); fall back to mode 2 when no ayah edition
   exists (e.g. mujawwad riwayat).
2. **Surah mode (shipped as 1a, approximate)**: keep the single surah MP3 and
   distribute its duration proportionally over ayah text lengths
   (`ayah.numberInSurah` weights). Good enough for highlighting; Phase 1b can
   add an "approximate timing" hint in the UI.

**Code touchpoints**:
- New `S.ayahMode` (`'off'|'on'`), `S.ayahTrans` (edition id), cached in `store`.
- `loadTrack()` — when ayah mode is on, fetch text + build ayah queue.
- `updateProgress()` — map `audio.currentTime` to the active ayah index and
  toggle `.ayah-item.active`.
- Fullscreen overlay: add a two-column layout (artwork + `.ayah-panel` with
  scrollable verse list, Amiri font, auto-scroll with manual-scroll detection,
  click-to-jump). Reuse the collapsible-column pattern from the NP panel.
- Repeat settings gain "repeat ayah" scope (natural with ayah-mode queues).

**Effort**: medium. **Risk**: ayah-file availability per reciter (mitigated by
fallback mode 2).

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
3. **Phase 1** (ayah-by-ayah) — core player upgrade, medium effort
4. **Phase 4** (YouTube) — largest surface, depends on curated catalog

Each phase ships independently behind the existing view router; no breaking
changes to current state keys.
