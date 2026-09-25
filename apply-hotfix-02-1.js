/*
 * PaperStack Feature #2.1 - Legacy Subject Alias Hotfix
 * Run from PaperStack repository root:
 *   node apply-hotfix-02-1.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PATCH_ROOT = __dirname;
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-02.1-original');

const FILES = [
  'server/services/subjectPageService.js',
  'server/services/subjectPageService.test.js',
  'client/src/utils/subjectRoute.js',
];

function fail(message) {
  throw new Error(`[Feature #2.1] ${message}`);
}

function copyWithBackup(relative) {
  const source = path.join(PATCH_ROOT, relative);
  const target = path.join(ROOT, relative);
  const backup = path.join(BACKUP_ROOT, relative);

  if (!fs.existsSync(source)) fail(`Patch file missing: ${relative}`);
  if (!fs.existsSync(target)) fail(`PaperStack file missing: ${relative}. Apply Feature #2 first.`);

  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`UPDATED: ${relative}`);
}

try {
  FILES.forEach(copyWithBackup);
  console.log('\nFeature #2.1 subject alias hotfix applied successfully.');
  console.log('Next:');
  console.log('  1. node .\\verify-hotfix-02-1.js');
  console.log('  2. cd server && npm test');
  console.log('  3. restart backend + frontend');
  console.log('  4. open /subject/Data%20Science%20(DS) again');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
