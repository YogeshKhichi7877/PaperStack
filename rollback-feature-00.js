const fs = require('fs');
const path = require('path');

const root = process.cwd();
const backupRoot = path.join(root, '.paperstack-backups', 'feature-00-original');
const targets = [
  'server/index.js',
  'server/package.json',
  'client/src/App.js',
  '.gitignore',
];

if (!fs.existsSync(backupRoot)) {
  console.error('Feature #0 backup folder was not found. Nothing was restored.');
  process.exit(1);
}

targets.forEach((relative) => {
  const backup = path.join(backupRoot, relative);
  const target = path.join(root, relative);
  if (!fs.existsSync(backup)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(backup, target);
  console.log(`Restored ${relative}`);
});

console.log('\nLarge files restored. New Feature #0 modules can be deleted manually if desired.');
