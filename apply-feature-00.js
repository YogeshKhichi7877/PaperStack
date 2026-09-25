/*
 * PaperStack Feature #0 - Foundation Refactor + Critical Fixes
 * Run from the PaperStack repository root:
 *   node apply-feature-00.js
 *
 * This script only patches the known main-branch structure audited on 2026-09-25.
 * It creates backups before touching existing files and aborts on missing anchors.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const SERVER_INDEX = path.join(ROOT, 'server', 'index.js');
const SERVER_PACKAGE = path.join(ROOT, 'server', 'package.json');
const CLIENT_APP = path.join(ROOT, 'client', 'src', 'App.js');
const ROOT_GITIGNORE = path.join(ROOT, '.gitignore');
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-00-original');

function fail(message) {
  throw new Error(`[Feature #0] ${message}`);
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

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) fail(`Could not find patch anchor: ${label}`);
  return source.replace(search, replacement);
}

function insertAfterOnce(source, anchor, addition, label) {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) fail(`Could not find insertion anchor: ${label}`);
  return source.replace(anchor, `${anchor}${addition}`);
}

function removeNamedFunction(source, name) {
  const needle = `function ${name}(`;
  let next = source.indexOf(needle);
  let changed = false;

  while (next !== -1) {
    const open = source.indexOf('{', next);
    if (open === -1) fail(`Malformed function while removing ${name}`);

    let depth = 0;
    let end = -1;
    for (let i = open; i < source.length; i += 1) {
      const char = source[i];
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end === -1) fail(`Could not locate end of ${name}`);

    while (end < source.length && (source[end] === '\r' || source[end] === '\n')) end += 1;
    source = source.slice(0, next) + source.slice(end);
    changed = true;
    next = source.indexOf(needle);
  }

  return { source, changed };
}

function patchServerIndex(original) {
  let source = original;

  const modelAnchor = "const PaperVote = require('./models/PaperVote');";
  source = insertAfterOnce(
    source,
    modelAnchor,
    `\nconst { createAuthMiddleware } = require('./middleware/auth');\nconst { parseCsvLine } = require('./utils/csv');\nconst { findHardestSubject } = require('./utils/analytics');\nconst { buildSemesterPackQuery } = require('./utils/paperQuery');\nconst catalogRoutes = require('./routes/catalogRoutes');`,
    'server utility imports'
  );

  const googleClientAnchor = 'const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;';
  source = insertAfterOnce(
    source,
    googleClientAnchor,
    `\nconst { authenticate, authenticateAdmin } = createAuthMiddleware(JWT_SECRET);`,
    'auth middleware initialization'
  );

  for (const fn of ['getBearerToken', 'authenticate', 'authenticateAdmin', 'parseCsvLine']) {
    source = removeNamedFunction(source, fn).source;
  }

  const compressionAnchor = 'app.use(compression());';
  source = insertAfterOnce(
    source,
    compressionAnchor,
    `\napp.use('/api/catalog', catalogRoutes);`,
    'catalog routes registration'
  );

  const contributionStatsAnchor = "    const totalApprovedContributions = await Contribution.countDocuments({ status: 'approved' });";
  if (!source.includes('const difficultyVotes = await PaperVote.find()')) {
    source = insertAfterOnce(
      source,
      contributionStatsAnchor,
      `\n    const difficultyVotes = await PaperVote.find().select('paperId difficulty').lean();\n    const hardestSubject = findHardestSubject(papers, difficultyVotes);`,
      'difficulty analytics'
    );
  }

  if (source.includes('totalContributors: totalContributors.length || 5,')) {
    source = source.replace(
      'totalContributors: totalContributors.length || 5,',
      'totalContributors: totalContributors.length,'
    );
  }

  if (source.includes("hardestSubject: subjects[0]?.subject || '',")) {
    source = source.replace(
      "hardestSubject: subjects[0]?.subject || '',",
      "mostActiveSubject: subjects[0]?.subject || '',\n      hardestSubject,"
    );
  }

  const streamFunction = source.indexOf('async function streamSemesterPack(req, res) {');
  if (streamFunction === -1) fail('streamSemesterPack function not found');

  const queryStartNeedle = "  const branchValue = String(branch || '').trim();";
  const queryStart = source.indexOf(queryStartNeedle, streamFunction);
  const paperQueryAnchor = '  const papers = await Paper.find(query)';
  const queryEnd = source.indexOf(paperQueryAnchor, queryStart);

  if (queryStart !== -1 && queryEnd !== -1) {
    source =
      source.slice(0, queryStart) +
      "  const query = buildSemesterPackQuery({ branch, semester, examType });\n\n" +
      source.slice(queryEnd);
  } else if (!source.includes('const query = buildSemesterPackQuery({ branch, semester, examType });')) {
    fail('semester-pack query block not found');
  }

  return source;
}

function patchClientApp(original) {
  let source = original;

  const componentImport = "import PWAInstallPrompt from './components/PWAInstallPrompt';";
  source = insertAfterOnce(
    source,
    componentImport,
    `\nimport {\n  API_URL,\n  FRONTEND_URL,\n  CONTRIBUTION_EMAIL,\n  GOOGLE_CLIENT_ID,\n  GOOGLE_AUTH_CONFIGURED,\n} from './config/appConfig';\nimport { authHeader, adminHeader } from './services/authHeaders';`,
    'client shared configuration imports'
  );

  const configStart = source.indexOf('const API_URL =');
  const shareFunction = source.indexOf('function getPaperShareUrl(paper) {');
  if (configStart !== -1 && shareFunction !== -1 && configStart < shareFunction) {
    source = source.slice(0, configStart) + source.slice(shareFunction);
  } else if (!source.includes("from './config/appConfig'")) {
    fail('client config block not found');
  }

  source = removeNamedFunction(source, 'authHeader').source;
  source = removeNamedFunction(source, 'adminHeader').source;

  source = source.replace(
    'analyticsData.hardestSubject ||\n    subjectChartData?.[0]?.subject ||',
    'analyticsData.mostActiveSubject ||\n    subjectChartData?.[0]?.subject ||'
  );

  return source;
}

function patchServerPackage(original) {
  const pkg = JSON.parse(original);
  pkg.scripts = {
    ...(pkg.scripts || {}),
    test: 'node --test middleware/auth.test.js utils/csv.test.js utils/analytics.test.js utils/paperQuery.test.js',
    start: (pkg.scripts && pkg.scripts.start) || 'node index.js',
    dev: 'nodemon index.js',
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function verifyNewFiles() {
  const files = [
    'client/src/config/appConfig.js',
    'client/src/services/authHeaders.js',
    'server/middleware/auth.js',
    'server/routes/catalogRoutes.js',
    'server/utils/csv.js',
    'server/utils/analytics.js',
    'server/utils/paperQuery.js',
  ];
  files.forEach((file) => requireFile(path.join(ROOT, file)));
}

function syntaxCheck(file) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

function restoreBackups() {
  for (const filePath of [SERVER_INDEX, SERVER_PACKAGE, CLIENT_APP, ROOT_GITIGNORE]) {
    const relative = path.relative(ROOT, filePath);
    const backup = path.join(BACKUP_ROOT, relative);
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, filePath);
    }
  }
}

function main() {
  requireFile(SERVER_INDEX);
  requireFile(SERVER_PACKAGE);
  requireFile(CLIENT_APP);
  requireFile(ROOT_GITIGNORE);
  verifyNewFiles();

  [SERVER_INDEX, SERVER_PACKAGE, CLIENT_APP, ROOT_GITIGNORE].forEach(backupFile);

  const serverOriginal = fs.readFileSync(SERVER_INDEX, 'utf8');
  const packageOriginal = fs.readFileSync(SERVER_PACKAGE, 'utf8');
  const clientOriginal = fs.readFileSync(CLIENT_APP, 'utf8');
  const gitignoreOriginal = fs.readFileSync(ROOT_GITIGNORE, 'utf8');

  try {
    const serverPatched = patchServerIndex(serverOriginal);
    const packagePatched = patchServerPackage(packageOriginal);
    const clientPatched = patchClientApp(clientOriginal);

    fs.writeFileSync(SERVER_INDEX, serverPatched);
    fs.writeFileSync(SERVER_PACKAGE, packagePatched);
    fs.writeFileSync(CLIENT_APP, clientPatched);

    const backupIgnore = '.paperstack-backups/';
    const gitignorePatched = gitignoreOriginal.includes(backupIgnore)
      ? gitignoreOriginal
      : `${gitignoreOriginal.replace(/\s*$/, '')}\n\n# Local PaperStack patch backups\n${backupIgnore}\n`;
    fs.writeFileSync(ROOT_GITIGNORE, gitignorePatched);

    syntaxCheck(SERVER_INDEX);
    syntaxCheck(path.join(ROOT, 'server', 'middleware', 'auth.js'));
    syntaxCheck(path.join(ROOT, 'server', 'routes', 'catalogRoutes.js'));
    syntaxCheck(path.join(ROOT, 'server', 'utils', 'analytics.js'));
    syntaxCheck(path.join(ROOT, 'server', 'utils', 'csv.js'));
    syntaxCheck(path.join(ROOT, 'server', 'utils', 'paperQuery.js'));

    console.log('\nFeature #0 applied successfully.');
    console.log('Next:');
    console.log('  cd server && npm test');
    console.log('  cd ../client && npm run build');
    console.log('  cd ../server && node --check index.js');
    console.log('\nGit cleanup still recommended:');
    console.log('  git rm -r --cached server/node_modules');
    console.log('  git commit -m "chore: stop tracking server node_modules"');
  } catch (error) {
    restoreBackups();
    console.error('\nFeature #0 patch failed. Original large files were restored.');
    throw error;
  }
}

main();
