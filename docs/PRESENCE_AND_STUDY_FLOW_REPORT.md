# PaperStack: study flow fixes and private live analytics

Implemented 12 October 2026. This report covers the direct UI/download request and the additive analytics attachment. The direct request authorizes the homepage, navigation, dashboard and subject-picker changes; analytics does not redesign the learning experience.

## Student-facing fixes

- Subject facets previously grouped the same code by label, semester and sometimes branch. They now merge catalog identities, preserve question totals, and union year/exam/semester coverage. The shared picker also deduplicates formatted code variants while preserving searchable aliases. Applied to question browser, repeated topics, important topics, revision sheets and exam planner.
- “See how it works” opens a small native modal with four simple steps, a Got it button, Escape dismissal, keyboard focus containment and responsive sizing. It explains saved classes, practice feedback and later reviews without promising perfect mastery.
- Removed Report Issue and My Progress from the main site menu; Report Issue remains in the footer. Learning Intelligence was removed from that menu too, so progress has one main entry through Dashboard. Existing workspace navigation and bookmarked URLs remain usable.
- Dashboard → My progress uses the existing authenticated learning API: mastery, due review topics, weak topics and questions practiced this week. Continue learning/Resume practice links use the saved class/session IDs. Progress refreshes on window focus. No sample values are shipped; unavailable values remain dashes with an error message.
- ZIP: fixed the undefined branch variable and Archiver 8 API incompatibility. Downloads validate the branch, semester, exam type and PDF content; filenames are unique even for same-subject/year papers; solutions are included; partial failures create DOWNLOAD_NOTES.txt; total file failure returns 502 JSON rather than an empty successful ZIP. Storage downloads have a 20-second timeout and 30 MB per-file bound, use allowed HTTPS storage hosts, and stop scheduling work after disconnection. A download counter failure does not break the pack. Branch matching no longer includes other CSE programs just because their label contains CSE.

## Required analytics implementation report

