# PDF-only bulk import

Implemented in the existing PaperStack Upload Center. Changes are local and require a coordinated frontend/backend deployment.

## Admin workflow

1. Sign in to PaperStack, then verify admin access.
2. Open `/admin/upload`. Bulk Import is now the default tab.
3. Drag/select PDFs. No CSV, filename preparation, or metadata form is required.
4. Click **Import N Papers**. Keep the page open until the upload finishes.
5. PDFs are stored, Paper records are queued, and processing continues on the server. You can leave once the upload finishes.
6. Return to `/admin/question-extraction`, choose a batch, and check progress. Review shows already detected metadata and extracted questions. Correct only uncertain information.

Default limits: 30 paper PDFs, 30 MB per individual PDF, 150 MB total per request including optional solutions. These limits are displayed in the frontend from the server configuration. Optional solutions are collapsed by default. Clear, unique filename stem matches attach automatically; uncertain solutions are stored and can be associated in the batch review screen.

## API contract

`POST /api/admin/upload/bulk` requires the existing admin bearer token. Send multipart fields `papers` (repeated PDF files) and optionally `solutions` (repeated PDF files). Do not send `csv` or metadata fields. The browser sets the multipart boundary.

Example response (HTTP 202, after storage, before question processing finishes):

```json
{
  "success": true,
  "batchId": "MongoDB batch ID",
  "totalFiles": 30,
  "queued": 28,
  "skipped": 1,
  "failed": 1,
  "status": "processing"
}
```

Also returned: per-file results, public contributor name and community credit added for this batch. One failed file does not reject valid files. Batch size/total size violations reject the request before importing it; split the selection into smaller batches.

- `GET /api/admin/upload/bulk/config`: server upload limits and stored community contribution count.
- `GET /api/admin/upload/bulk/batches?after=<cursor>`: persisted import history, 50 batches per page.
- `GET /api/admin/upload/bulk/batches/:batchId`: progress, counts, question totals, per-file results and optional solution review.
- `GET /api/admin/upload/bulk/papers/:paperId/review`: detected paper metadata and extracted questions in sequence.
- `PATCH /api/admin/upload/bulk/papers/:paperId/metadata`: validate/correct metadata and sync question provenance.
- Existing `POST /api/admin/question-extraction/paper/:paperId`: retry processing.
- Existing `PATCH /api/admin/moderation/questions/:questionId`: approve/reject a question, optionally correcting text and marks.
- `PATCH /api/admin/upload/bulk/batches/:batchId/solutions/:hash`: associate a stored uncertain solution with a paper in that batch.

All import, progress and review endpoints remain admin-only. The CSV preview/confirm routes and old CSV bulk endpoint were removed. The manual single-upload route and existing smart contribution endpoints remain available and use the shared processing pipeline.

## Implementation report

