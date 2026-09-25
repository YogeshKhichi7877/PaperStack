const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-03-original');
const PATCH_FILES = [
  'server/services/smartContributionService.js',
  'server/services/freeAiMetadataService.js',
  'server/services/smartContributionService.test.js',
  'server/services/freeAiMetadataService.test.js',
  'server/routes/smartContributionRoutes.js',
  'client/src/services/contributionApi.js',
  'client/src/components/SmartPaperUpload.js',
  'client/src/components/SmartPaperUpload.css',
];
const PATCHED = ['server/index.js', 'server/package.json', 'server/.env.example', 'client/src/App.js'];

if (!fs.existsSync(BACKUP_ROOT)) {
  console.error('Feature #3 backup folder not found.');
  process.exit(1);
}

for (const relative of PATCHED) {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(backup, target);
    console.log(`RESTORED: ${relative}`);
  }
}

for (const relative of PATCH_FILES) {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, target);
  } else if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    console.log(`REMOVED: ${relative}`);
  }
}

console.log('\nFeature #3 rollback complete.');
