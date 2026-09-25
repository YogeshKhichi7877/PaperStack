/* PaperStack Feature #2.2 - Subject Resolution Collision Hotfix */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PATCH_ROOT = __dirname;
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-02.2-original');
const FILES = [
  'server/services/subjectService.js',
  'server/services/subjectService.test.js',
  'server/services/subjectPageService.js',
  'server/services/subjectPageService.test.js',
];

function fail(message) { throw new Error(`[Feature #2.2] ${message}`); }

for (const relative of FILES) {
  const source = path.join(PATCH_ROOT, relative);
  const target = path.join(ROOT, relative);
  const backup = path.join(BACKUP_ROOT, relative);
  if (!fs.existsSync(source)) fail(`Patch file missing: ${relative}`);
  if (!fs.existsSync(target)) fail(`PaperStack file missing: ${relative}. Apply Features #1 and #2 first.`);
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`UPDATED: ${relative}`);
}

console.log('\nFeature #2.2 applied successfully.');
console.log('IMPORTANT: rerun the idempotent resource migration after tests pass so any previously misclassified resources are repaired.');
