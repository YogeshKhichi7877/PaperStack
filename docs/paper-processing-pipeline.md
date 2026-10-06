# PaperStack automatic paper processing — implementation report

Implemented locally on 2026-10-06. No production database migration, archived-paper AI export, deployment, or dependency installation was performed.

## 1. Existing routes retained

- `POST /api/admin/upload/single` and PDF-only `POST /api/admin/upload/bulk`. See `bulk-paper-import.md` for the updated import contract and user workflow.
- Legacy confirmed upload paths, including `/api/admin/confirm-upload`, `/api/admin/confirm-bulk-upload`, `/api/admin/bulk-upload`, and `/api/upload`, share `saveConfirmedPaper`.
- `PATCH /api/admin/contributions/:id/approve` creates the published paper after admin approval.
- Existing extraction API: `/api/admin/question-extraction/paper/:paperId`, `/batch`, `/jobs/:jobId`, `/papers`, and `/status`.
- Metadata previews `/api/admin/extract-paper` and `/extract-bulk-papers` remain compatible.

## 2. Original behavior

Uploads stored the original PDF in Cloudinary and created a `Paper`. Question extraction was a separate admin action. It downloaded the PDF, parsed text with `pdf-parse`, used rules or the existing AI abstraction, and upserted `Question` records. Its background jobs existed only in process memory. Contributions remained pending until approved. Existing academic data comes from `subjectCatalog` and `subjectService`.

## 3. Root limitations

Uploads did not automatically produce questions. Empty pages were removed, losing physical page numbering and mixed scans. Page breaks prematurely closed questions. Numbering, Roman parts, shared stems, choices, mark sums, math glyphs, review gating, and reprocessing safety needed improvements. AI text was truncated at 30,000 characters; AI output could replace and omit local questions. Cross-paper repetitions were treated only as review warnings. Completed old extraction versions were skipped. The `--all` CLI processed only one small batch. Queue progress disappeared on restart.

## 4. Files modified

- `client/src/pages/AdminQuestionExtractionPage.js`
- `server/index.js`
- `server/models/Paper.js`
- `server/models/Question.js`
- `server/routes/adminModerationRoutes.js`
- `server/routes/askPaperStackRoutes.js`
- `server/routes/examWarRoomRoutes.js`
- `server/routes/importantTopicsRoutes.js`
- `server/routes/mockEvaluationRoutes.js`
- `server/routes/mockExamRoutes.js`
- `server/routes/pyqIntelligenceRoutes.js`
- `server/routes/questionAssistantRoutes.js`
- `server/routes/questionBrowserRoutes.js`
- `server/routes/questionExtractionRoutes.js`
- `server/routes/questionExtractionRoutes.test.js`
- `server/routes/questionRoutes.js`
- `server/routes/questionSolutionRoutes.js`
- `server/routes/revisionSheetRoutes.js`
- `server/routes/semesterSurvivalRoutes.js`
- `server/scripts/extract-questions.js`
- `server/services/academicContextService.js`
- `server/services/aiSchemas.js`
- `server/services/backgroundJobService.js`
- `server/services/freeAiQuestionService.js`
- `server/services/freeAiQuestionService.test.js`
- `server/services/paperBoundaryParser.test.js`
- `server/services/paperMetadataService.js`
- `server/services/paperMetadataService.test.js`
- `server/services/paperProcessingErrors.js`
- `server/services/paperProcessingIntegration.test.js`
- `server/services/paperProcessingQueue.js`
- `server/services/paperTextService.js`
- `server/services/paperTextService.test.js`
- `server/services/questionBrowserService.js`
- `server/services/questionBrowserService.test.js`
- `server/services/questionExtractionRules.js`
- `server/services/questionExtractionRules.test.js`
- `server/services/questionExtractionService.js`
- `server/services/questionService.js`
- `server/services/relatedQuestionService.js`
- `server/services/savedItemService.js`
- `server/services/searchV2Service.js`
- `server/services/subjectService.js`
- `server/services/trendingService.js`
- `server/testFixtures/pdf.js`

## 5. Supporting services added

- `paperTextService`: real PDF parsing, per-page scan detection, page rendering and selective OCR using the existing visual AI route.
- `paperMetadataService`: catalog matching, header fields, conflict detection, review suggestions, known-topic/unit mapping.
- `paperProcessingQueue`: durable state on the existing Paper record, dispatch through the existing queue, leases, bounded retries, restart recovery and shared CLI execution.
- `paperProcessingErrors`: safe transient-failure classification.
- Synthetic PDF fixtures and parser/pipeline/provider/recovery regression tests.

