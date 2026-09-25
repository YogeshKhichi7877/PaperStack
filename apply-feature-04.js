/*
 * PaperStack Feature #4 - Contributor Profile + XP + Impact
 * Run from repository root AFTER Features #0-#3.1:
 *   node apply-feature-04.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const SERVER_INDEX = path.join(ROOT, 'server', 'index.js');
const SERVER_PACKAGE = path.join(ROOT, 'server', 'package.json');
const CLIENT_APP = path.join(ROOT, 'client', 'src', 'App.js');
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-04-original');

function fail(message) {
  throw new Error(`[Feature #4] ${message}`);
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`Required file missing: ${path.relative(ROOT, filePath)}`);
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

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) fail(`Could not find patch anchor: ${label}`);
  return source.replace(search, replacement);
}

function patchServerIndex(original) {
  let source = original;

  if (!source.includes('createAuthMiddleware') || !source.includes('const { authenticate, authenticateAdmin }')) {
    fail('Feature #0 auth foundation is missing. Apply Feature #0 first.');
  }

  source = insertAfterOnce(
    source,
    "const PaperVote = require('./models/PaperVote');",
    `\nconst { createContributorProfileRoutes } = require('./routes/contributorProfileRoutes');`,
    'contributor routes import'
  );

  source = insertAfterOnce(
    source,
    'app.use(compression());',
    `\napp.use('/api/contributors', createContributorProfileRoutes({ authenticate }));`,
    'contributor profile routes registration'
  );

  return source;
}

function patchServerPackage(original) {
  const pkg = JSON.parse(original);
  const testFile = 'utils/contributorXp.test.js';
  const current = String(pkg.scripts?.test || '').trim();
  pkg.scripts = {
    ...(pkg.scripts || {}),
    test: current.includes(testFile)
      ? current
      : `${current || 'node --test'} ${testFile}`.trim(),
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function patchClientApp(original) {
  let source = original;

  if (!source.includes("from './config/appConfig'")) {
    fail('Feature #0 client foundation is missing.');
  }

  if (source.includes('function ContributorsPage(')) {
    const blockStart = source.includes('function RankBadge(')
      ? source.indexOf('function RankBadge(')
      : source.indexOf('function ContributorsPage(');
    const blockEnd = source.indexOf('// V2 Page: Interactive Contribution Form with Cloudinary Upload', blockStart);
    if (blockStart === -1 || blockEnd === -1) {
      fail('Could not isolate the legacy contributor leaderboard block.');
    }
    source = source.slice(0, blockStart) + source.slice(blockEnd);
  }

  source = insertAfterOnce(
    source,
    "import PWAInstallPrompt from './components/PWAInstallPrompt';",
    `\nimport ContributorLeaderboardPage from './pages/ContributorLeaderboardPage';\nimport ContributorProfilePage from './pages/ContributorProfilePage';`,
    'contributor page imports'
  );

  const oldRoute = '<Route path="/contributors" element={<ContributorsPage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />';
  const newRoutes = `<Route\n                path="/contributors"\n                element={\n                  <div className="app-container">\n                    <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />\n                    <ContributorLeaderboardPage user={user} toast={toast} />\n                    <Footer />\n                  </div>\n                }\n              />\n              <Route\n                path="/contributors/:contributorId"\n                element={\n                  <div className="app-container">\n                    <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />\n                    <ContributorProfilePage user={user} toast={toast} />\n                    <Footer />\n                  </div>\n                }\n              />`;

  if (!source.includes('path="/contributors/:contributorId"')) {
    source = replaceOnce(source, oldRoute, newRoutes, 'contributors route upgrade');
  }

  return source;
}

function syntaxCheck(relativePath) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, relativePath)], { stdio: 'pipe' });
}

function restoreBackups() {
  [SERVER_INDEX, SERVER_PACKAGE, CLIENT_APP].forEach((filePath) => {
    const backup = path.join(BACKUP_ROOT, path.relative(ROOT, filePath));
    if (fs.existsSync(backup)) fs.copyFileSync(backup, filePath);
  });
}

function verifyNewFiles() {
  [
    'server/utils/contributorXp.js',
    'server/utils/contributorXp.test.js',
    'server/services/contributorProfileService.js',
    'server/routes/contributorProfileRoutes.js',
    'client/src/services/contributorApi.js',
    'client/src/pages/ContributorLeaderboardPage.js',
    'client/src/pages/ContributorProfilePage.js',
    'client/src/pages/ContributorPages.css',
  ].forEach((relative) => requireFile(path.join(ROOT, relative)));
}

function main() {
  [SERVER_INDEX, SERVER_PACKAGE, CLIENT_APP].forEach(requireFile);
  verifyNewFiles();
  [SERVER_INDEX, SERVER_PACKAGE, CLIENT_APP].forEach(backupFile);

  try {
    fs.writeFileSync(SERVER_INDEX, patchServerIndex(fs.readFileSync(SERVER_INDEX, 'utf8')));
    fs.writeFileSync(SERVER_PACKAGE, patchServerPackage(fs.readFileSync(SERVER_PACKAGE, 'utf8')));
    fs.writeFileSync(CLIENT_APP, patchClientApp(fs.readFileSync(CLIENT_APP, 'utf8')));

    [
      'server/index.js',
      'server/utils/contributorXp.js',
      'server/utils/contributorXp.test.js',
      'server/services/contributorProfileService.js',
      'server/routes/contributorProfileRoutes.js',
    ].forEach(syntaxCheck);

    console.log('\nFeature #4 applied successfully.');
    console.log('No MongoDB migration is required. XP is calculated from existing data.');
    console.log('\nNext:');
    console.log('  node .\\verify-feature-04.js');
    console.log('  cd server && npm test');
    console.log('  cd ../client && npm run build');
  } catch (error) {
    restoreBackups();
    console.error('\nFeature #4 failed. Patched central files were restored.');
    throw error;
  }
}

main();
