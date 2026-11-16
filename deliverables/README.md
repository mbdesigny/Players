# Ouns Audit — Deliverables

All deliverables for the Ouns/Players security audit and remediation live in this folder.

## Contents

| File | What it is |
|---|---|
| `AUDIT-REPORT.md` | Full 11-phase read-only audit report (47 findings / 46 active — 5 Medium / 41 Low / 0 High / 0 Critical; 51 verified-clean; trust-surface map; OWASP matrix; corrections COR-1/2/3). Audited commit: `49de07a`. |
| `REMEDIATION-PLAN.md` | Wave-structured remediation implementation plan (traceability: wave → findings → acceptance criteria). |
| `REMEDIATION-VERIFICATION.md` | Independent verification of the merged upstream remediation against the audit ledger — per-finding status + evidence + empirical runs, plus accepted residuals. |
| `gap-fixes/ouns-gap-fixes-9f91b73.patch` | Unified patch closing every remaining gap (apply on `main` @ `9f91b73`). |
| `gap-fixes/fix-log.md` | Commit-by-commit fix log with verification evidence and apply instructions. |
| `gap-fixes/files/` | Full copies of all 12 changed/new files, repo-relative. |

## State of the world (short version)

1. The audit was delivered at commit `49de07a`.
2. A remediation pass was subsequently merged upstream (PR #50 + dependabot series, up to `9f91b73`) implementing most of the plan.
3. This verification pass confirmed every fix with evidence, found 4 remaining gaps, and fixed them on branch `audit-gap-fixes`:
   - **F-31** — missing Tab focus trap (closed via new pure `lib/focus.js` + wiring)
   - **F-12** — prayer times could emit `NaN:NaN` / crash (closed with guards + negative tests)
   - **F-43/F-44 hardening** — `script-src 'unsafe-inline'` replaced by build-time sha256 hashes; SW update lifecycle hardened (F-22); `frame-ancestors`/`form-action` added
   - **CI/toolchain** — deploy-safety concurrency, unified setup-node, `.nvmrc`, `engines`, `packageManager`
4. Verification: lint pass, 52/52 tests, build pass, headers captured live via `wrangler dev`, all pinned SHAs and CDN URLs confirmed real.

The working repo with fixes applied: `/home/z/players-audit` (branch `audit-gap-fixes`).
