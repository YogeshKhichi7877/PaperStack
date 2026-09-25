const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-02-original');
const originals = [
  'client/src/App.js',
  'server/routes/resourceRoutes.js',
  'server/package.json',
];
const created = [
  'client/src/pages/SubjectPage.js',
  'client/src/pages/SubjectPage.css',
  'client/src/services/resourceApi.js',
  'client/src/utils/subjectRoute.js',
  'server/services/subjectPageService.js',
  'server/services/subjectPageService.test.js',
];

if (!fs.existsSync(BACKUP_ROOT)) {
  console.error('Feature #2 backup folder was not found. Rollback aborted.');
  process.exit(1);
}

originals.forEach((relative) => {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(backup, target);
    console.log(`Restored ${relative}`);
  }
});

created.forEach((relative) => {
  const target = path.join(ROOT, relative);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
    console.log(`Removed ${relative}`);
  }
});

console.log('\nFeature #2 rollback complete.');
