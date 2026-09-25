const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-02.1-original');
const FILES = [
  'server/services/subjectPageService.js',
  'server/services/subjectPageService.test.js',
  'client/src/utils/subjectRoute.js',
];

let restored = 0;
for (const relative of FILES) {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(backup, target);
    console.log(`RESTORED: ${relative}`);
    restored += 1;
  }
}

if (!restored) {
  console.error('No Feature #2.1 backups were found.');
  process.exit(1);
}
console.log('\nFeature #2.1 rollback complete.');