1. **Existing architecture:** Upload Center previously required a CSV, preview, exact filename matching and confirmation. Storage is Cloudinary, not R2. Existing Paper/Question models, subject catalog, background queue, OCR and moderation were reused.
2. **CSV removal:** Removed template/download/input/preview/error UI, mapping parser, matching helpers, CSV multipart fields, CSV routes and unused CSV utility/tests. Removed obsolete Upload Center CSS.
3. **Routes:** Replaced the Upload Center bulk preview/confirm handlers with one PDF-only bulk route module mounted at the existing `/api/admin/upload` namespace. No second queue or storage system was introduced.
4. **Request contract:** Admin multipart PDF files only, optional solution PDFs; HTTP 202 includes a persisted batch ID and isolated file outcomes.
5. **Frontend:** Default Bulk Import tab, drag/drop/select, accumulated selection, remove/clear controls, visible limits, progress during upload, results and persisted batch history. Processing page supports older history pages, per-file status, retry and inline review/correction.
6. **Processing engine:** Stored Papers use `initialProcessingFields()` and `startSavedPaperProcessing()`. Existing `extractPaperQuestions()` performs extraction; single uploads, approved contributions and the resumable migration CLI share it.
7. **Text extraction:** Existing `pdf-parse` native text extraction first. Upload validation checks PDF structure/page count without extracting questions or calling AI in the request.
8. **OCR:** Existing scan detection and selective per-page rendering/OCR. Mixed PDFs preserve physical pages. Provider failure keeps readable native questions and reports unreadable pages for review.
9. **Metadata:** Header code/name lookup against the catalog; Arabic/Roman semester, explicit branch, exam type, year, date and total marks. Canonical title generated automatically. Question text and filenames do not supply exam metadata. Shared catalog branches remain uncertain without header evidence.
10. **Questions:** Existing deterministic parser preserves labels, subparts, Roman parts, OR/attempt groups, multiline/multipage text, math, missing marks and visual context. Every saved question references its paper and source pages.
11. **AI fallback:** Existing AI abstraction handles difficult structures/OCR and uncertain metadata. Structured results are validated. Metadata suggestions populate missing fields for review without overriding approved or deterministic fields. No additional provider was added.
12. **Confidence/review:** Field values carry confidence. Missing/conflicting/AI-suggested metadata retains valid questions for review. Papers awaiting review are excluded from archive, search, trending, completion and public resources. Review corrects question context before publishing metadata; question approval is blocked while metadata remains uncertain.
13. **Batch/queue:** New small `PaperImportBatch` record stores outcomes and optional solutions, never PDF bytes. Existing queue remains the processor; Paper persists job/lease/retry state. Batch status reads MongoDB and survives process-memory loss. Interrupted upload bookkeeping is reconciled with stored Paper records; re-uploading the same selection resumes through duplicate checks.
14. **Community attribution:** Optional separately signed user token is verified server-side and its account is loaded from MongoDB. For `yogeshkhinchi2005@gmail.com`, public attribution is **PaperStack Community**, public personal contributor ID is null, and the actual uploader ID is stored privately. Only this verified Google account receives the institute-email exception; admin access still requires admin authentication. Stored accepted PDFs increase community count once, duplicates/failed uploads do not, and extracted questions never create contribution/XP records. Password-only admin sessions cannot identify an individual user and display PaperStack Admin.
15. **Database:** Paper gains import batch ID, review status, private actual uploader ID and community attribution flag. Existing extraction state remains authoritative. Batch history indexes/timestamps are supported by MongoDB ObjectIds and timestamps. Question metadata is updated after admin correction; existing extracted question identity/protection logic remains in place.
16. **Duplicates:** SHA-256 exact PDF check before storage plus the existing unique file-hash index for races. Renaming does not create another paper. Cross-paper question occurrences are retained with existing repeat detection/review behavior.
17. **Retries/failures:** Existing bounded processing retries/restart recovery; storage retries transient failures up to three attempts. Corrupt/encrypted/oversized PDFs get readable per-file errors. Stored papers are preserved if dispatch fails. Failed processing has Retry; failed storage asks for that PDF to be selected again. Streamed total-byte limits cap request memory. Classification failure does not discard extracted questions.
18. **Tests:** 417 backend tests pass. Includes PDF-only 30-file import, one corrupt file among 30, exact duplicates, real text PDF metadata-to-question processing, unknown metadata, scanned/mixed PDF handling, solution matches/review, uploader attribution/authentication, memory limits, durable batch progress and metadata review. Existing parser/OCR/provider/recovery/contribution tests also pass. 24 frontend tests across six suites pass, including imports, drag/drop, selection errors, form-data/auth contract, review/retry, math rendering and existing mock generation animation.
19. **Typecheck:** Not applicable: this repository is JavaScript and has no TypeScript configuration/typecheck script. Node syntax checks passed for the changed backend files.
20. **Lint:** Changed frontend production files and affected backend pipeline/import modules pass ESLint. `git diff --check` passes.
21. **Production build:** React production build passes. No production deployment, database migration or live archive/provider validation was performed. Tests use synthetic PDFs and mocked database/storage/provider boundaries; they do not establish accuracy for every real historical scan.

## Deployment configuration

```dotenv
BULK_UPLOAD_MAX_FILES=30
BULK_UPLOAD_MAX_TOTAL_MB=150
QUESTION_EXTRACTION_AI_CONCURRENCY=1
```

The existing extraction concurrency setting supports 1–4 workers; keep the current conservative default until server memory/provider capacity are verified. Deploy backend and frontend together, since the old CSV route contract has been removed. Keep existing MongoDB, Cloudinary and AI provider environment settings. No new package/provider is required. Verify one actual text paper and one actual scan before importing the full archive; metadata or OCR uncertainty appears for review rather than being guessed.
