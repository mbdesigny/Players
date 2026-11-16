# Ouns / Players — Remediation Verification Report

| Field | Value |
|---|---|
| **Scope** | Independent verification of the merged remediation (commits `8a534a0`–`9f91b73`, PR #50 + dependabot series) against the 11-phase audit ledger at commit `49de07a` |
| **Verification base** | `main` @ `9f91b73e4b3f408d3d913c9047d500e82c4bd8f6` |
| **Gap-fix branch** | `audit-gap-fixes` (4 commits on top of `9f91b73`, see `gap-fixes/`) |
| **Verification date** | 2026-11-16 |
| **Method** | Read-only re-inspection of the working tree + empirical runs: `npm ci`, `npm run lint`, `npm test` (52/52 pass), `npm run build`, `wrangler dev` header capture, `git ls-remote` SHA checks, CDN URL reachability checks, byte-level CSP hash verification |

---

## 1. Verification matrix (every finding that required a change)

| Finding | Severity | Upstream status at `9f91b73` | Evidence | Gap fix |
|---|---|---|---|---|
| **F-41** CI Actions not SHA-pinned, no permissions block | Medium | **Fixed** | `deploy.yml` pins `checkout@3d3c42e5…` (v7.0.1), `setup-node@949feb24…` (v7.1.0), `wrangler-action@953926a2…` (v4.1.3); all four SHAs confirmed real via `git ls-remote` (wrangler pin matches the peeled commit, not the tag object); `permissions: contents: read` present | — |
| **F-37** CI has no PR gate | Low | **Fixed** | `pull_request` trigger + deploy job gated `if: github.event_name == 'push' \|\| 'workflow_dispatch'`; validate job runs lint/test/build on PRs | `cancel-in-progress: false` (deploy safety) |
| **F-44** Zero security response headers | Low | **Fixed** | `public/_headers` with CSP/HSTS/XCTO/Referrer-Policy/Permissions-Policy/XFO; Astro copies it to `dist/_headers`; **verified live via `wrangler dev`** (same asset-serving path as production) | + `frame-ancestors 'self'`, `form-action 'none'` |
| **F-43** YouTube script unconstrained (M) | Medium | **Fixed** | CSP `script-src` allowlists `www.youtube.com` + `s.ytimg.com` (the latter required — `iframe_api` redirects there); lazy-load confirmed: `loadYtApi()` only fires from `mountYtPlayer()` in the YT view; SRI not feasible on the rotating loader (documented in plan 2.1) | **`unsafe-inline` removed** via build-time sha256 hashes of all inline scripts (`scripts/csp-hashes.mjs`) |
| **F-21** No client error telemetry (M) | Medium | **Fixed** | `lib/telemetry.js`: local ring buffer (10 entries), `window.onerror` + `unhandledrejection`, no network exfiltration (privacy-safe); wired via `initTelemetry()`; tested | — |
| **F-31** Focus management (M) | Medium | **Partial** | All 4 modals have `role="dialog"`, `aria-modal`, `aria-labelledby`; focus save/restore (`scrimPrevFocus`, `ovPrevFocus`); Escape closes topmost overlay including `confirmScrim`. **Tab trap was missing** (no Tab handling anywhere) | **Closed**: shared Tab/Shift+Tab trap over all overlays via new pure `lib/focus.js` + wiring in `app.js` keydown |
| **F-38** app.js module extraction (M, effort L) | Medium | **Partial (by design)** | 8 pure lib modules now exist (text, surah, mushaf, sources, prayer, api, telemetry, + new focus). app.js remains the DOM-coupled controller (~2,037 lines) | Deferred per plan Wave 3 (strangler pattern, one module per PR) |
| **F-45** Mushaf fallbacks pinned to mutable `@main` | Low | **Fixed** | All fallbacks pinned to full commit SHAs (`pro-muslim-mushaf@09c92b7…`, `mushaf-madani-cdn@7679356…`, `quran-svg@b4155f0…`); all 4 CDN URLs return HTTP 200 | — |
| **F-42** Lockfile resolved to npmmirror | Low | **Fixed** | `package-lock.json`: 0 `registry.npmmirror.com`, 418 `registry.npmjs.org`; `npm ci` clean | — |
| **F-47** No dependency automation / toolchain pinning | Low | **Partial** | `.github/dependabot.yml` (npm + github-actions, weekly) | **Completed**: `.nvmrc` (22), `node-version-file` in CI, `engines >=22`, `packageManager npm@10.9.0` (inert unless corepack enabled) |
| **F-26** Persistence schema versioning | Low | **Fixed** | `runMigrations()` IIFE (app.js:74-86): `schema_version` key, migrates `mushafLast` → `mushafLast_hafs`, removes orphan | Cosmetic: `CURRENT_SCHEMA` const unused (hardcoded `1` in migration) |
| **F-27** Per-key read validators | Low | **Fixed** | `STORE_SCHEMAS` map applied in `store.get` (18 keys validated: lang, theme, quality, speed, volume, mushafRiwaya/Page, npMode, sideMode, repeat, shuffle, adhanOn/Mode, notifyOn, favorites (cap 500), recent (cap 30), prayerLoc, prayerOffset) | — |
| **F-28** Quota handling | Low | **Fixed** | `store.set` catches `QuotaExceededError`/code 22 → i18n toast | — |
| **F-29** Cross-tab sync | Low | **Fixed** | `storage` listener syncs theme, lang, favorites, recent, quality, mushafRiwaya | — |
| **F-30** Theme pre-paint | Low | **Fixed** | `Base.astro` inline pre-paint script (lang + theme + meta theme-color before first paint) | — |
| **F-32** Missing ARIA states | Low | **Fixed** | `aria-pressed` on every segment button (theme/lang/riwaya/adhan/quality/notify), updated in the same handlers that flip visual state | — |
| **F-33** Hardcoded aria-labels | Low | **Fixed** | `data-i18n-aria` attributes throughout; applied in `applyI18nStatic()` | — |
| **F-35** Focus ring contrast | Low | **Fixed** | Light theme: `--focus-ring: var(--gold-ink)` = `#6F5521` (dark gold); dark theme: `--gold` `#D4B36A` | — |
| **F-36** No live region | Low | **Fixed** | `#toasts` has `role="status" aria-live="polite" aria-atomic="true"` | — |
| **F-25** Notification permission state | Low | **Fixed** | `requestPermission()` result written into state + UI; `notifyDenied` i18n toast | — |
| **F-22** SW lifecycle (404s on deploy) | Low | **Partial** | Per-build cache versioning (`bump-sw.mjs`), network-first navigation, old-cache purge on activate. **`skipWaiting` + `clients.claim()` still claimed mid-session** | **Closed**: both removed — updates apply only after all tabs close; open tabs keep a consistent HTML/asset set |
| **F-23** Fetch resilience | Low | **Fixed** | Mushaf precache uses AbortController (8 s timeout); `online`/`offline` listeners with toasts | — |
| **F-12** Prayer times emit `NaN:NaN` | Low | **Not fixed** | `lib/prayer.js` had no guards; `countdownStr` produced `NaN:NaN:NaN` on malformed timings; `prayerTimeStr` threw on non-string input | **Closed**: ISO validation, invalid entries skipped, safe `--:--` / `--:--:--` placeholders, 5 negative-path tests |
| **F-04** (CSP absent) | — | **Closed** | Via F-44 + F-43 | hash hardening |
| **F-05** residual dimensions | — | **Closed** | Via CI hardening | — |
| **F-24** | — | **Superseded** (audit COR-2) | No action required | — |

---

## 2. Empirical verification runs

| Check | Result |
|---|---|
| `git ls-remote` — 4 Action SHAs | All match upstream tags (commit objects verified) |
| CDN HEAD requests — 4 pinned mushaf URLs | HTTP 200 |
| `npm ci` (full lockfile install) | Clean, no vulnerabilities surfaced |
| `npm run lint` | Pass |
| `npm test` | **52/52 pass** (41 pre-existing + 11 new in gap fixes) |
| `npm run build` | Pass; SW version bumped; `csp-hashes` injected 3 hashes across 2 built pages |
| Byte-level CSP check | 0 missing hashes, 0 placeholder leftovers, **`unsafe-inline` absent from `script-src`** |
| `wrangler dev` header capture (`127.0.0.1:8787`) | CSP (with hashes), HSTS, XCTO, Referrer-Policy, Permissions-Policy, XFO, frame-ancestors, form-action all served |
| `deploy.yml` YAML parse | OK (Python yaml + js-yaml) |
| Inline event handlers (`on*=`) in markup | None found — hash-based CSP is safe |

---

## 3. Accepted residuals (documented, no action required)

1. **`style-src 'unsafe-inline'`** — required: the app uses inline `style=""` attributes and JS-generated style attributes throughout. Standard trade-off; does not allow script execution.
2. **F-38 module extraction** — remains a Wave 3 roadmap item (strangler pattern, one module + tests per PR).
3. **F-46 partial** — in-app privacy disclosure shipped (ar+en, `locPrivacy`); the IP-geo chain still tries 3 services (plan 3.3 suggested trimming to 2 — product decision left to the owner).
4. **`packageManager` field** — inert unless corepack is enabled; documents intent.
5. **PR-gate behavior** — verified by workflow inspection and YAML parse; a live draft-PR run is the final acceptance step (per plan 1.1).

## 4. Deployment path

The gap fixes live on branch `audit-gap-fixes` (4 commits on `9f91b73`). Apply via `gap-fixes/ouns-gap-fixes-9f91b73.patch` or push the branch and merge. The existing deploy workflow runs on push to `main` and ships to `ounsapp.musbch.workers.dev`; after deploying, confirm with:

```
curl -sI https://ounsapp.musbch.workers.dev/ | grep -i content-security-policy
```

The CSP must contain the three `sha256-…` hashes and no `'unsafe-inline'` in `script-src`.