1. **Architecture:** one React tracker → POST /api/presence/heartbeat → Express validation and existing JWT middleware → shared Redis sorted set plus hash. Admin reads are separate. A five-minute scheduler saves aggregate Mongo snapshots.
2. **Redis:** reuses aiCacheService.getRedis(), the existing ioredis dependency and REDIS_URL. There is no second Redis connection or production memory fallback. Presence works independently of AI_CACHE_ENABLED. An ended shared client can be recreated on a later request.
3. **Heartbeat interval:** 30 seconds; immediate on mount, authentication change and return to visibility; idle-resume interaction is throttled. Requests time out after eight seconds and failures are silent.
4. **Presence timeout:** 90 seconds since the last accepted heartbeat. Expired members are removed atomically before writes/reads. Redis keys also expire after 180 seconds without updates.
5. **Active means:** a recently visible/recently interacting browser that sent a heartbeat in the last 90 seconds. It does not prove a student is studying. Hidden tabs stop sending; inactivity stops sending after five minutes. Existing presence then expires within 90 seconds.
6. **Unique users:** backend-verified student JWT _id, HMAC-hashed before storage. Frontend userId is ignored. Guests use a random browser identifier, also HMAC-hashed server-side.
7. **Tabs:** separate random document/session identifiers, one tracker at the router root, one heartbeat interval per mounted tracker. Same user across tabs/devices counts once, with separate activeSessions. A browser’s guest tab is merged with its active authenticated tab on login. Fresh document IDs avoid cloned sessionStorage identifiers in duplicated tabs; reload can temporarily retain the previous session until expiry, without increasing unique users.
8. **Guests:** random stable localStorage browser identifier; no name, email or IP identity. Separate browsers/private windows count separately. If browser storage/crypto is unavailable, tracking quietly disables.
9. **Admins:** authenticated admin heartbeats and /admin routes are excluded from student/guest presence. Switching into admin mode removes that document’s entry. No individual admin roster or student roster is exposed.
10. **Routes:** HOME, QUESTIONS, LEARN, PRACTICE, SUBJECT, EXAMS, EXAM_WAR_ROOM, MOCK, DASHBOARD, PROFILE, RESOURCES, OTHER. Exact dynamic paths/query strings are not retained. Unknown routes become OTHER.
11. **Subjects:** optional explicit subjectCode query context only, normalized and accepted only when it exactly matches the existing canonical catalog. No subject is inferred from free-text class notes or ambiguous names. Counts are returned only to admins; the initial panel focuses on page activity.
12. **Authorization:** both admin endpoints reuse authenticateAdmin. Verified by real local HTTP requests: guest 401, student 403, typed admin JWT 200. Heartbeats reuse authenticate/authenticateAdmin and return only an empty 204. Admin responses use Cache-Control: no-store.
13. **Privacy:** ephemeral pseudonymous session/user/browser identifiers in Redis; only aggregates persisted in Mongo. No names, emails, raw paths, note text or IP addresses in presence records or API responses. IP is used transiently by the existing rate-limit library, not as presence identity. Anonymous counts are approximate and not bot-proof.
14. **History:** one five-minute aggregate snapshot while the server is running and Mongo/Redis are available. No Mongo query or write on heartbeat. The admin panel fetches the last 24 hours; missing samples remain gaps rather than invented zeros.
15. **Peak:** maximum recorded five-minute sample for today in Asia/Kolkata. The UI explicitly says sampled peak; it may miss brief traffic spikes. Before the first sample, peak is unavailable rather than zero.
16. **Mongo model:** PresenceSnapshot: bucket, sampledAt, activeUsers, authenticatedUsers, guests, activeSessions, page counts and optional canonical subject counts. No raw identities.
17. **Retention:** unique five-minute bucket plus Mongo TTL index removes snapshots after 60 days. No indefinite raw history or long-term daily table was added. Normal Mongo index creation must be enabled/applied by deployment.
18. **Failure behavior:** heartbeat failure does not break the student page. Admin live endpoint returns 503/unavailable if Redis cannot be read; history can remain independently available. Database downtime prevents new snapshots, not heartbeats. No manufactured fallback counts.
19. **Multiple instances:** shared Redis data, atomic Lua updates/pruning, Redis NX snapshot bucket lock, Mongo unique bucket/upsert. All instances must share Redis, JWT secret and Mongo. The simple process scheduler follows the current server lifecycle; sleeping/restarting hosts can leave historical gaps. Endpoint rate limits are per process, like the existing application limits.
20. **Admin UI:** compact Live Usage panel inside the existing /admin/product-analytics page. Unique users, signed-in users, guests, sessions, sampled peak, page counts and one 24-hour chart. Polls every 30 seconds while visible, with loading and independent live/history failure states. No public live count.
21. **Tests added:** identity/tab deduplication, login merge, expiry, route/subject normalization, admin exclusion, Redis outage, single aggregate snapshot across service instances, IST peak calculation, endpoint 401/403/200 and forged userId rejection; browser heartbeat idle/hidden/resume/cleanup/auth transitions; duplicate subject options/facets; ZIP integrity, duplicate filenames, solutions, partial failure, total failure and validation. Navigation test updated to require removed links to stay absent.
22. **Tests passing:** 456 backend tests and 76 frontend tests across 22 frontend suites. ZIP test makes an HTTP request and opens the returned archive using JSZip. Redis service unit tests use an explicit fake Redis contract; they are not claimed as a real Redis integration test.
23. **Production build:** compiled successfully. Desktop 1440px and mobile 390px Playwright checks use isolated API fixtures, not production data. They verify help dismissal, menu removal, dashboard values/resume target, duplicate picker entries, admin gating, unavailable state and no horizontal overflow. Screenshots and assertions are under .cache/presence-qa/ (local, ignored).
24. **Remaining limitations:** the local REDIS_URL exists but is not a valid redis:// or rediss:// URL, so the real Redis smoke test could not run. Configure a valid shared Redis URL on the backend and restart, then verify the live deployment; credentials were not modified. Mongo snapshot persistence/TTL and actual production storage PDF availability were not exercised against production. ZIP content/HTTP behavior was tested with fixture PDFs, without incrementing production download counters. Large packs are still sequential streamed ZIPs, not queued exports; proxy timeouts remain possible. Presence is approximate, page totals can exceed unique users across multiple tabs, and a page refresh can temporarily inflate session count until the old document expires. Browser fixtures are QA-only and never used as application fallback data.
25. **Every changed file:** listed below (excluding ignored QA logs/artifacts and the pre-existing untracked .jest-cache directory).

- `client/src/App.js`
- `client/src/Navbar.test.js`
- `client/src/components/LearningHelp.css`
- `client/src/components/LearningHelp.js`
- `client/src/components/LiveUsagePanel.css`
- `client/src/components/LiveUsagePanel.js`
- `client/src/components/PresenceTracker.js`
- `client/src/components/PresenceTracker.test.js`
- `client/src/components/SearchableSubjectSelector.js`
- `client/src/components/SearchableSubjectSelector.test.js`
- `client/src/pages/AdminProductAnalyticsPage.js`
- `client/src/pages/PaperStackHomePage.js`
- `client/src/pages/PersonalDashboardPage.js`
- `docs/PRESENCE_AND_STUDY_FLOW_REPORT.md`
- `server/.env.example`
- `server/index.js`
- `server/models/PresenceSnapshot.js`
- `server/routes/examWarRoomRoutes.js`
- `server/routes/importantTopicsRoutes.js`
- `server/routes/presenceRoutes.js`
- `server/routes/pyqIntelligenceRoutes.js`
- `server/routes/questionBrowserRoutes.js`
- `server/routes/revisionSheetRoutes.js`
- `server/services/aiCacheService.js`
- `server/services/presenceService.js`
- `server/services/presenceService.test.js`
- `server/services/semesterPackService.js`
- `server/services/semesterPackService.test.js`
- `server/services/subjectService.js`
- `server/services/subjectService.test.js`
- `server/utils/paperQuery.js`
- `server/utils/paperQuery.test.js`
