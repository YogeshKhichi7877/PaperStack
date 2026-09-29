# PaperStack AI execution

`services/aiService.js` is the only provider transport. Call `generateForTask(task, prompt, options)` with a task from `TASK_ROUTES`. Groq is preferred for text reasoning and structured text; Gemini is preferred for visual PDF input. Raw attachments are sent only to Gemini. Groq can receive locally extracted text after a visual request fails. `AI_ROUTE_<TASK>` can override the order within the supported providers.

The router uses the next eligible provider before retrying a failed one. It retries only timeouts, network failures, 429, and 500/502/503/504, with at most two retries after the first pass. 401/403 and malformed responses stop retries for that provider. Logs record task, provider, model, attempt, duration, outcome, and fallback; prompts, files, credentials, and response bodies are excluded. Client responses contain generic errors and availability status, not provider names.

Question extraction and smart metadata start with local PDF parsing and rules. Text AI is used only when local confidence is insufficient. Visual AI is used when extracted text is weak. Existing extracted questions remain when AI fails; manual, reviewed, and verified questions are protected. AI metadata is a catalog checked suggestion that still requires review.

The math verifier parses a bounded expression tree with mathjs. It permits a small set of operators, constants, variables, matrix operations, statistics, and elementary functions. Assignment, property access, arbitrary function calls, code execution, oversized expressions, and oversized results are rejected. A successful calculation verifies the arithmetic of the extracted expression; it cannot prove that an AI selected the correct formula from the question. Generated numerical mock answers are accepted only when the claimed result matches the deterministic calculation. Practice evaluation caps marks when a known reference value or unit does not match, while allowing limited method credit. Scores remain practice estimates.

Structured AI outputs are checked with zod contracts in `services/aiSchemas.js`, followed by feature specific checks for catalog subjects, question IDs, marks, source IDs, and numerical results. Important Topics, PYQ counts, Semester Survival metrics, rankings, and other archive facts remain deterministic.

Future symbolic work could use an optional FastAPI service with SymPy, NumPy, and SciPy for calculus, differential equations, eigenproblems, and advanced numerical methods. The current deployment needs only Node, mathjs, and zod; no Python service is required.
