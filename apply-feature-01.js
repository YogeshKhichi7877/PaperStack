/*
 * PaperStack Feature #1 - Unified Subject + Resource Architecture
 * Run from the PaperStack repository root AFTER Feature #0:
 *   node apply-feature-01.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const SERVER_INDEX = path.join(ROOT, 'server', 'index.js');
const SERVER_PACKAGE = path.join(ROOT, 'server', 'package.json');
const PAPER_MODEL = path.join(ROOT, 'server', 'models', 'Paper.js');
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-01-original');

function fail(message) {
  throw new Error(`[Feature #1] ${message}`);
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

function patchServerIndex(original) {
  let source = original;

  if (!source.includes("const catalogRoutes = require('./routes/catalogRoutes');")) {
    fail('Feature #0 does not appear to be applied. Run Feature #0 first.');
  }

  source = insertAfterOnce(
    source,
    "const catalogRoutes = require('./routes/catalogRoutes');",
    `\nconst resourceRoutes = require('./routes/resourceRoutes');\nconst { incrementResourceStatForPaper } = require('./services/resourceService');`,
    'resource imports'
  );

  source = insertAfterOnce(
    source,
    "app.use('/api/catalog', catalogRoutes);",
    `\napp.use('/api/resources', resourceRoutes);`,
    'resource route registration'
  );

  const viewAnchor = "    await Paper.findByIdAndUpdate(req.params.id, { $inc: { views: 1 }, updatedAt: new Date() });";
  source = insertAfterOnce(
    source,
    viewAnchor,
    `\n    incrementResourceStatForPaper(req.params.id, 'views').catch((error) => {\n      console.warn('[PaperStack Resource Sync] view counter sync failed:', error.message);\n    });`,
    'resource view stat mirror'
  );

  const downloadAnchor = "    await Paper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 }, updatedAt: new Date() });";
  source = insertAfterOnce(
    source,
    downloadAnchor,
    `\n    incrementResourceStatForPaper(req.params.id, 'downloads').catch((error) => {\n      console.warn('[PaperStack Resource Sync] download counter sync failed:', error.message);\n    });`,
    'resource download stat mirror'
  );

  return source;
}

function patchPaperModel(original) {
  let source = original;

  source = insertAfterOnce(
    source,
    "const mongoose = require('mongoose');",
    `\nconst paperResourceSyncPlugin = require('../plugins/paperResourceSync');`,
    'paper resource plugin import'
  );

  source = insertBeforeOnce(
    source,
    "module.exports = mongoose.model('Paper', paperSchema, 'paper');",
    `paperSchema.plugin(paperResourceSyncPlugin);\n\n`,
    'paper resource plugin registration'
  );

  return source;
}

function patchServerPackage(original) {
  const pkg = JSON.parse(original);
  const baseTests = [
    'middleware/auth.test.js',
    'utils/csv.test.js',
    'utils/analytics.test.js',
    'utils/paperQuery.test.js',
    'services/subjectService.test.js',
    'services/resourceMapper.test.js',
  ];

  pkg.scripts = {
    ...(pkg.scripts || {}),
    test: `node --test ${baseTests.join(' ')}`,
    'migrate:resources:dry': 'node scripts/backfillResources.js --dry-run',
    'migrate:resources': 'node scripts/backfillResources.js',
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function verifyFeatureFiles() {
  const required = [
    'server/data/resourceTypes.js',
    'server/models/Resource.js',
    'server/plugins/paperResourceSync.js',
    'server/routes/resourceRoutes.js',
    'server/scripts/backfillResources.js',
    'server/services/resourceMapper.js',
    'server/services/resourceMapper.test.js',
    'server/services/resourceService.js',
    'server/services/subjectService.js',
    'server/services/subjectService.test.js',
  ];

  required.forEach((file) => requireFile(path.join(ROOT, file)));
}

function syntaxCheck(relativePath) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, relativePath)], { stdio: 'pipe' });
}

function restoreBackups() {
  for (const filePath of [SERVER_INDEX, SERVER_PACKAGE, PAPER_MODEL]) {
    const backup = path.join(BACKUP_ROOT, path.relative(ROOT, filePath));
    if (fs.existsSync(backup)) fs.copyFileSync(backup, filePath);
  }
}

function main() {
  requireFile(SERVER_INDEX);
  requireFile(SERVER_PACKAGE);
  requireFile(PAPER_MODEL);
  verifyFeatureFiles();

  [SERVER_INDEX, SERVER_PACKAGE, PAPER_MODEL].forEach(backupFile);

  const serverOriginal = fs.readFileSync(SERVER_INDEX, 'utf8');
  const packageOriginal = fs.readFileSync(SERVER_PACKAGE, 'utf8');
  const paperOriginal = fs.readFileSync(PAPER_MODEL, 'utf8');

  try {
    fs.writeFileSync(SERVER_INDEX, patchServerIndex(serverOriginal));
    fs.writeFileSync(SERVER_PACKAGE, patchServerPackage(packageOriginal));
    fs.writeFileSync(PAPER_MODEL, patchPaperModel(paperOriginal));

    [
      'server/index.js',
      'server/models/Paper.js',
      'server/models/Resource.js',
      'server/data/resourceTypes.js',
      'server/plugins/paperResourceSync.js',
      'server/routes/resourceRoutes.js',
      'server/scripts/backfillResources.js',
      'server/services/resourceMapper.js',
      'server/services/resourceService.js',
      'server/services/subjectService.js',
    ].forEach(syntaxCheck);

    console.log('\nFeature #1 applied successfully.');
    console.log('Next:');
    console.log('  1. node .\\verify-feature-01.js');
    console.log('  2. cd server');
    console.log('  3. npm test');
    console.log('  4. npm run migrate:resources:dry');
    console.log('  5. npm run migrate:resources');
    console.log('\nThe backfill is idempotent: running it again updates the same resource records.');
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
