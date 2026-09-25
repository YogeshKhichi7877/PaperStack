const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-02.2-original');
const FILES = [
  'server/services/subjectService.js',
  'server/services/subjectService.test.js',
  'server/services/subjectPageService.js',
  'server/services/subjectPageService.test.js',
];
let restored = 0;
for (const relative of FILES) {
  const backup = path.join(BACKUP_ROOT, relative);
  const target = path.join(ROOT, relative);
  if (!fs.existsSync(backup)) continue;
  fs.copyFileSync(backup, target);
  console.log(`RESTORED: ${relative}`);
  restored += 1;
}
console.log(`Rollback complete. Restored ${restored} file(s).`);
