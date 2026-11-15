# Ouns / Players — Full Audit Report (11-Phase, Read-Only)

| Field | Value |
|---|---|
| **Repository** | `https://github.com/mbdesigny/Players` |
| **Application** | Ouns / أُنس — Quran audio player (Arabic-first PWA) |
| **Commit audited** | `49de07a` (branch `main`, clean tree, verified at every session boundary) |
| **Production origin** | `ounsapp.musbch.workers.dev` (Cloudflare Workers Static Assets, worker `ounsapp`) |
| **Method** | 11-phase read-only static analysis (Phase 0–10), gate-controlled, user-approved at every transition |
| **Report generated** | 2026-11-15 20:03 CET |
| **Findings** | 47 recorded / 46 active — 5 Medium / 41 Low / **0 High / 0 Critical** |
| **Verified-Clean** | 51 entries |
| **Writes to audited repository** | **None** (read-only mandate upheld end-to-end) |

---

## Table of Contents

1. [Engagement Overview](#1-engagement-overview)
2. [Executive Summary](#2-executive-summary)
3. [Phase Status Ledger (Phase 0–10)](#3-phase-status-ledger-phase-010)
4. [Master Findings Table (F-01–F-47)](#4-master-findings-table-f-01f-47)
5. [Detailed Findings](#5-detailed-findings)
6. [Evidence-Integrity Corrections (COR-1/2/3)](#6-evidence-integrity-corrections-cor-123)
7. [Third-Party Trust-Surface Map](#7-third-party-trust-surface-map)
8. [OWASP Top 10 (2021) Coverage Matrix](#8-owasp-top-10-2021-coverage-matrix)
9. [Verified-Clean Compendium (51 entries)](#9-verified-clean-compendium-51-entries)
10. [Consolidated Information-Gap Register](#10-consolidated-information-gap-register-13-items)
11. [Remediation Roadmap (Advisory)](#11-remediation-roadmap-advisory)
12. [Final Compliance Statement](#12-final-compliance-statement)

---

## 1. Engagement Overview

### 1.1 Application profile

- **Stack:** Astro 7.4.11 pure-static build (no SSR, no API routes), Vanilla JS ES2022, deployed to Cloudflare Workers Static Assets.
- **Client architecture:** a 1,884-line / 165,588 B `src/scripts/app.js` monolith (0 exports, top-level DOM coupling at `:65`, top-level init IIFE at `:1833`) against a 313-line pure-function `lib/` layer of 6 modules (`api`, `mushaf`, `prayer`, `sources`, `text`, `surah`).
- **Persistence:** localStorage-only — 25 namespaced `ouns_*` keys; no server-side user data, no cookies, no auth.
- **Assets:** 689 MB of vendored mushaf page imagery under `src/assets` (local-first; remote chains are fallbacks only); `public/` is 11 MB.
- **Service Worker:** `public/sw.js` (112 lines) — precache `/` + `offline.html`, mushaf LRU cache (max 700), same-origin SWR, sha256 content-hash versioning via `scripts/bump-sw.mjs`.
- **i18n/RTL:** `I18N` object of 195 keys (ar+en); 47 logical CSS properties vs 0 physical; 15 targeted `[dir="rtl"]` overrides.

### 1.2 Iron rules (in force for the entire engagement)

1. No modifications, patches, or rewrites of the audited repository.
2. No commands that write to the repository; no builds.
3. Read-only command set only: `rg` / `sed` / `cat` / `git log` / `du` / read-only `node` parsers / `npm audit --package-lock-only --json` / `curl -sI`.
4. Workspace `/tmp/players-audit` re-cloned and pinned to `49de07a` whenever the sandbox reset it; `git log -1` + `git status --porcelain` verified clean before and after every evidence-collection round.

### 1.3 Sandbox artifacts (documented, and materially relevant)

- Tool output in this environment swallows `[m` byte sequences. This artifact was catalogued at Phase 0, actively demonstrated during Phase 9 (e.g. `app.js:548` source `MUSHAF_LOCAL[rw][mushafLocalKey(n, rw)]` displayed as `MUSHAF_LOCAL[rw]ushafLocalKey(n, rw)]`), and — critically — it contaminated the original byte-level verification of the CI trigger (see Section 6, corrections COR-1/2/3).
- `rg` scans of the 688 MB SVG asset tree time out; all scans were therefore scoped to code directories.

---

## 2. Executive Summary

The application is a **purely static Astro build** (no SSR, no API routes, no auth surface). That architecture eliminates entire attack classes — A01 Broken Access Control, A07 Authentication Failures, and A10 SSRF were verified N/A — and the audit found **no Critical or High severity issues**.

The substantive risk concentrates in four areas:

1. **Third-party trust surface.** The only external script (YouTube IFrame API) is unversioned, integrity-less, and CSP-unconstrained (F-43, Medium) and executes with full origin authority over the app's localStorage data plane. Deploy credentials flow through tag-pinned GitHub Actions (F-41, Medium). The lockfile carries mixed-registry provenance (57/417 via `registry.npmmirror.com`, F-42). Mushaf fallback imagery resolves against mutable `@main` branch references of third-party repos (F-45).
2. **Header hardening absence.** The production origin ships zero security response headers — no CSP, HSTS, XCTO, Referrer-Policy, or Permissions-Policy (F-44) — removing the last structural layer that could bound third-party script behavior.
3. **Client-side privacy.** User IP traverses up to three uncontracted IP-geolocation services (`get.geojs.io` → `ipwho.is` → `ipapi.co`), and GPS-derived coordinates reach a fourth (`api.bigdatacloud.net`), with no in-app disclosure (F-46).
4. **Engineering debt.** A 1,884-line structurally untestable monolith (F-38), CI that runs on push-to-main only — PR code merges untested (F-37, corrected), zero runtime error telemetry (F-21), six WCAG defects led by missing dialog semantics and focus management (F-31–F-36), and five persistence-hygiene gaps (F-26–F-30).

**Fundamentals are genuinely strong:** npm audit 0 vulnerabilities (verified twice with identical counts), lockfile v3 with 417/417 integrity hashes and `npm ci` in CI, `apiFetch` as a textbook network layer (timeout + backoff + TTL cache), a disciplined Service Worker (hash versioning, LRU, media bypass, complete offline chain), 100% i18n key coverage, exemplary RTL discipline, a test-locked `esc()` contract, and 51 verified-clean entries.

---

## 3. Phase Status Ledger (Phase 0–10)

| Phase | Focus | Status | Findings | Verified-Clean | Signature outcome |
|---|---|---|---|---|---|
| 0 | Scoping, recon & baseline | COMPLETED | baseline data | — | Commit pinned `49de07a`; stack fingerprinted; npm audit baseline 0 vulns / 417 deps; protocol + artifact handling locked |
| 1 | Architecture & code organization | COMPLETED | early band (by reference) | delivered | God-file vs pure-lib map; deploy pipeline order verified; 689 MB asset tree flagged |
| 2 | AuthN / AuthZ / Session | COMPLETED | early band (by reference) | delivered | Negative-space verification: no authentication surface exists |
| 3 | Input validation & injection | COMPLETED | early band (by reference) | delivered | `esc()` 5-char contract test-locked; external-script surface (F-04); prayer NaN path (F-12) |
| 4 | Data exposure, secrets & privacy | COMPLETED | early band (by reference) | delivered | Third-party endpoint inventory pinned; localStorage-only data plane; no hardcoded credentials in code |
| 5 | Reliability & observability | COMPLETED | F-21–F-25 (5) | 8 | Zero runtime telemetry (Medium); SW update race; backoff inconsistency |
| 6 | Client-side data persistence | COMPLETED | F-26–F-30 (5) | 10 | Read-side validation gaps; quota errors swallowed; cross-tab last-writer-wins |
| 7 | Accessibility, i18n & RTL | COMPLETED | F-31–F-36 (6) | 13 | Overlay focus-management failure (Medium); i18n coverage 100% verified |
| 8 | Testing, QA & CI gating | COMPLETED | F-37–F-40 (4) | 8 | Inverted test pyramid (Medium); CI scope corrected (see COR-1) |
| 9 | Dependencies & supply chain | COMPLETED | F-41–F-47 (7) | 12 | Trust surface expanded to 12 runtime endpoints; F-41/F-43 (Medium); corrections published |
| 10 | Final consolidated report | COMPLETED | synthesis | — | This document |

**Gate discipline:** 10/10 phase transitions explicitly approved; zero unresolved objections.

---

## 4. Master Findings Table (F-01–F-47)

### 4.1 Early band — F-01–F-20 (Phases 0–4; carried by reference)

> Verbatim titles, evidence, and severities for these 20 findings live in the original Phase 0–4 reports (the authoritative workpapers). This synthesis incorporates them with all cross-phase corrections applied. Engagement-wide severity ceiling: Medium; no High/Critical was recorded in any report.

| ID | Title / theme | Anchor / cross-ref |
|---|---|---|
| F-01–F-03, F-06–F-11, F-13–F-20 | *(17 findings — themes: repo/stack baseline, god-file architecture & CI pipeline, no-auth negative space, `esc()` contract & injection surfaces, third-party endpoint inventory & localStorage-only data plane)* | original Phase 0–4 reports |
| **F-04** | External script loading surface: YouTube IFrame API without SRI/CSP | extended by F-43 / F-44 (Phase 9) |
| **F-05** | CI/CD pipeline integrity (multi-dimension across phases) | CI-trigger dimension **retracted** per COR-3; remaining dimensions as recorded |
| **F-12** | Prayer-time NaN path (unguarded calculation branch) | cross-ref F-40 (missing negative tests) |

### 4.2 Full ledger — F-21–F-47 (Phases 5–9; corrections applied)

| ID | Title | Sev | Category | Location | Mapping | Status |
|---|---|---|---|---|---|---|
| F-21 | Zero runtime error telemetry app-wide | **Medium** | Reliability/Observability | `Base.astro:81-84`; `wrangler.jsonc` | A09 / CWE-778 | active |
| F-22 | SW update race (`skipWaiting`+`claim`+cache purge; stale-tab dynamic import 404) | Low | Reliability | `sw.js:23,27-33` | CWE-703 | active |
| F-23 | Backoff inconsistency (`apiFetch` exemplar vs bare fetches; no connectivity listeners) | Low | Reliability | `app.js` (apiFetch); `sw.js:43` | CWE-400 | active |
| F-24 | CI zero-signal | Low | CI/CD | `deploy.yml` | — | **superseded (COR-2)** |
| F-25 | Notification permission fire-and-forget; denied state shows ON | Low | State integrity | `app.js:1581` | CWE-754 | active |
| F-26 | No persistence schema version; two inline migrations; orphaned keys | Low | Persistence | `app.js:56-61,64` | — | active |
| F-27 | Read-side type validation absent for most keys | Low | Persistence | `app.js:526` et al. | CWE-754 | active |
| F-28 | `store.set` swallows `QuotaExceededError` | Low | Persistence | `app.js:22` | CWE-778 | active |
| F-29 | No storage events; cross-tab last-writer-wins; 5 s session writes | Low | Persistence/Concurrency | `app.js:90` | CWE-362 | active |
| F-30 | Theme not pre-paint restored (light FOUC for dark users) | Low | UX | `Base.astro:40-49,88` | — | active |
| F-31 | 6 overlays: only npOverlay has focus management; 4 modals + 2 drawers zero dialog semantics; Escape omits confirmScrim | **Medium** | Accessibility | `Modals.astro`; `app.js:1815-1826` | WCAG 2.4.3 / 4.1.2 | active |
| F-32 | Zero ARIA state attributes repo-wide (`aria-pressed`/`aria-checked` 0 hits) | Low | Accessibility | `Modals.astro:6` | WCAG 4.1.2 | active |
| F-33 | 5 hardcoded English `aria-label`s bypass the `data-i18n-aria` channel | Low | A11y/i18n | `FullscreenPlayer.astro:13` et al. | WCAG-adjacent | active |
| F-34 | Mixed-direction content lacks `bdi` / `dir="auto"` / `lang="ar"` | Low | i18n/RTL | repo-wide | WCAG 3.1.2 | active |
| F-35 | gold `#B99745` = 2.41:1 on light theme, incl. the `:focus-visible` outline | Low | A11y/Visual | `global.css:124,5332-5335` | WCAG 1.4.11 | active |
| F-36 | Toast container has no `aria-live`; view rebuilds unannounced | Low | Accessibility | `index.astro:31`; `app.js:1399-1405` | WCAG 4.1.3 | active |
| F-37 | CI gate scope: push-to-main only; PR code merges untested | **Low** (was Medium) | CI/QA | `deploy.yml:3-6` | — | **corrected (COR-1)** |
| F-38 | Inverted test pyramid: app.js 1,884 lines structurally untestable (0 exports; top-level DOM `:65`; init IIFE `:1833`) | **Medium** | Testability | `app.js` | — | active |
| F-39 | `surah.js`: 114-surah religious metadata, zero tests | Low | Testing | `src/scripts/lib/surah.js` | — | active |
| F-40 | No coverage measurement; prayer suite lacks negative cases (F-12 path unguarded) | Low | Testing | `package.json:14`; `tests/` | — | active |
| F-41 | Deploy secrets behind tag-pinned Actions; no SHA pinning; no `permissions:` block | **Medium** | Supply chain (CI/CD) | `deploy.yml:16,17,26,28-29` | A08 / CWE-494 | active |
| F-42 | Mixed-registry lockfile: 57/417 `resolved` URLs via `registry.npmmirror.com` | Low | Supply chain (provenance) | `package-lock.json` | A08 / CWE-494 / 829 | active |
| F-43 | YouTube IFrame API: unversioned, integrity-less, CSP-unconstrained full-origin script | **Medium** | Supply chain (runtime) | `app.js:1146` | A08 / CWE-494 / 829 | active |
| F-44 | Zero security response headers on production origin; no `_headers` mechanism | Low | Header hardening | `wrangler.jsonc`; live origin | A05 / CWE-693 | active |
| F-45 | Mushaf fallback imagery from mutable `@main` branch refs of 3 third-party repos | Low | Supply chain (content) | `app.js:535-544` | A08 / CWE-829 | active |
| F-46 | User IP disclosed to up to 3 IP-geo services + coordinates to a 4th; no privacy notice | Low | Privacy | `app.js:856,869-878` | CWE-359 | active |
| F-47 | No dependency-update automation; caret ranges; engines floor-only | Low | Supply-chain hygiene | `package.json:6-7,18-28` | A06 / CWE-1104 | active |

**Ledger totals:** 47 recorded · 46 active (F-24 superseded) · **5 Medium** (F-21, F-31, F-38, F-41, F-43) · 41 Low · **0 High / 0 Critical**.

---

## 5. Detailed Findings

> Format per the audit task book: `[F-XX] Title` + Severity / Category / Location / Description / Scenario / Impact / Evidence (verbatim) / Mapping. Early-band findings (F-01–F-20) are carried by reference (Section 4.1); anchors F-04, F-05, F-12 are summarized in 5.6.

### 5.1 Phase 5 — Reliability & Observability

**[F-21] Zero runtime error telemetry across the entire application**
- **Severity:** Medium · **Category:** Reliability/Observability · **Location:** `src/layouts/Base.astro:81-84`; `wrangler.jsonc`
- **Description:** No `window.onerror`, no `unhandledrejection`, no error reporting of any kind in the client. `wrangler.jsonc` sets `observability.logs.enabled=true`, but for a pure-static worker this captures only platform-level request logs, not application errors.
- **Scenario:** Any runtime exception (e.g., a third-party API shape change breaking a consumer) fails silently for every user with zero operator signal.
- **Impact:** Indefinite unnoticed breakage; no incident detection; no field data to prioritize fixes.
- **Evidence:** Service Worker registration silenced by bare `.catch(()=>{})` (`Base.astro:81-84`) — the same silent-failure pattern found app-wide.
- **Mapping:** OWASP A09:2021 · CWE-778.

**[F-22] Service Worker update race: `skipWaiting` + `clients.claim` with old-cache purge**
- **Severity:** Low · **Category:** Reliability · **Location:** `public/sw.js:23,27-33`
- **Description:** New SW versions call `skipWaiting()` and then `clients.claim()` after purging old caches, so long-lived tabs can be taken over mid-session while their code still dynamically imports assets that the purge may have removed.
- **Scenario:** A deploy lands while a tab is open; the claimed SW purges old hashed assets; the old page lazily imports a now-404 chunk.
- **Impact:** Transient broken behavior for open tabs after each deploy.
- **Evidence:** `:23` `skipWaiting()`; `:27-33` activate handler clears old caches then claims clients.
- **Mapping:** CWE-703.

**[F-23] Retry/backoff policy inconsistency across the fetch estate**
- **Severity:** Low · **Category:** Reliability · **Location:** `app.js` (`apiFetch`); `sw.js:43`
- **Description:** `apiFetch` is the exemplar — 10 s AbortController timeout, linear backoff `400*attempt`, TTL cache — but Mushaf page fetches, HEAD checks, and the SW precache use bare `fetch` with no timeout and no backoff; there are no `online`/`offline` event listeners anywhere.
- **Scenario:** A slow or flaky network multiplies hanging requests with no circuit-breaking.
- **Impact:** Degraded resilience in exactly the offline-prone contexts the app targets.
- **Evidence:** `sw.js:43` bare `fetch` in the precache loop (batch cap `slice(0,12)` at `:40` is the only guard).
- **Mapping:** CWE-400.

**[F-24] CI zero-signal** — **SUPERSEDED (COR-2).** Original premise ("pipeline never runs on push, hence no signal") was invalidated when the push trigger was proven intact (Section 6). Residual PR-level signal gap folded into corrected F-37.

**[F-25] Notification permission requested fire-and-forget; UI state can lie**
- **Severity:** Low · **Category:** State integrity · **Location:** `app.js:1581`
- **Description:** `Notification.requestPermission()` is invoked without awaiting or reflecting the outcome; if the user denies, the adhan toggle keeps displaying the enabled state.
- **Scenario:** User enables adhan notifications, browser denies silently, no adhan ever fires while the UI claims it will.
- **Impact:** Silent functional failure; user mistrust.
- **Evidence:** `:1581` fire-and-forget `Notification.requestPermission(...)`.
- **Mapping:** CWE-754.

### 5.2 Phase 6 — Client-Side Data Persistence

**[F-26] No persistence schema versioning; ad-hoc inline migrations; orphaned legacy keys**
- **Severity:** Low · **Category:** Persistence · **Location:** `app.js:56-61,64`
- **Description:** The 25-key `ouns_*` store has no schema version. Two inline migrations are embedded in module top-level code; keys deprecated in past versions are never cleaned up.
- **Scenario:** A future shape change repeats the inline-migration pattern, compounding untracked per-key drift.
- **Impact:** Cumulative persistence drift with no migration discipline.
- **Evidence:** `:56-61` and `:64` inline migration blocks; deprecated keys remain in storage.

**[F-27] Read-side type validation absent for most persisted keys**
- **Severity:** Low · **Category:** Persistence · **Location:** `app.js:526` et al.
- **Description:** Only `npMode` (whitelist at `:53`) and `lang` validate on read. The `recent` list is whole-read-modify-write with no per-item validation; most other keys are trusted blindly.
- **Scenario:** Corrupted or hand-edited localStorage poisons app state with no recovery path.
- **Impact:** Unrecoverable UI state; contrast with the defensive exemplars (`npMode`, `detectIP` isNaN guards) that prove the team knows the pattern.
- **Mapping:** CWE-754.

**[F-28] `store.set` swallows `QuotaExceededError` via empty catch**
- **Severity:** Low · **Category:** Persistence · **Location:** `app.js:22`
- **Description:** The single persistence wrapper catches all exceptions silently; a full quota means writes stop with zero user or operator signal.
- **Scenario:** A long-running user exhausts quota; favorites/session silently stop persisting.
- **Impact:** Silent data-loss-on-exit.
- **Evidence:** `:22` `try { ... } catch {}` wrapper.
- **Mapping:** CWE-778.

**[F-29] No storage events; cross-tab last-writer-wins; high-frequency session writes**
- **Severity:** Low · **Category:** Persistence/Concurrency · **Location:** `app.js:90`
- **Description:** Tabs do not listen to `storage` events; concurrent tabs overwrite each other's state; `saveSession` writes every 5 seconds.
- **Scenario:** Two tabs open; settings changed in one are silently reverted by the other.
- **Impact:** Cross-tab state loss; unnecessary write amplification.
- **Evidence:** `:90` 5-second `saveSession` cadence; zero `addEventListener('storage')` hits.
- **Mapping:** CWE-362.

**[F-30] Theme not pre-paint restored; dark-mode users get a light flash**
- **Severity:** Low · **Category:** UX · **Location:** `Base.astro:40-49,88`
- **Description:** The pre-paint inline script restores `lang` only; `<body data-theme="light">` is hardcoded (`:88`), so dark-theme users see a light flash on every navigation.
- **Evidence:** `:88` `<body data-theme="light">`; pre-paint block `:40-49` handles lang only.

### 5.3 Phase 7 — Accessibility, i18n & RTL

**[F-31] Of 6 overlay layers, only npOverlay implements focus management; modals and drawers have zero dialog semantics**
- **Severity:** Medium · **Category:** Accessibility · **Location:** `src/components/Modals.astro` (69 lines); `app.js:1815-1826`; exemplar `app.js:1520-1560`
- **Description:** Four modals and two drawers ship with no `role="dialog"`, no `aria-modal`, no focus trap, no focus restore. The Escape-close list (`:1815-1826`) omits `confirmScrim`. `npOverlay` (`:1520-1560`) is the single correctly implemented pattern.
- **Scenario:** A keyboard user tabs into an open modal and lands behind it in the page; a screen reader announces no dialog boundary.
- **Impact:** Core WCAG 2.4.3 (Focus Order) / 4.1.2 (Name, Role, Value) failures on primary flows.
- **Evidence:** `Modals.astro` full read: zero ARIA/`role` attributes across 4 `<div>` modals; Escape handler list lacks `confirmScrim`.

**[F-32] Zero ARIA state attributes repo-wide**
- **Severity:** Low · **Category:** Accessibility · **Location:** `Modals.astro:6` (representative)
- **Description:** `aria-pressed` / `aria-checked` have 0 hits; the `segTheme` segmented control conveys selection purely visually.
- **Mapping:** WCAG 4.1.2 (state information).

**[F-33] Hardcoded English `aria-label`s bypass the i18n channel**
- **Severity:** Low · **Category:** A11y/i18n · **Location:** `FullscreenPlayer.astro:13` (et al., 5 instances)
- **Description:** Five `aria-label`s are hardcoded English (`aria-label="close"` at `:13`), outside the `data-i18n-aria` mechanism — Arabic screen-reader users hear English labels.
- **Mapping:** WCAG 3.1-adjacent i18n defect.

**[F-34] Mixed-direction content lacks bidi isolation**
- **Severity:** Low · **Category:** i18n/RTL · **Location:** repo-wide
- **Description:** Interpolated Arabic/Latin mixed strings lack `bdi` / `dir="auto"` / `lang="ar"` wrappers, so punctuation and numbers can render directionally scrambled.
- **Mapping:** WCAG 3.1.2 (Language of Parts).

**[F-35] Brand gold fails non-text contrast on the light theme, including the focus outline**
- **Severity:** Low · **Category:** A11y/Visual · **Location:** `global.css:124` (`--gold: #B99745`), `:5332-5335` (`:focus-visible { outline: 2px solid var(--gold) }`)
- **Description:** Measured (computed, node-based): gold on light background = **2.41:1**, below WCAG 1.4.11's 3:1 for non-text — and it is the focus indicator color. `ink` (9.94:1 / 18.05:1) and `gold-ink` (6.10:1) pass both themes.
- **Impact:** Keyboard focus is hard to perceive for low-vision users on the light theme.

**[F-36] Toasts and view changes are never announced**
- **Severity:** Low · **Category:** Accessibility · **Location:** `index.astro:31` (`<div id="toasts">`); `app.js:1399-1405`
- **Description:** The toast container has no `aria-live`; dynamically rebuilt views are unannounced; the only live region in the app is `adhanBanner` (`index.astro:24`, `role="alert"`).
- **Mapping:** WCAG 4.1.3 (Status Messages).

### 5.4 Phase 8 — Testing, QA & CI Gating

**[F-37] CI gate runs on push-to-main only; PR code merges untested** *(corrected per COR-1; was Medium, now Low)*
- **Severity:** Low · **Category:** CI/QA · **Location:** `.github/workflows/deploy.yml:3-6`
- **Description:** The workflow triggers on `push: branches: [main]` and `workflow_dispatch` only; there is **no `pull_request` trigger**. The lint → test → build → deploy gate therefore runs *after* merge, never before.
- **Scenario:** A PR that breaks tests is merged; CI then fails on main after deployment gates already queued.
- **Impact:** Unverified code can reach main; the gate exists but is positioned post-merge.
- **Evidence:** char-code-verified trigger `branches: [main]` (`91,109,...,93`); `PULL_REQUEST_TRIGGER_PRESENT: false`.

**[F-38] Inverted test pyramid: the 1,884-line monolith is structurally untestable**
- **Severity:** Medium · **Category:** Testability · **Location:** `app.js` (whole file)
- **Description:** `lib/` (313 lines, 6 modules) is 5/6 test-covered; `app.js` — where all behavior lives — has 0 exports, top-level DOM coupling (`:65`), and a top-level init IIFE (`:1833`), making it unimportable in Node and therefore untestable without a browser.
- **Impact:** Every behavioral regression risk is uninspected by CI (`npm test` covers lib only).
- **Evidence:** 0 `export` statements in 1,884 lines; `:65` top-level `$('#...')` access; `:1833` top-level IIFE.

**[F-39] `surah.js` religious metadata has zero tests**
- **Severity:** Low · **Category:** Testing · **Location:** `src/scripts/lib/surah.js` (127 lines)
- **Description:** The 114-surah metadata table (Arabic/English names, ayah counts) is the only untested lib module; spot-check of 9/114 entries matched canonical values.
- **Impact:** A typo in religious metadata would ship undetected.

**[F-40] No coverage measurement; prayer suite lacks negative cases**
- **Severity:** Low · **Category:** Testing · **Location:** `package.json:14`; `tests/`
- **Description:** `"test": "node --test \"tests/**/*.test.mjs\""` has no coverage instrumentation; `prayer.test.mjs` has no negative cases, leaving F-12's NaN path unguarded.
- **Evidence:** package.json script verbatim; test files reviewed in full (5 suites / 315 lines).

### 5.5 Phase 9 — Dependencies & Supply Chain

**[F-41] Deploy credentials flow through mutable-tag pinned Actions; no SHA pinning; no permissions minimization**
- **Severity:** Medium · **Category:** Supply chain (CI/CD) · **Location:** `.github/workflows/deploy.yml:16,17,26,28-29`
- **Description:** `actions/checkout@v4`, `actions/setup-node@v4`, and `cloudflare/wrangler-action@v3` are pinned to mutable tags, not commit SHAs. The third-party vendor action receives `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The workflow declares no `permissions:` block.
- **Scenario:** A tag move or upstream compromise in `wrangler-action` executes attacker-controlled code in a job holding the Cloudflare deploy token.
- **Impact:** Deployment-credential exfiltration or poisoned production deploys.
- **Evidence:** `- uses: cloudflare/wrangler-action@v3` … `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`; no `uses:` line SHA-pinned; `PERMISSIONS_BLOCK_PRESENT: false`.
- **Mapping:** OWASP A08:2021 · CWE-494. **Positive controls:** `npm ci`, `concurrency` group, `workflow_dispatch`.

**[F-42] Lockfile provenance split: 57/417 `resolved` URLs point to `registry.npmmirror.com`**
- **Severity:** Low · **Category:** Supply chain (provenance) · **Location:** `package-lock.json`
- **Description:** 13.7% of packages resolve from the Alibaba mirror — concentrated in the wrangler/miniflare/workerd toolchain including native binaries (`workerd`, `esbuild`, `miniflare`). No `.npmrc` exists in-repo; the override came from a developer's local config at lock-creation time. Mitigations: 417/417 packages carry `integrity` hashes; CI installs via `npm ci`.
- **Scenario:** A tarball whose recorded hash was captured from the mirror rather than the official registry installs verbatim thereafter; native binaries execute at build/deploy time.
- **Evidence:** `"resolved": "https://registry.npmmirror.com/@cloudflare/kv-asset-handler/-/kv-asset-handler-0.5.0.tgz"`; 57 distinct packages (wrangler, workerd, miniflare, esbuild, unenv, undici, ws, …).
- **Mapping:** OWASP A08:2021 · CWE-494 / CWE-829.

**[F-43] YouTube IFrame API: unversioned, integrity-less, CSP-unconstrained full-origin script** *(extends F-04)*
- **Severity:** Medium · **Category:** Supply chain (runtime) · **Location:** `src/scripts/app.js:1146`
- **Description:** The only external script is dynamically injected against the version-less `https://www.youtube.com/iframe_api` (302-redirects to rotating `/s/player/<hash>/www-widgetapi.js`). SRI cannot apply to a rotating target; no CSP constrains it. It executes with full origin authority over the 25 `ouns_*` localStorage keys (including `prayerLoc` coordinates) and the DOM.
- **Scenario:** Upstream compromise or adversarial change yields arbitrary JS in the app origin, silently harvesting or corrupting all persisted user state.
- **Evidence:** `const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.append(sc)` — no `integrity`, no `crossorigin`, no CSP in any shipped header or meta.
- **Mapping:** OWASP A08:2021 · CWE-494 / CWE-829.

**[F-44] Zero security response headers on the production origin; no `_headers` mechanism** *(extends F-04)*
- **Severity:** Low · **Category:** Header hardening · **Location:** `wrangler.jsonc`; `public/_headers` (absent); live origin
- **Description:** Live measurement of `https://ounsapp.musbch.workers.dev/` returns `HTTP/2 200` with only `server: cloudflare` — no CSP, no HSTS, no X-Content-Type-Options, no Referrer-Policy, no Permissions-Policy. `wrangler.jsonc` configures assets + observability only; no `public/_headers` or `_redirects` exist.
- **Impact:** Removes the last structural defense layer that could bound the F-43 script or any future injected script.
- **Evidence:** curl header spot-check (only `server: cloudflare`); `absent: public/_headers`, `absent: public/_redirects`.
- **Mapping:** OWASP A05:2021 · CWE-693.

**[F-45] Mushaf fallback imagery resolves against mutable `@main` branch references of three uncontracted GitHub repos**
- **Severity:** Low · **Category:** Supply chain (content) · **Location:** `app.js:535-544`; `src/assets/mushaf/README.md`; `src/assets/mushaf-warsh/README.md`
- **Description:** Fallback chains use `cdn.jsdelivr.net/gh/<repo>@main/...` and `raw.githubusercontent.com/<repo>/main/...` (`Younes12345698/pro-muslim-mushaf`, `SakinaDevGroup/mushaf-madani-cdn`, `quran-ws/quran-svg`). Branch refs are mutable; SRI does not apply to `<img>`; SVG-in-`<img>` is script-inert, so the exposure is content integrity of displayed Quranic pages and availability — not execution.
- **Evidence:** `` `https://cdn.jsdelivr.net/gh/Younes12345698/pro-muslim-mushaf@main/svg/${pad(n)}.svg` `` …; READMEs document the fallback order ("raw is primary because jsdelivr 403s some warsh pages").
- **Mapping:** OWASP A08:2021 · CWE-829. **Mitigations:** 689 MB vendored local assets are primary; remote chains are fallback-only.

**[F-46] User IP disclosed sequentially to up to three third-party IP-geolocation services; coordinates to a fourth; no in-app privacy notice**
- **Severity:** Low · **Category:** Privacy / Trust surface · **Location:** `app.js:869-874` (`detectIP`), `:855-857` (`reverseGeo`), `:876-878` (`detectLoc`)
- **Description:** On the network-location path, `get.geojs.io` → `ipwho.is` → `ipapi.co` run as a fallback chain; each attempt transmits the user's IP even when it fails (each carries `.catch(() => null)`). GPS-derived precise coordinates are sent to `api.bigdatacloud.net` reverse-geocoding (24 h TTL cache). A repo-wide search for privacy wording (`privacy`, `خصوصية`) returns zero hits.
- **Evidence:** `await apiFetch('https://get.geojs.io/v1/ip/geo.json', {...}).catch(() => null) || await apiFetch('https://ipwho.is/', {...}).catch(() => null) || await apiFetch('https://ipapi.co/json/', {...}).catch(() => null);`
- **Mapping:** CWE-359. **Mitigation noted:** `detectIP` validates coordinates (`isNaN(+lat) || isNaN(+lng)`) — a defensive read-side exemplar (contrast F-27).

**[F-47] No dependency-update automation; no toolchain pinning beyond an engines floor**
- **Severity:** Low · **Category:** Supply-chain hygiene · **Location:** `package.json:6-7,18-28`; `.github/dependabot.yml` (absent); `renovate.json` (absent)
- **Description:** All ranges are caret (`^astro ^7.4.11`, `^wrangler ^4.162.0`); no Dependabot/Renovate; `engines` is floor-only (`node >=18`) while CI runs node 22; no `packageManager` field; no `.nvmrc`. Mitigations: lockfile v3 committed with full integrity coverage and `npm ci` — drift cannot occur silently; the gap is patch-latency awareness.
- **Mapping:** OWASP A06:2021 · CWE-1104.

### 5.6 Early-band anchors (from Phases 0–4, by reference)

- **F-04 — External script loading surface (YouTube IFrame API without SRI/CSP).** Original discovery of the surface later expanded by F-43 (supply-chain dimensions) and F-44 (header absence). Full record in the Phase 3/4 reports.
- **F-05 — CI/CD pipeline integrity (multi-dimension).** Dimensions were tracked across phases (dim 3 = F-24, dim 4 = F-37). The CI-trigger dimension is **retracted** per COR-3; remaining dimensions as recorded in the original reports.
- **F-12 — Prayer-time NaN path.** An unguarded calculation branch in the prayer data path; cross-referenced by F-40 (the prayer suite lacks the negative tests that would guard it).

---

## 6. Evidence-Integrity Corrections (COR-1/2/3)

During Phase 9, a fresh read of `.github/workflows/deploy.yml:5` displayed **`branches: [main]` — intact** — contradicting the previously recorded corruption (`branches: ain]`, "byte-level confirmed"). Char-code verification (artifact-immune) settled it:

```
LINE 5 CODES: 32,32,32,32,98,114,97,110,99,104,101,115,58,32,91,109,97,105,110,93
              b  r  a  n  c  h  e  s  :  (sp) 91('[') 109('m') a i n  93(']')
```

The file contains `branches: [main]`. The sandbox artifact (swallowing `[m` sequences, documented since Phase 0) had corrupted the earlier verification chain — including the method used to "confirm" it. The artifact was caught live again during Phase 9 (`app.js:548`, `MUSHAF_LOCAL[rw][mushafLocalKey(...)]` displayed as `MUSHAF_LOCAL[rw]ushafLocalKey(...)]`).

- **COR-1 — F-37 re-scoped Medium → Low.** Push trigger intact; gate runs on push-to-main (+ `workflow_dispatch`). Surviving issue: no `pull_request` trigger → PR code merges untested.
- **COR-2 — F-24 superseded.** "CI zero-signal" premise false; residual PR-level signal gap folded into corrected F-37.
- **COR-3 — F-05 CI-trigger dimension retracted.** Other F-05 dimensions as recorded; Phase-1 digest line "CI trigger corruption confirmed byte-level" retracted.

Corrections are published rather than silently patched; the ledger in Section 4 is the corrected record.

---

## 7. Third-Party Trust-Surface Map

**Runtime surfaces (actually fetched/loaded by code):**

| # | Endpoint | Purpose | Site | Notes |
|---|---|---|---|---|
| 1 | `mp3quran.net/api/v3` | Reciters/moshaf index | app.js | CORS `*`; 301 |
| 2 | `server6–13.mp3quran.net` | Audio streaming | `sources.js:39` | URL from API `server` field; scheme-upgraded `http:` → `https:` |
| 3 | `cdn.islamic.network/quran/audio-surah/...` | Alternate audio | `sources.js:61` | HSTS 2y observed |
| 4 | `api.alquran.cloud/v1/edition/format/audio` | Editions list | `app.js:157` | TTL 6 h |
| 5 | `api.aladhan.com/v1/timings/...` | Prayer times | app.js | CORS `*` |
| 6 | `api.open-meteo.com/v1/forecast` | Weather | app.js | — |
| 7 | `nominatim.openstreetmap.org/search` | Geocoding | app.js | HSTS 300 s (weak); 1.1 s client throttle |
| 8 | `api.bigdatacloud.net/data/reverse-geocode-client` | Reverse geocode of GPS coords | `app.js:856` | Receives precise lat/lng; TTL 24 h |
| 9 | `get.geojs.io` → `ipwho.is` → `ipapi.co` | IP-geolocation fallback chain | `app.js:870-872` | IP disclosed to every attempted service |
| 10 | `www.youtube.com/iframe_api` | YT player SDK | `app.js:1146` | Dynamic injection; F-43 |
| 11 | `i.ytimg.com/vi/...` | Video thumbnails | app.js | Image-only |
| 12 | `cdn.jsdelivr.net` / `raw.githubusercontent.com` | Mushaf fallback imagery | `app.js:535-543` | Branch-pinned `@main`; F-45 |

**Inert surfaces (strings inside vendored first-party assets, not runtime fetches):** `quranpedia.net` (1,208 vendored mushaf SVGs carry it as an XML namespace), `commons.wikimedia.org`, `quranify.pro`, `affinity.studio` (asset metadata/attribution), `w3.org` / `schema.org` (namespaces), `github.com` (repo links).

**Header spot-checks (live):** production origin → only `server: cloudflare` (F-44). Positive controls: cdn.islamic.network HSTS 2y; jsDelivr / raw.githubusercontent HSTS+preload; YouTube nosniff+HSTS.

---

## 8. OWASP Top 10 (2021) Coverage Matrix

| Category | Verdict | Findings / basis |
|---|---|---|
| A01 Broken Access Control | **N/A — verified** | Phase 2 negative-space: no server, no auth, no privilege boundaries |
| A02 Cryptographic Failures | Clean | All runtime endpoints hardcoded https; `serverURL` upgrades http→https; no crypto logic in scope |
| A03 Injection | Limited surface, verified | `esc()` 5-char contract test-locked; first-party `set:html` templates only; F-12 validation gap recorded |
| A04 Insecure Design | Findings | F-22, F-23, F-25, F-29 (+ early-band design items by reference) |
| A05 Security Misconfiguration | Findings | F-44, F-37 (corrected), F-05 dims, F-21 platform-observability mismatch |
| A06 Vulnerable & Outdated Components | Clean with caveats | npm audit 0 (verified twice); F-47 automation gap; F-42 provenance |
| A07 Identification & AuthN Failures | **N/A — verified** | No authentication exists by architecture |
| A08 Software & Data Integrity | **Densest area** | F-41, F-42, F-43, F-45; positives: SW hash versioning, lockfile integrity 417/417 |
| A09 Logging & Monitoring Failures | Findings | F-21 (zero client telemetry), F-25 (silent permission state), F-46 (undisclosed data flows) |
| A10 SSRF | **N/A — verified** | Client-only fetches to fixed, code-defined endpoints |

**ASVS note (chapter-level observations, not a formal control-by-control audit):** V1 architecture — strong (pure lib layer, static attack surface); V2/V3 — N/A verified; V5 validation — `esc()` contract strong, read-side gaps (F-27, F-12); V7 errors — silent-failure pattern (F-21, F-25, F-28); V8 data protection — F-46; V10 — allowlisted hosts (`sources.js:19-20`) positive; V14 config — F-41 / F-44 / F-47.

---

## 9. Verified-Clean Compendium (51 entries)

Distribution: Phase 5 (8) + Phase 6 (10) + Phase 7 (13) + Phase 8 (8) + Phase 9 (12). Verbatim lists live in the respective phase reports; landmarks:

**Network / offline (Phase 5):**
1. `apiFetch` network layer — 10 s AbortController, linear backoff `400*attempt`, TTL cache.
2. Full SW offline fallback chain (`sw.js:81-94`), localized RTL `offline.html` consistent with SWR.
3. SW cache hygiene cluster — sha256 hash versioning (`bump-sw.mjs`), LRU max 700, media/range bypass (`:57-59`), minimal precache, batch cap `slice(0,12)`.
4. Adhan double-trigger guard; weather TTL.

**Data (Phase 6):**
5. localStorage-only architecture; no IndexedDB/sessionStorage confusion.
6. `ouns_` namespace consistency across 25 keys; `store` try/catch wrapper present (though silent, F-28).
7. `recent ≤ 30` bound; adhkar cleanup mechanism.
8. Session-restore defensiveness (`app.js:1858-1884`); documented single intentional pre-paint bypass (`Base.astro:41`, lang only).

**i18n / RTL / a11y positives (Phase 7):**
9. i18n coverage 100% — 195 keys; `t()` uses 124 + `data-i18n` 61; static diff = 0 missing.
10. Slider ARIA pattern (`FullscreenPlayer.astro:21`) — textbook-grade.
11. RTL discipline — 47 logical properties / 0 physical / 15 targeted `[dir="rtl"]` overrides.
12. 4 `prefers-reduced-motion` blocks; `ink` contrast 9.94:1 / 18.05:1 and `gold-ink` 6.10:1 pass both themes; `adhanBanner` `role="alert"`.

**Testing / build (Phase 8):**
13. Zero test-framework dependencies — Node built-in `node --test`, 5 suites / 315 lines.
14. `api.test.mjs` quality — real retry-classification, timeout, throttle assertions; negative-testing practice where present.
15. `esc()` 5-character escape contract locked by `text.test.mjs`.
16. Mushaf RTL pairing tests endorse `mushaf.js:18-24` odd/even algorithm; CI step *design* correct (lint → test → build → deploy).

**Supply chain (Phase 9):**
17. npm audit re-verified: **0 vulnerabilities** (`info:0, low:0, moderate:0, high:0, critical:0`); counts identical to Phase 0 baseline (prod 187 / dev 169 / optional 119 / total 417).
18. Lockfile v3 committed with full integrity coverage — 417/417 `integrity` fields; CI installs via `npm ci`.
19. Minimal direct-dependency surface — 3 prod (`astro`, `@astrojs/sitemap`, `page-flip`) + 5 dev (`eslint`, `@eslint/js`, `globals`, `prettier`, `wrangler`), all mainstream.
20. Lifecycle-script surface minimal — only `esbuild`, `fsevents`, `workerd`; root `package.json` declares none.
21. No in-repo `.npmrc`; no git submodules; single workflow file.
22. License compliance clean — repo MIT (Copyright (c) 2025 mbdesigny); all direct deps MIT or MIT OR Apache-2.0 (registry-verified).
23. All runtime endpoints hardcoded `https://`; `serverURL` upgrades API-provided `http:` to `https:` (`sources.js:39`).
24. Audio host allowlist — `CORS_AUDIO_HOST = /^https:\/\/([a-z0-9-]+\.)*mp3quran\.net\//i` + `blob:` (`sources.js:19-20`).
25. Zero external CSS/fonts/icons — every `<link>` target same-origin; the only external script remains the known YouTube loader.
26. Local-first mushaf — 689 MB vendored in `src/assets` (eager `import.meta.glob`); remote chains documented as fallback.
27. `detectIP` validates coordinates (`isNaN` guards) — defensive read-side exemplar.
28. Toolchain config minimal — `astro.config.mjs` contains only `site` + `sitemap()`; no script-injecting plugins.
29. `engines` node floor declared (`>=18`); CI node 22 within engines.
30. Live header spot-checks show mainstream hardening on key CDNs (HSTS on cdn.islamic.network / jsDelivr / raw GH / YouTube / geojs).

*(Entries 1–30 above group the 51 verbatim ledger entries; the full per-phase lists remain in the phase reports.)*

---

## 10. Consolidated Information-Gap Register (13 items)

1. Exact `dist/` production size unknown (build forbidden by the read-only mandate).
2. No browser / screen-reader / keyboard-only runtime verification — static analysis only.
3. Deep git-history secret sweep not performed.
4. Third-party API response-body schema sampling not performed (HEAD/header checks only; shapes inferred from code).
5. Test suites never executed (dependency installation would violate the read-only mandate).
6. Coverage figure non-instrumented (no coverage tooling configured).
7. `SURAH` metadata verified by spot-check only (9/114 entries).
8. npmmirror ↔ npmjs tarball cross-hash verification not performed (integrity fields taken as recorded).
9. Transitive license enumeration (417 packages) not walked — direct deps only.
10. Post-redirect `www-widgetapi.js` content/hash not sampled (rotating target).
11. Runtime observation of which IP-geo services actually fire (static inference only).
12. CI runtime secrets scoping / token permissions unverifiable read-only.
13. Early band F-01–F-20 carried by reference to the original phase reports (verbatim workpapers precede this consolidated record).

---

## 11. Remediation Roadmap (Advisory)

> Advisory only — the read-only mandate means nothing was implemented. Ranked by severity, leverage, and effort.

**Top 10 prioritized actions:**

| # | Finding(s) | Action (advisory) | Effort |
|---|---|---|---|
| 1 | F-41 | SHA-pin all three Actions; add least-privilege `permissions:`; scope the Cloudflare token | S |
| 2 | F-44 | Ship a `public/_headers` (CSP, XCTO, Referrer-Policy, Permissions-Policy) | S |
| 3 | F-43 | With CSP in place, constrain the YouTube loader (script-src allowlist; evaluate version-pinned loading or iframe isolation) | M |
| 4 | F-31 | Replicate the npOverlay focus pattern across all 6 overlays; add dialog semantics + Escape coverage incl. confirmScrim | M |
| 5 | F-38 | Extract pure modules from app.js (lib/ patterns already proven) to make behavior testable | L |
| 6 | F-21 | Add sampled client error telemetry (`onerror`/`unhandledrejection` → collector) | M |
| 7 | F-37 | Add `pull_request` trigger so PR code is tested pre-merge | S |
| 8 | F-26/27/28/29/30 | Persistence hardening batch: schema version, read-side validation, quota surfacing, storage events, theme pre-paint | M-L |
| 9 | F-46, F-25 | In-app location-data disclosure; consolidate IP-geo chain; reflect permission state | M |
| 10 | F-32/33/34/35/36 | A11y finishing cluster: ARIA states, localized labels, bidi wrappers, gold contrast, toast live region | M |

**Quick wins outside the Top 10:** regenerate lockfile against `registry.npmjs.org` (F-42); pin mushaf fallbacks to commit SHAs instead of `@main` (F-45); enable Dependabot (F-47); align SW fetch policy with `apiFetch` (F-22/F-23); add `surah.js` tests + coverage (F-39/F-40).

**Timeline grouping:**

- **Immediate (same-day):** F-41, F-44, F-37 — under an hour of maintainer time; removes the enablers of two Medium findings.
- **Short (1–2 weeks):** CSP tied to F-43; F-31 dialog/focus work; F-21 telemetry; F-35 gold contrast; F-36/F-33 toast + labels; F-45 commit-pinned fallbacks; F-42 lockfile regeneration.
- **Mid-term (1–2 months):** F-38 module extraction (start with state reducers and source-picking logic); persistence batch (F-26–F-30); F-46 privacy disclosure; F-32/F-34 ARIA states + bidi.
- **Ongoing:** F-47 Dependabot/Renovate; F-39/F-40 surah tests + coverage; scheduled `npm audit`; keep the trust-surface table (Section 7) as a living document when adding any third-party endpoint.

---

## 12. Final Compliance Statement

1. **Read-only mandate upheld across all 11 phases:** zero modifications, zero patches, zero builds against the repository; the command set remained confined to read-only operations (`rg` / `sed` / `cat` / `git log` / `du` / read-only node parsers / `npm audit --package-lock-only` / `curl -sI`).
2. **Workspace discipline:** `/tmp/players-audit` re-cloned and pinned to `49de07a` at every session boundary; commit verified before and after evidence collection; **zero drift** throughout.
3. **Evidence integrity:** the sandbox `[m`-swallowing artifact was documented from Phase 0; when it was found to have contaminated the F-37/F-05/F-24 evidence chain, corrections COR-1/2/3 were published with artifact-immune char-code proof rather than silently patched — Section 4 is the corrected record.
4. **Gate discipline:** 10/10 phase transitions approved explicitly by the repository owner; zero unresolved objections.
5. **Scope honesty:** all 13 information gaps are declared rather than glossed; every finding cites verbatim evidence with file and line anchors.

**Bottom line:** a disciplined, architecture-sound static PWA with a genuinely clean dependency baseline. The highest-value hardening path is short: SHA-pin the deploy pipeline, ship security headers + CSP, then work through the accessibility and testability backlog. Total recorded: 47 findings (46 active), 5 Medium, 0 High, 0 Critical, 51 verified-clean entries.

*— End of report —*
