/*
 * PaperStack Feature #2 - Dedicated Subject Pages
 * Run from PaperStack repository root AFTER Feature #1 / #1.1:
 *   node apply-feature-02.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const CLIENT_APP = path.join(ROOT, 'client', 'src', 'App.js');
const RESOURCE_ROUTES = path.join(ROOT, 'server', 'routes', 'resourceRoutes.js');
const SERVER_PACKAGE = path.join(ROOT, 'server', 'package.json');
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-02-original');

function fail(message) {
  throw new Error(`[Feature #2] ${message}`);
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`Required file not found: ${path.relative(ROOT, filePath)}`);
}

function backupFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  const destination = path.join(BACKUP_ROOT, relative);
  if (fs.existsSync(destination)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(filePath, destination);
}

function insertAfterOnce(source, anchor, addition, label) {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) fail(`Could not find insertion anchor: ${label}`);
  return source.replace(anchor, `${anchor}${addition}`);
}

function insertBeforeOnce(source, anchor, addition, label) {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) fail(`Could not find insertion anchor: ${label}`);
  return source.replace(anchor, `${addition}${anchor}`);
}

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) fail(`Could not find patch anchor: ${label}`);
  return source.replace(search, replacement);
}

function patchClientApp(original) {
  let source = original;

  if (!source.includes("from './config/appConfig'")) {
    fail('Feature #0 does not appear to be applied to client/src/App.js.');
  }

  source = insertAfterOnce(
    source,
    "import PWAInstallPrompt from './components/PWAInstallPrompt';",
    `\nimport SubjectPage from './pages/SubjectPage';\nimport { getSubjectHubPath } from './utils/subjectRoute';`,
    'Subject Page imports'
  );

  source = insertAfterOnce(
    source,
    '<button onClick={handleDownload} className="btn-download">Download Paper</button>',
    `\n              <button\n                type="button"\n                className="subject-hub-open-button"\n                onClick={(event) => {\n                  event.stopPropagation();\n                  onClose();\n                  navigate(getSubjectHubPath(paper));\n                }}\n              >\n                Subject Hub\n              </button>`,
    'Paper modal Subject Hub action'
  );

  source = insertAfterOnce(
    source,
    '<button className="btn-view-pdf" onClick={() => handleView(paper)}>View</button>',
    `\n                    <button\n                      type="button"\n                      className="subject-hub-open-button"\n                      onClick={(event) => {\n                        event.stopPropagation();\n                        navigate(getSubjectHubPath(paper));\n                      }}\n                    >\n                      Subject Hub\n                    </button>`,
    'paper card Subject Hub action'
  );

  const examModeOriginal = `  const navigate = useNavigate();\n\n  const [papers, setPapers] = useState([]);\n  const [branch, setBranch] = useState('ECE');\n  const [semester, setSemester] = useState('4');\n  const [subject, setSubject] = useState('');\n  const [examType, setExamType] = useState('Mid-Sem');`;
  const examModeReplacement = `  const navigate = useNavigate();\n  const location = useLocation();\n  const examModeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);\n\n  const [papers, setPapers] = useState([]);\n  const [branch, setBranch] = useState(() => examModeParams.get('branch') || 'ECE');\n  const [semester, setSemester] = useState(() => examModeParams.get('semester') || '4');\n  const [subject, setSubject] = useState(() => examModeParams.get('subject') || '');\n  const [examType, setExamType] = useState(() => examModeParams.get('examType') || 'Mid-Sem');`;
  source = replaceOnce(source, examModeOriginal, examModeReplacement, 'Exam Mode deep-link defaults');

  const paperRouteAnchor = '<Route path="/paper/:id" element={<PaperSharePage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />';
  source = insertAfterOnce(
    source,
    paperRouteAnchor,
    `\n              <Route\n                path="/subject/:subjectKey"\n                element={\n                  <div className="app-container">\n                    <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />\n                    <SubjectPage user={user} toast={toast} />\n                    <Footer />\n                  </div>\n                }\n              />`,
    'Subject Page route'
  );

  return source;
}

function patchResourceRoutes(original) {
  let source = original;

  if (!source.includes("const Resource = require('../models/Resource');")) {
    fail('Feature #1 resource routes are missing. Run Feature #1 first.');
  }

  source = insertAfterOnce(
    source,
    "const Resource = require('../models/Resource');",
    `\nconst Paper = require('../models/Paper');`,
    'Paper model import for resource analytics sync'
  );

  source = replaceOnce(
    source,
    "const { normalizeSubjectKey } = require('../services/subjectService');",
    "const { resolveResourceSubjectKey } = require('../services/subjectPageService');",
    'canonical subject route resolver import'
  );

  source = source.replace(
    'const subjectKey = normalizeSubjectKey(req.params.subjectKey);',
    'const subjectKey = resolveResourceSubjectKey(req.params.subjectKey);'
  );
  source = source.replace(
    'if (req.query.subjectKey) query.subjectKey = normalizeSubjectKey(req.query.subjectKey);',
    'if (req.query.subjectKey) query.subjectKey = resolveResourceSubjectKey(req.query.subjectKey);'
  );

  const statsRoutes = `async function incrementPublicResourceStat(req, res, field) {\n  try {\n    const resource = await Resource.findOneAndUpdate(\n      { _id: req.params.id, status: 'active' },\n      { $inc: { [field]: 1 } },\n      { new: true }\n    ).lean();\n\n    if (!resource) return res.status(404).json({ error: 'Resource not found' });\n\n    if (resource.kind === 'question_paper' && resource.legacyPaperId) {\n      await Paper.findByIdAndUpdate(resource.legacyPaperId, {\n        $inc: { [field]: 1 },\n        updatedAt: new Date(),\n      });\n    }\n\n    return res.json({\n      success: true,\n      resourceId: resource._id,\n      [field]: Number(resource[field] || 0),\n    });\n  } catch (error) {\n    if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid resource id' });\n    return res.status(500).json({ error: \`Failed to record resource \${field}\` });\n  }\n}\n\nrouter.post('/:id/view', async (req, res) => {\n  await incrementPublicResourceStat(req, res, 'views');\n});\n\nrouter.post('/:id/download', async (req, res) => {\n  await incrementPublicResourceStat(req, res, 'downloads');\n});\n\n`;

  source = insertBeforeOnce(
    source,
    "router.get('/:id', async (req, res) => {",
    statsRoutes,
    'resource view/download tracking routes'
  );

  return source;
}

function patchServerPackage(original) {
  const pkg = JSON.parse(original);
  const existing = String(pkg.scripts?.test || '').trim();
  const testFile = 'services/subjectPageService.test.js';
  const testScript = existing.includes(testFile)
    ? existing
    : `${existing || 'node --test'} ${testFile}`.trim();

  pkg.scripts = {
    ...(pkg.scripts || {}),
    test: testScript,
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function verifyFeatureFiles() {
  [
    'client/src/pages/SubjectPage.js',
    'client/src/pages/SubjectPage.css',
    'client/src/services/resourceApi.js',
    'client/src/utils/subjectRoute.js',
    'server/services/subjectPageService.js',
    'server/services/subjectPageService.test.js',
  ].forEach((relative) => requireFile(path.join(ROOT, relative)));
}

function syntaxCheck(relativePath) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, relativePath)], { stdio: 'pipe' });
}

function restoreBackups() {
  [CLIENT_APP, RESOURCE_ROUTES, SERVER_PACKAGE].forEach((filePath) => {
    const backup = path.join(BACKUP_ROOT, path.relative(ROOT, filePath));
    if (fs.existsSync(backup)) fs.copyFileSync(backup, filePath);
  });
}

function main() {
  requireFile(CLIENT_APP);
  requireFile(RESOURCE_ROUTES);
  requireFile(SERVER_PACKAGE);
  verifyFeatureFiles();

  [CLIENT_APP, RESOURCE_ROUTES, SERVER_PACKAGE].forEach(backupFile);

  const clientOriginal = fs.readFileSync(CLIENT_APP, 'utf8');
  const routesOriginal = fs.readFileSync(RESOURCE_ROUTES, 'utf8');
  const packageOriginal = fs.readFileSync(SERVER_PACKAGE, 'utf8');

  try {
    fs.writeFileSync(CLIENT_APP, patchClientApp(clientOriginal));
    fs.writeFileSync(RESOURCE_ROUTES, patchResourceRoutes(routesOriginal));
    fs.writeFileSync(SERVER_PACKAGE, patchServerPackage(packageOriginal));

    [
      'server/routes/resourceRoutes.js',
      'server/services/subjectPageService.js',
      'server/services/subjectPageService.test.js',
    ].forEach(syntaxCheck);

    console.log('\nFeature #2 applied successfully.');
    console.log('Next:');
    console.log('  1. node .\\verify-feature-02.js');
    console.log('  2. cd server && npm test');
    console.log('  3. cd ../client && npm run build');
    console.log('  4. Start both apps and open /subject/CS502');
  } catch (error) {
    restoreBackups();
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
