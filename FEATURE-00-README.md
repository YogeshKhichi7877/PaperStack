# PaperStack Feature #0 — Foundation Refactor + Critical Fixes

This patch is built for the audited `main` branch of:

`YogeshKhichi7877/PaperStack`

It is intentionally a **safe incremental refactor**. It does not redesign the UI or migrate the database. Instead, it creates reusable infrastructure and fixes correctness issues before the larger PaperStack 2.0 features are added.

## What this feature changes

- Centralizes client environment configuration.
- Centralizes client user/admin auth headers.
- Moves Express authentication middleware out of the 2,800+ line `server/index.js`.
- Moves CSV parsing into one shared utility and removes both duplicate local parser definitions.
- Adds a reusable semester-pack Mongo query builder.
- Fixes semester-pack branch filtering while retaining a legacy `title` fallback for older paper records.
- Removes the fake `5 contributors` analytics fallback.
- Separates **Most Active Subject** from **Hardest Subject**.
  - Most Active = existing views/downloads/archive activity behavior.
  - Hardest = actual `PaperVote.difficulty` votes (`Easy=1`, `Medium=2`, `Hard=3`).
- Adds `/api/catalog/subjects` as the future single server source for subject catalog data.
- Adds Node built-in unit tests. No new npm package is required.
- Adds backup, rollback, and structural verification scripts.

## Install on Windows / PowerShell

1. Make a Git commit of your current working PaperStack project first.
2. Extract/copy this ZIP **into the root of your PaperStack repository**. The root is the folder that contains `client/` and `server/`.
3. From that root run:

```powershell
powershell -ExecutionPolicy Bypass -File .\apply-feature-00.ps1
```

Equivalent command:

```powershell
node .\apply-feature-00.js
```

The installer creates backups under:

`.paperstack-backups/feature-00-original/`

before patching the large existing files.

## Verify

Run from the repository root:

```powershell
node .\verify-feature-00.js
```

Then run backend tests:

```powershell
cd server
npm test
```

Then frontend production build:

```powershell
cd ..\client
npm install
npm run build
```

Finally start both apps normally and test login, paper browsing, contribution upload, analytics, missing papers, and semester-pack download.

## Important Git cleanup

Your repository currently tracks `server/node_modules` even though `.gitignore` correctly ignores it. Remove it from Git tracking once:

```powershell
git rm -r --cached server/node_modules
git add .gitignore
git commit -m "chore: stop tracking server node_modules"
```

Do **not** delete your local dependency folder before testing unless you plan to run `npm install` again.

## New endpoint

`GET /api/catalog/subjects`

Response contains the canonical subject catalog, expected paper years, and supported exam types. Future Subject Pages, Smart Contribution, PYQ Intelligence, and AI features should consume this API rather than creating more independent subject lists.

## No paid AI added

Feature #0 adds no model/API dependency. PaperStack remains compatible with the current free-first requirement.
