const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP = path.join(ROOT, '.paperstack-backups', 'feature-03-1-original');
const files = [
  'client/src/App.js',
  'client/src/components/SmartPaperUpload.js',
  'client/src/components/SmartPaperUpload.css',
];

let restored = 0;
for (const relative of files) {
  const source = path.join(BACKUP, relative);
  const target = path.join(ROOT, relative);
  if (!fs.existsSync(source)) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  restored += 1;
  console.log(`Restored ${relative}`);
}

if (!restored) {
  console.error('No Feature #3.1 backup files were found.');
  process.exit(1);
}
console.log('\nFeature #3.1 rollback completed.');
