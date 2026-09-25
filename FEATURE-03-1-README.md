# PaperStack Feature #3.1 — PDF-first Contribution Flow

This UX patch sits on top of Feature #3. It does **not** change the Smart Contribution backend API or MongoDB.

## New behavior

### Smart Upload (default)
1. The user initially sees only the PDF upload area.
2. Selecting a PDF automatically starts metadata detection.
3. After detection, the editable metadata form is revealed.
4. The user can correct any field, optionally attach a solution, then submit.

### Manual Upload
The user can switch to Manual Upload at any time and immediately see the complete form.

## Install
From the PaperStack repository root:

```powershell
node .\apply-feature-03-1.js
node .\verify-feature-03-1.js
cd client
npm run build
```

Then restart the frontend and hard-refresh `/contribute`.

No database migration is needed.
