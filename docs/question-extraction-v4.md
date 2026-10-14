# Question extraction v4

## Processing flow

Approved PDF → bounded download and PDF validation → selectable text per physical
page → selective page OCR/math verification → shared main-question scanner →
complete parent questions → optional AI structure repair → source-coverage checks
→ classification → protected persistence → admin review.

The existing durable Paper processing lease, queue recovery, permissions and
provider retry limits still control this flow. Extraction version is
`paper-processing-v4`; existing records need reprocessing to use these changes.

## What changed

- The local parser collects complete main-question source spans directly. It no
  longer creates, filters and reconstructs leaf questions. Small subparts, numeric
  rows, shared stems, choices and page continuations remain in the parent text.
- The same scanner provides AI batch boundaries. Oversized source blocks stay in
  local results and require review rather than being sliced into partial questions.
- Supported source forms include `Q-2`, `Q2(a)(i)`, `2. (a)`, standalone lettered
  and Roman parts, and explicit main-question OR alternatives. Internal OR choices
  remain within the parent. Ambiguous numeric working steps stay with an explicit
  Q-numbered parent and require review.
- Lettered `(c)` and `(d)` are not treated as Roman children. Marks can occur before
  wrapped prose or a figure. Parent totals take precedence over child totals;
  summation does not count both a part and its nested children. An explicit
  “each question carries N marks” instruction supplies otherwise absent totals.
- Numbered exam instructions are separated from question records. A stated
  question count larger than the extracted count produces a missing-source warning.
- Short readable inputs use text AI, not another whole-PDF visual request.
- AI confidence alone cannot authorize replacement: source words, numeric values,
  operators and part labels must survive. Physical source spans and raw text are
  retained when AI repairs a local question.
- OCR uses page images for scans, damaged font mappings and selected mathematical
  layouts. Its prompt keeps nested labels, delimited formulas and printed marks.
  A poor replacement cannot discard readable selectable text.
- Partial retries preserve longer saved questions. Automatic child records are
  retired only after their text is covered by a saved-parent candidate. Manual,
  imported, reviewed, verified and rejected records remain protected.
- Removed the obsolete leaf-candidate parser, duplicated AI boundary heuristic,
  character-overlap chunker, Gemini-specific response parser/alias and partial-page
  AI input selector. AI normalization and schema validation use the shared provider
  interface. The small AI-only grouping adapter remains for providers that return
  separate subparts despite the prompt.

## Validation and limits

Regression tests cover short parts, nested labels, alphabetic/Roman ambiguity,
numbered instructions, mathematical values, section numbering, OR alternatives,
cross-page continuation, inline marks, AI omissions, OCR failures and persistence.

Read-only diagnostics on public PaperStack scans used the configured visual
provider and inspected rendered page images. The complete physics sample yielded
seven parent questions of five marks each. The electrical sample yielded seven
questions with marks 4, 4, 4, 5, 5, 5, 3. A one-page physics upload contained only
four questions while referring to seven; it is now flagged rather than declared
complete. Downloaded PDFs and diagnostic OCR output live in ignored `.cache` and
are not committed or written back to production records.

OCR is probabilistic. The coverage checks detect omissions but do not prove every
symbol or its position is correct. Missing source pages cannot be reconstructed.
Diagrams/circuits are referenced to their original PDF and remain reviewable; this
pipeline does not recreate those images as standalone question illustrations.
Unclear layouts, oversized blocks and unsupported numbering require review.

## Rollout

Deploy the backend and client, then use Admin → Question extraction → Update
extraction (individual papers) or Extract next 5 (older versions). Keep AI enabled
for scanned papers. Review the extraction checks and original PDF before approving
uncertain results. Deployment itself does not bulk rewrite the question bank.
