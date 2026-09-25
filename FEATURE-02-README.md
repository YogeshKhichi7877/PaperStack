# PaperStack Feature #2 — Dedicated Subject Pages

This is the first major visible PaperStack 2.0 feature.

## Added

- `/subject/:subjectKey` subject hub pages.
- Canonical subject routing: `CS502`, `CG`, and `Computer Graphics` all resolve to the same subject resource key.
- Subject overview with paper/solution/resource counts.
- Resource tabs for papers, solutions, notes, formula sheets, assignments, labs, quizzes, viva, important questions, and revision sheets.
- Year, exam type, and text filters.
- Resource view/download tracking.
- Existing paper view/download totals remain synchronized when a legacy paper is opened from a Subject Hub.
- `Subject Hub` buttons on existing paper cards and paper modal.
- Exam Mode can now accept subject/branch/semester/examType query parameters.
- Responsive mobile layout and existing light/dark theme compatibility.
- Future feature cards for PYQ Intelligence, Important Topics, Ask PaperStack, and Mock Exams.

No AI API or paid service is used.

## Install

From the PaperStack repository root:

```powershell
node .\apply-feature-02.js
node .\verify-feature-02.js
```

Then run:

```powershell
cd server
npm test
```

Then:

```powershell
cd ..\client
npm run build
```

If both pass, run the backend and frontend and test:

- `http://localhost:3000/subject/CS502`
- `http://localhost:3000/subject/CG`
- Click **Subject Hub** on an existing paper card.
- Click **Open Exam Mode** from a Subject Hub and confirm the branch/semester/subject are pre-filled.

Use a subject code that exists in your database if CS502 has no resources.

## Database migration

None. Feature #2 uses the `resources` collection created by Feature #1.
