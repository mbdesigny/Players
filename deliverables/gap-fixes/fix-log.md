# Gap Fixes — Fix Log

Branch: `audit-gap-fixes` (4 commits on top of `9f91b73e4b3f408d3d913c9047d500e82c4bd8f6`)
Patch: `ouns-gap-fixes-9f91b73.patch` (apply with `git apply` or `git am`)
Full copies of every changed file: `files/` (repo-relative paths)

## Commits

| SHA | Finding(s) | Change |
|---|---|---|
| `56881f1` | **F-31** (completion) | Tab/Shift+Tab focus trap across all overlays. New pure module `src/scripts/lib/focus.js` (`nextFocusable`) + 6 unit tests; DOM wiring in `app.js` keydown handler (runs before the INPUT guard so traps work inside modal inputs). Trap roots: `#confirmScrim`, `#qualityScrim`, `#prayerScrim`, `#settingsScrim`, `#dlDrawer`, `#npOverlay`, `#sidebar` (gated on `#scrimSide.open` so the always-present desktop sidebar is never trapped). Visibility filter uses `getClientRects().length > 0` (correct for `position:fixed` overlays, unlike `offsetParent`). |
| `2cce99d` | **F-12** | `lib/prayer.js` hardened: ISO-shaped strings validated, invalid timings skipped by `nextPrayerTime`, `null` returned when no valid target exists, `countdownStr`/`prayerTimeStr` degrade to `--:--:--` / `--:--` instead of `NaN:NaN:NaN` or TypeError. 5 negative-path tests added. All pre-existing prayer tests still pass unchanged. |
| `9693eb1` | **F-43 hardening, F-22, F-44 additions** | (1) New build step `scripts/csp-hashes.mjs`: computes sha256 of every *executing* inline `<script>` in `dist/*.html`, injects into `dist/_headers` placeholder — removes `script-src 'unsafe-inline'`; hashes recomputed each build (self-healing); data blocks (`ld+json`, `text/svg-template`, `importmap`) correctly exempt. (2) `_headers`: + `frame-ancestors 'self'`, `form-action 'none'`. (3) `public/sw.js`: removed `skipWaiting` + `clients.claim()` — updates apply only after all tabs close (prevents old-tab 404s on rotated hashed assets). (4) `Base.astro`: SW registration failures logged instead of swallowed. (5) `package.json` build chain: `astro build → csp-hashes → bump-sw`. |
| `31aade4` | **F-37 polish, F-47 completion** | `deploy.yml`: `cancel-in-progress: false` (never abort an in-flight production deploy; PR refs keep their own concurrency group), deploy job unified on `setup-node v7.1.0` (was mixed v7/v4.4), `node-version-file: .nvmrc` in both jobs. New `.nvmrc` (22). `package.json`: `engines >=22`, `packageManager npm@10.9.0`. |

## Verification (all green)

```
node --check public/sw.js scripts/csp-hashes.mjs scripts/bump-sw.mjs   → OK
deploy.yml YAML parse (python yaml + js-yaml)                          → OK
npm run lint                                                           → pass
npm test                                                               → 52/52 pass
npm run build                                                          → pass (3 hashes injected, SW bumped)
byte-level CSP check                                                   → 0 missing hashes, no 'unsafe-inline' in script-src
wrangler dev @ 127.0.0.1:8787                                          → all security headers served with hashes
```

## How to apply

```bash
# option A: apply the patch on main
git checkout main && git apply ouns-gap-fixes-9f91b73.patch && git commit -m "audit gap fixes"

# option B: push the branch and open a PR (recommended — CI validates it)
git remote add origin git@github.com:mbdesigny/Players.git   # if not present
git push origin audit-gap-fixes
```

Then verify after the auto-deploy:

```bash
curl -sI https://ounsapp.musbch.workers.dev/ | grep -i content-security-policy
# expect: three 'sha256-…' tokens, no 'unsafe-inline' inside script-src
```