No storage provider, language migration, vector infrastructure, replacement endpoints, or duplicate Paper/Question collections were introduced.

## 6. Final processing flow

Validated upload → existing Cloudinary storage → Paper saved with a durable queued job → return existing upload response plus processing information → download approved storage URL → parse text → selectively OCR deficient pages → deterministic metadata and uncertain-field AI suggestions → rule question boundaries → uncertain-text AI structure fallback → classification → validation, repetition matching and protected bulk upserts → completed/needs-review/failed result.

Approved contributions enter this flow after the approval workflow completes. Durable recovery checks the Contribution approval record before dispatching a contribution paper. Original PDFs remain stored if subsequent extraction fails. Recovery starts on MongoDB connection and scans persisted queued/expired-lease papers every 15 seconds. Three pipeline attempts maximum; transient retry backoff is 60 then 120 seconds. A worker heartbeat renews its three-minute lease. Batch coordination uses the same background-job infrastructure without occupying a child extraction worker slot.

## 7. Question extraction strategy

Rules handle Q1/Q.1, numeric main and combined labels, lettered and Roman subparts, uppercase main labels, shared stems, page continuation, sections, OR chains and attempt instructions. Shared stems are included in child text rather than saved as additional answerable duplicates. Records preserve marks, pageStart/pageEnd, character offsets relative to normalized extracted text, choice information and mathematical Unicode/newlines. Missing marks stay null; [2+3] becomes 5. Bare formula parentheses are not treated as marks. Duplicate question text within the paper is omitted; distinct alternatives keep distinct stable keys.

## 8. OCR fallback

Text extraction runs first. Pages with fewer than 80 meaningful characters or eight words are OCR candidates, including pages containing only tiny selectable headers. `pdf-parse` renders one candidate page at a time at 1600px width. Only its image is submitted through `QUESTION_EXTRACTION_VISUAL`; text pages are not submitted for OCR. OCR JSON is validated and cached by image content/page. Empty, illegible, low-confidence or failed pages are recorded for review. Disabling AI explicitly disables OCR and returns an incomplete result rather than inventing questions.

## 9. AI fallback

Existing provider routing and credentials are reused. High-confidence question parsing needs no question AI call. Uncertain text is sent with nearby page context, in overlapping 12,000-character chunks so later questions are not silently truncated. Strict Zod validation applies. Provider retries are bounded; malformed structure gets one additional schema-focused attempt. Valid local questions survive unavailable or incomplete AI results. AI metadata guesses remain review suggestions; they do not override approved metadata.

## 10. Confidence and review

The auto-approval threshold defaults to 90/100 and cannot be configured below 90. Low-confidence boundaries, absent marks, unresolved/conflicting metadata, incomplete pages/AI results, likely visual dependencies and probable semantic repetitions require review. High-confidence extracted candidates remain in the existing `extracted` state with needsReview=false. Review candidates stay in the existing admin moderation queue and are excluded from public questions, search, practice, mock generation and other student feeds. Admin review updates the parent paper's counts and completion state where no other uncertainty remains.

## 11. Database changes

Existing collections remain `paper` and `questions`.

Paper adds examDate, totalMarks and a processing subdocument: detailed stage, durable jobId, attempts/options, lease/retry timestamps, page/OCR diagnostics, metadata suggestions, review count, safe stage error, duration and final result. Indexes support recovery and job polling. Legacy questionExtractionStatus values remain unchanged; detailed processing.stage adds the progress states. Extraction version is now `paper-processing-v2`.

Question adds choiceGroup, choiceInstructions, hasVisualContext and repeatClusterId. Existing paper references, subject/semester/year fields, marks, classification, provenance, confidence and source locations are reused. Exact indexed hash matching searches beyond the bounded semantic candidate window; similar occurrences are retained and linked for review rather than deleted. Mathematical notation differences are not silently treated as exact equality.

Reviewed, verified, rejected, manual and imported questions are protected. Atomic conditional update pipelines guard against concurrent moderation. Partial/uncertain processing does not prune old machine questions. The installed Mongoose bulk caster and schema validation were exercised in tests.

## 12. Backward compatibility

