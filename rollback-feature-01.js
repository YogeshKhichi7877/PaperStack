const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-01-original');

const restoredFiles = [
  'server/index.js',
  'server/package.json',
  'server/models/Paper.js',
];

const addedFiles = [
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

for (const relative of restoredFiles) {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (!fs.existsSync(backup)) {
    console.error(`Missing backup: ${backup}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(backup, target);
}

for (const relative of addedFiles) {
  const target = path.join(ROOT, relative);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}

console.log('Feature #1 code rollback completed.');
console.log('Note: Resource documents already backfilled into MongoDB are intentionally NOT deleted.');
