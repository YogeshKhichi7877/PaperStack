# PaperStack Feature #3 — Smart Contribution V2

This patch upgrades `/contribute` without replacing the existing contribution submission endpoint.

## What it does

1. Student drops/selects a PDF.
2. PaperStack first uses local, free rule-based extraction.
3. It detects subject, subject code, branch, semester, year, and exam type.
4. The existing form is pre-filled automatically.
5. Student reviews/edits the values and submits through the existing workflow.
6. If confidence is low and `GEMINI_API_KEY` is configured, PaperStack may use the configured Gemini free-tier model as a fallback.
7. If Gemini is unavailable, the contribution form still works normally.

## Install

From `D:\PaperStack`:

```powershell
node .\apply-feature-03.js
node .\verify-feature-03.js
cd server
npm test
cd ..\client
npm run build
```

Then restart both backend and frontend.

## Optional free AI fallback

Feature #3 works without any AI key. Local extraction is always the first stage.

To enable the optional Gemini fallback, add to `server/.env`:

```env
SMART_AI_ENABLED=true
GEMINI_API_KEY=YOUR_FREE_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
```

Never put this key in `client/.env` or commit it to GitHub.

## No database migration

Feature #3 does not require a MongoDB migration.
