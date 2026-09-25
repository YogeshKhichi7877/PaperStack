# PaperStack Feature #2.2 — Subject Resolution Collision Hotfix

This fixes the failing regression where `Computer Graphics (CG)` resolved to `HM107` (Indian Constitution).

## Root cause

The shared subject matcher allowed very short subject codes such as `IC` to participate in substring matching. The word `graphics` contains the letters `ic`, so the wrong catalog subject could tie with Computer Graphics and win based on catalog order.

## Fix

- short codes/codes are now exact-match only;
- partial matching is limited to descriptive subject names/aliases;
- legacy `(CG)`, `(DS)`, `(CC)` suffixes are stripped before Subject Hub resolution;
- regression tests protect this behavior.

## Install

From `D:\PaperStack`:

```powershell
node .\apply-hotfix-02-2.js
node .\verify-hotfix-02-2.js
cd server
npm test
```

All tests must pass before continuing.

## Important: repair already-migrated resources

Because Feature #1 used the shared subject resolver during resource backfill, a few existing Resource documents may already have the wrong `subjectKey`. After the tests pass, rerun the migration. It is idempotent and updates existing resources by `legacySourceKey` rather than creating duplicates:

```powershell
npm run migrate:resources:dry
npm run migrate:resources
```

Then restart backend/frontend and verify:

- `/subject/CS502`
- `/subject/Computer%20Graphics%20(CG)`
- `/subject/CS501`
- `/subject/Data%20Science%20(DS)`

No destructive database migration is performed.
