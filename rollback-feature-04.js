const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-04-original');
const centralFiles = ['server/index.js', 'server/package.json', 'client/src/App.js'];
const addedFiles = [
  'server/utils/contributorXp.js',
  'server/utils/contributorXp.test.js',
  'server/services/contributorProfileService.js',
  'server/routes/contributorProfileRoutes.js',
  'client/src/services/contributorApi.js',
  'client/src/pages/ContributorLeaderboardPage.js',
  'client/src/pages/ContributorProfilePage.js',
  'client/src/pages/ContributorPages.css',
];

let restored = 0;
for (const relative of centralFiles) {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(backup, target);
    restored += 1;
  }
}

for (const relative of addedFiles) {
  const target = path.join(ROOT, relative);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}

console.log(`Feature #4 rollback complete. Restored ${restored} central file(s).`);
console.log('No database rollback is needed because Feature #4 creates no collections or migrations.');
