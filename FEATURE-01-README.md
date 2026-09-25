# PaperStack Feature #1 — Unified Subject + Resource Architecture

This feature adds the data foundation for PaperStack to store more than previous-year papers.

## Resource types now supported

- Question Paper
- Solution
- Notes
- Formula Sheet
- Assignment
- Lab Material
- Quiz
- Viva Questions
- Important Questions
- Syllabus
- Revision Sheet
- Other Resource

## Safety / compatibility

- Existing `paper` documents are not deleted or moved.
- Existing frontend pages keep using the current Paper APIs.
- A new `resources` collection is added beside the current collection.
- Existing papers can be mirrored into Resources using an idempotent backfill script.
- Future Paper saves automatically keep their matching Resource record in sync.
- Existing paper views/downloads are mirrored to question-paper Resource counters.

## Install

Copy this package into the PaperStack repository root, then run:

```powershell
node .\apply-feature-01.js
node .\verify-feature-01.js
```

Then:

```powershell
cd server
npm test
npm run migrate:resources:dry
```

Read the dry-run summary. If the paper/solution counts look correct, run:

```powershell
npm run migrate:resources
```

The migration uses `MONGODB_URI` from `server/.env` and is safe to run repeatedly.

## Test the API locally

Start the backend:

```powershell
npm start
```

Then open:

- `http://localhost:5000/api/resources/types`
- `http://localhost:5000/api/resources?kind=question_paper&limit=5`
- `http://localhost:5000/api/resources?subjectKey=CS502`
- `http://localhost:5000/api/resources/subject/CS502/summary`

If CS502 has no data in your archive, use a `subjectKey` returned by `/api/resources`.

## Expected UI change

None yet. This is intentionally an architecture/data feature. Feature #2 will consume this API to build the dedicated Subject Pages.
