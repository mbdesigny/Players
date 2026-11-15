# Remediation Implementation Plan — Ouns / Players

Derived from the 11-phase audit report (commit `49de07a`): 47 findings recorded, 46 active, 5 Medium (F-21, F-31, F-38, F-41, F-43), 41 Low, 0 High / 0 Critical. Key findings were re-verified against the working tree before this plan was written (deploy.yml, sw.js, app.js, wrangler.jsonc all match the audit's evidence).

Severities and finding IDs below reference the audit ledger. Each workstream lists concrete file-level actions, acceptance criteria, and verification steps. Workstreams are ordered so the highest-leverage, lowest-effort fixes land first.

---

## Wave 1 — Immediate (same day, ~1 hour)

### 1.1 CI/CD pipeline hardening — fixes F-41 (Medium), F-37

File: `.github/workflows/deploy.yml`

- [ ] Pin every Action to a full-length commit SHA instead of a tag:
  - `actions/checkout@v4` → `actions/checkout@<sha>` (v4.x latest release SHA)
  - `actions/setup-node@v4` → `actions/setup-node@<sha>`
  - `cloudflare/wrangler-action@v3` → `cloudflare/wrangler-action@<sha>`
- [ ] Add a least-privilege top-level permissions block:
  ```yaml
  permissions:
    contents: read
  ```
- [ ] Add a `pull_request` trigger so PR code is tested before merge:
  ```yaml
  on:
    push:
      branches: [main]
    pull_request:
    workflow_dispatch:
  ```
- [ ] Add a `concurrency` group for PR runs (or gate deploy steps on `github.ref == 'refs/heads/main'`) so PR builds cannot deploy. Concretely: wrap the "Deploy to Cloudflare Workers" step in `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`.
- [ ] Scope the Cloudflare API token (Cloudflare dashboard → API Tokens): permissions limited to **Account → Workers Scripts → Edit** for zone/account `ounsapp` only. This is a dashboard action, not a repo change.

Acceptance: workflow file contains only SHA-pinned uses, a `permissions:` block, a `pull_request` trigger, and deploy gated to main. A test PR shows lint/test/build running on the PR without deploying.

Verification: `actionlint` (or careful YAML read); open a draft PR and confirm checks run; confirm no deployment log appears on the PR run.

### 1.2 Security response headers — fixes F-44 (extends F-04)

New file: `public/_headers` (copied to `dist/` by the Astro static build; consumed by Workers Static Assets).

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; img-src 'self' data: https:; media-src 'self' blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://mp3quran.net https://*.mp3quran.net https://api.alquran.cloud https://cdn.islamic.network https://api.aladhan.com https://api.open-meteo.com https://nominatim.openstreetmap.org https://api.bigdatacloud.net https://get.geojs.io https://ipwho.is https://ipapi.co https://cdn.jsdelivr.net https://raw.githubusercontent.com https://i.ytimg.com https://www.youtube.com; frame-src https://www.youtube.com; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
```

Notes:
- `style-src 'unsafe-inline'` is required because Astro inlines component styles; tighten later if the build emits no inline styles (check `dist/` after a build).
- `connect-src` must enumerate exactly the 12 runtime endpoints in the audit's trust-surface map (Section 7). Keep that table as the living source of truth: any new endpoint requires a `connect-src` update.
- `frame-ancestors 'none'` supersedes `X-Frame-Options` but both are harmless to send.
- Verify Cloudflare Workers Static Assets honors `_headers` for the configured `assets.directory`; if not, add the headers via a `wrangler.jsonc`-compatible mechanism (e.g. a tiny Worker wrapper or `_routes`-based middleware) — test on a preview deployment first.

Acceptance: `curl -sI https://ounsapp.musbch.workers.dev/` returns CSP, XCTO, Referrer-Policy, Permissions-Policy, HSTS. App functionality (audio, mushaf images, YT embed, geo/prayer APIs) unaffected.

Verification: `npm run build && npm run preview`, exercise all player paths; then deploy and curl the live origin.

---

## Wave 2 — Short term (1–2 weeks)

### 2.1 Constrain the YouTube loader — fixes F-43 (Medium), closes F-04

File: `src/scripts/app.js:1146` (`loadYtApi`)

- [ ] Keep the CSP `script-src` allowlist from 1.2 as the primary bound.
- [ ] Add `sc.integrity` is not possible for the rotating `iframe_api` loader (it redirects and mutates) — instead document this explicitly in the trust-surface table and rely on CSP + `frame-src` sandboxing of the actual player iframe.
- [ ] Load the player inside a sandboxed iframe rather than the IFrame API where feasible: `allow="autoplay; encrypted-media"`, `sandbox="allow-scripts allow-same-origin allow-presentation"`. Evaluate against the fullscreen-player feature set (currentTime polling, seek, captions toggle at `app.js:1148-1160`) — if postMessage control requires the API, keep the API but confirm the CSP `script-src` entry is the only YouTube origin allowed.
- [ ] Lazy-load: only call `loadYtApi()` when the user first opens a YouTube-backed item (verify current behavior; if it fires on init, defer it).

Acceptance: no YouTube-origin script beyond the CSP allowlist can execute; loader is deferred until first use.

Verification: browser devtools network tab — confirm `iframe_api`/`www-widgetapi.js` load only on first YT item; CSP report-only phase (`Content-Security-Policy-Report-Only`) for one deploy before enforcing.

### 2.2 Overlay dialog semantics + focus management — fixes F-31 (Medium)

Files: `src/components/Modals.astro`, `src/scripts/app.js:1815-1826`, all 6 overlays (4 modals + 2 drawers)

- [ ] Replicate the `npOverlay` focus pattern (the existing exemplar) to every overlay: on open, save `document.activeElement`, focus the first focusable element; on close, restore it.
- [ ] Add `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing at each overlay's title element.
- [ ] Implement a single shared Escape handler: close the topmost open overlay, including `confirmScrim` (currently omitted at `app.js:1815-1826`).
- [ ] Add a focus trap (Tab/Shift+Tab cycle within the overlay) — a small shared helper in `app.js` or a new `lib/focus.js` pure module (testable per F-38 direction).

Acceptance: keyboard-only pass: Tab into modal, focus is trapped, Escape closes topmost overlay (including the confirm scrim), focus returns to the trigger on close.

Verification: manual keyboard test + a new `tests/focus.test.mjs` for the pure trap helper (`node --test`).

### 2.3 Client error telemetry — fixes F-21 (Medium)

Files: `src/layouts/Base.astro:81-84`, `wrangler.jsonc`

- [ ] Add an inline pre-paint script in `Base.astro` wiring `window.onerror`, `window.addEventListener('unhandledrejection', …)`, and replacing the bare `.catch(()=>{})` on SW registration with a logged handler.
- [ ] Ship errors to a collector. Zero-dependency options in order of preference:
  1. Cloudflare Workers Logpush / Tail via a small error-beacon route (requires moving off pure-static assets — weigh against architecture);
  2. A self-hosted beacon endpoint (same constraint);
  3. Minimal viable: batch errors into `localStorage` (`ouns_errors`, capped ring buffer of 50) and expose a debug dump — plus enable Cloudflare Web Analytics for usage signal.
- [ ] Sample: cap at N errors per session to avoid loops; never include localStorage contents or coordinates in payloads.

Acceptance: a thrown exception in a staging build is captured with message + stack + URL; no PII transmitted.

Verification: temporary `throw` in a dev build; confirm capture path fires.

### 2.4 A11y finishing cluster — fixes F-32, F-33, F-34, F-35, F-36

- [ ] **F-35** `src/styles/global.css:124,5332-5335`: darken gold `#B99745` to a ≥3:1 non-text contrast variant (e.g. `#8a6d1f`-family; compute exact value against both themes) for the `:focus-visible` outline and light-theme gold UI elements. Keep the decorative brand gold where contrast does not apply.
- [ ] **F-36** `src/pages/index.astro:31`: add `role="status" aria-live="polite"` to the toast container; announce view rebuilds by updating a visually-hidden live region with the view title (`app.js:1399-1405`).
- [ ] **F-33**: replace the 5 hardcoded English `aria-label`s (starting `src/components/FullscreenPlayer.astro:13`) with `data-i18n-aria` keys + `I18N` entries (ar+en).
- [ ] **F-32**: add `aria-pressed` to all toggle buttons, `aria-checked` where a switch pattern applies (adhan toggle, CC toggle), updated in the same handlers that flip visual state.
- [ ] **F-34**: wrap user/reciter/surah names and any mixed-direction strings in `<bdi>` or add `dir="auto"`; add `lang="ar"` on Arabic content nodes rendered inside English context (and vice versa).

Acceptance: axe/devtools audit shows no critical a11y issues on main views; `aria-pressed` grep returns non-zero; all `aria-label`s resolve through `t()`.

Verification: `npm run lint`; manual screen-reader spot-check (VoiceOver/NVDA) on player, favorites, settings.

### 2.5 Supply-chain content fixes — fixes F-45, F-42

- [ ] **F-45** `src/scripts/app.js:535-544`: pin the three fallback repos to immutable commit SHAs instead of `@main` (both `cdn.jsdelivr.net/gh/<repo>@<sha>/…` and `raw.githubusercontent.com/<repo>/<sha>/…`). Resolve current SHAs once, record them in `src/assets/mushaf/README.md` and `src/assets/mushaf-warsh/README.md` alongside the documented fallback order.
- [ ] **F-42**: regenerate `package-lock.json` against `registry.npmjs.org` (`rm package-lock.json && npm install` with default registry), verify `npm audit` still reports 0 and all 417 integrity fields persist; commit the regenerated lockfile. Optionally add `.npmrc` with `registry=https://registry.npmjs.org/` to prevent recurrence.

Acceptance: zero `registry.npmmirror.com` URLs in the lockfile; zero `@main` references in fallback chains.

Verification: `grep -c npmmirror package-lock.json` → 0; `grep '@main' src/scripts/app.js` → 0; `npm ci && npm test && npm run build`.

### 2.6 SW + fetch resilience — fixes F-22, F-23, F-25

- [ ] **F-22** `public/sw.js:23,27-33`: remove `clients.claim()` from activate (or gate it on `navigator.serviceWorker.controller === null` for first install only). Keep `skipWaiting` only if paired with a page-reload prompt; simplest safe form: let the new SW wait until all tabs close (drop `skipWaiting`). Ensure old caches are purged only after the new SW controls.
- [ ] **F-23**: route the SW precache loop (`sw.js:43`) through a timeout-wrapped fetch (mirror `apiFetch`'s 10 s AbortController pattern; a shared tiny helper is fine to duplicate in the SW since it can't import app modules). Add `online`/`offline` listeners in `app.js` to pause/resume background fetch work (mushaf precache, weather refresh).
- [ ] **F-25** `app.js:1581`: `await Notification.requestPermission()` and write the result into the adhan toggle state; when `denied`, render the toggle OFF/disabled with an explanatory toast (i18n'd).

Acceptance: deploy with an open tab produces no 404 dynamic imports; permission-denied state is reflected in the UI.

Verification: two-tab manual deploy simulation; `npm run build && npm run preview` update flow.

---

## Wave 3 — Mid term (1–2 months)

### 3.1 Module extraction from app.js — fixes F-38 (Medium)

Files: `src/scripts/app.js` (1,884 lines, 0 exports) → `src/scripts/lib/`

Strategy: incremental strangler pattern, following the existing 6-module pure-lib convention (see `lib/api.js` for the exemplar). Each extraction ships with tests in the same PR.

Extraction order (highest value / lowest DOM coupling first):
1. State reducers: favorites/recents/settings mutations (pure functions over plain state objects).
2. Source-picking logic: fallback catalog resolution (`FALLBACK` at `app.js:19`), edition matching.
3. Player queue logic: next/prev/shuffle/repeat as pure transitions.
4. Persistence layer: replace the inline `store` (app.js:20) with `lib/storage.js` (see 3.2).
5. DOM-coupled controllers remain in `app.js`, which shrinks each wave.

Acceptance: `app.js` exports nothing at top level still, but ≥3 new pure modules exist with ≥85% line coverage; `npm test` suite grows accordingly; no behavior change (manual smoke of player, mushaf, favorites).

Verification: `node --test` on new suites; `npm run build` size diff reviewed.

### 3.2 Persistence hardening batch — fixes F-26, F-27, F-28, F-29, F-30

New module: `src/scripts/lib/storage.js` (pure, testable)

- [ ] **F-26**: introduce `ouns_schemaVersion` (v1); a single `migrate(storage, fromVersion)` function replaces the two inline migration blocks (`app.js:56-61,64`); on init, delete known-orphaned legacy keys.
- [ ] **F-27**: per-key read validators (a `SCHEMA` map: key → type/shape check + safe default), applied in `store.get`. Start with `recent` (validate each item), `favorites`, `prayerLoc` (reuse the `isNaN` exemplar pattern from `detectIP`).
- [ ] **F-28**: `store.set` catches `QuotaExceededError` distinctly → surface a one-time user toast (i18n'd) and log via the 2.3 telemetry hook.
- [ ] **F-29**: listen for the `storage` event and re-sync affected keys cross-tab (last-writer-wins is acceptable for most keys; `session`/`player` state should prefer the most recent write with a timestamp); coalesce the 5 s session writes.
- [ ] **F-30** `src/layouts/Base.astro:40-49,88`: extend the existing documented pre-paint bypass to read the theme key (tiny inline script setting `data-theme` before first paint).

Acceptance: corrupted localStorage value for any schema'd key recovers to default without breaking init; quota error shows a toast; second tab reflects a favorites change within ~1 s.

Verification: new `tests/storage.test.mjs` covering migration, validators, quota path; manual two-tab test.

### 3.3 Privacy disclosure + geo consolidation — fixes F-46

Files: `src/scripts/app.js:856,869-878`, settings UI, `I18N`

- [ ] Reduce the IP-geo chain from 3 services to 1 primary + 1 fallback (recommend `get.geojs.io` → `ipwho.is`; drop `ipapi.co`), cutting the third disclosure entirely.
- [ ] Add an in-app privacy notice (settings section + first-run disclosure on the location feature): plain-language ar+en text stating that IP / GPS coordinates are sent to named third-party services (mp3quran, Aladhan, Open-Meteo, BigDataCloud, geojs/ipwho.is) solely for prayer times and weather, with a link/section listing all endpoints (from the audit's trust-surface map).
- [ ] Gate the network-location path behind explicit user opt-in where the feature allows (default to manual city search via Nominatim, which discloses only the typed query).

Acceptance: no IP transmission before opt-in on the location path; privacy text present in both languages; endpoint list matches the trust-surface table.

Verification: fresh-profile network log — confirm no geo requests until opt-in; grep for the new i18n keys.

### 3.4 ARIA states + bidi completion (remainder of F-32/F-34 if not finished in 2.4)

Tracked in 2.4; carry-over items only.

---

## Wave 4 — Ongoing hygiene

### 4.1 Dependency automation — fixes F-47

- [ ] Add `.github/dependabot.yml`: npm ecosystem, weekly, group minor/patch; GitHub Actions ecosystem, weekly (keeps SHA pins in 1.1 updated).
- [ ] Pin the toolchain: add `packageManager` field (corepack) and `.nvmrc` (`22`), align `engines` with CI (`"node": ">=22"`).
- [ ] Optional: `npm audit` step in CI (`npm audit --omit=dev || true` initially to avoid breakage, tighten after baseline review).

### 4.2 Test coverage — fixes F-39, F-40, closes F-12

- [ ] Add `tests/surah.test.mjs`: structurally validate all 114 entries (id 1–114 contiguous, non-empty ar/en names, page counts monotonic, ayah counts > 0) — this retires the audit's 9/114 spot-check gap.
- [ ] Add negative tests for the prayer NaN path (F-12): malformed lat/lng, missing fields, extreme dates → assert `prayerTimeStr`/`countdownStr` return safe fallbacks rather than `"NaN:NaN"`.
- [ ] Add coverage measurement: `node --test --experimental-test-coverage` in a CI step (report-only at first).

### 4.3 Living trust-surface document

- [ ] Add `docs/TRUST-SURFACE.md` containing the audit's Section 7 endpoint table; make it a review checklist item: any PR adding a new external endpoint must update CSP `connect-src` and this table.

---

## Traceability

| Wave | Findings closed | Severities |
|---|---|---|
| 1 | F-41, F-37, F-44 (+F-04 partial) | 1 Medium, 2 Low |
| 2 | F-43, F-31, F-21, F-32, F-33, F-34, F-35, F-36, F-45, F-42, F-22, F-23, F-25 | 2 Medium, 11 Low |
| 3 | F-38, F-26, F-27, F-28, F-29, F-30, F-46 | 1 Medium, 6 Low |
| 4 | F-47, F-39, F-40, F-12 | 4 Low |

All 5 Medium findings (F-21, F-31, F-38, F-41, F-43) are addressed by end of Wave 3; 4 of 5 are touched in Waves 1–2. Findings closed as a side effect: F-04 (via 1.2 + 2.1), F-05 residual dimensions (via 1.1). F-24 is superseded per the audit's COR-2 and requires no action.

## Definition of done (per workstream)

- Lint + tests + build pass locally (`npm run lint && npm test && npm run build`).
- No new external endpoints without a CSP `connect-src` entry and a `docs/TRUST-SURFACE.md` row.
- No secrets, no PII in telemetry, no new dependencies beyond what the package already uses.
- Each workstream lands as its own focused PR so review and revert stay cheap.