Existing upload `success`, `message`, `paper`, legacy `status`, bulk summaries/results and HTTP patterns are preserved; processing data is additive. Existing extraction responses still expose `job`, counts, result, preview, confidence, warnings and legacy extraction statuses. Single-job status survives process restarts using persisted Paper state. Existing upload metadata requirements and contribution approval remain in place. Public review-candidate access is intentionally removed; authenticated admin moderation provides review access.

PDF MIME/signature/size checks, safe storage filenames, approved HTTPS download hosts and redirect blocking protect ingestion. Existing upload authentication, size limits and extraction rate limiting remain. Additional historical storage domains require explicit allowlisting.

## 13. Bulk readiness and migration command

Single uploads, bulk uploads, approved contributions, API extraction and CLI use the same processing service/worker. `--all` traverses eligible records by ascending ObjectId, in bounded batches; each response includes nextCursor/hasMore. A failed or reviewable current-version paper is not repeatedly selected ahead of untouched papers. Current completed versions are idempotent; explicit force supports safe reruns.

From `server`:

```powershell
node scripts/extract-questions.js --all --limit 5 --ai
# Resume from the last reported nextCursor:
node scripts/extract-questions.js --all --limit 5 --ai --after <paperId>
# Explicitly rerun one paper:
node scripts/extract-questions.js --paper <paperId> --force --ai
```

This command was not run against the 1000+ production papers. It uses configured MongoDB/Cloudinary and, with --ai, can submit uncertain paper content to configured providers. Validate a representative sample before a full migration. No --ai means local text processing only; scanned papers need OCR/review.

## 14. Tests performed

395 backend tests passed, including real synthetic text, scanned and mixed PDFs; corrupt/unreadable input; combined and Roman labels; OR chains/attempt instructions; marks/missing marks; multi-page math; deduplication; AI outage/repair; reviewed-content preservation; version-aware idempotency; durable status; retry limits; queue execution and batch coordination with one extraction worker. Database/storage/provider calls were stubbed where needed; real local PDF parsing/rendering and installed Mongoose casting/validation were exercised.

15 frontend tests passed across AdminQuestionExtractionPage, MockExamGeneratorPage and MathAnswer. They retain the existing mock generation loading animation, AI-source behavior, extraction actions and mathematical rendering checks.

## 15. Typecheck and lint

This repository is JavaScript and has no TypeScript typecheck script or tsconfig. Node syntax checks passed for all 44 changed/new backend JavaScript files. Zod validates provider output; Mongoose validates persisted candidate shapes in integration tests. Frontend ESLint passed for the edited page. Explicit Node ESLint checks passed for the pipeline services, extraction route and CLI (undefined names, duplicate keys, unused variables and typeof checks). `git diff --check` passed.

## 16. Production build

The React production build completed successfully with CI=true. No new runtime dependency was added.

## 17. Remaining limits and manual work

- Deployment and production migration are still required to apply the local implementation to the live archive.
- Live Cloudinary/MongoDB ingestion and OCR accuracy on actual archived papers were not exercised in this change. Synthetic OCR tests use a stubbed provider; no stored paper was exported for testing.
- Illegible scans, unusual layouts, metadata conflicts, missing marks and uncertain repetitions still require admin review. Confidence scores are heuristics/provider estimates, not guarantees of complete extraction.
- Diagram/circuit/graph dependencies retain physical page references and require review; question-region image cropping is not implemented.
- Difficulty stays unknown and unit stays null when no reliable classification/mapping exists. AI structure extraction can provide difficulty where supported.
- Parsing still needs the original PDF in memory, bounded to 30 MB by default; pages are bounded to 100 by default and OCR images are rendered sequentially. This is not an unlimited streaming PDF engine.
- Batch coordinator job summaries use existing process memory; per-paper processing is persisted and recoverable. A resumed CLI uses cursor and version state.

Configuration: QUESTION_PDF_MAX_MB (default 30, maximum 100), QUESTION_PDF_MAX_PAGES (default 100, maximum 300), QUESTION_EXTRACTION_AI_CONCURRENCY (existing 1–4), QUESTION_AI_MIN_CONFIDENCE (90–98), existing AI/visual provider configuration, and optional comma-separated PAPER_STORAGE_ALLOWED_HOSTS for historical storage domains. Review counts and stages appear in the existing admin extraction page, which refreshes active papers automatically.
