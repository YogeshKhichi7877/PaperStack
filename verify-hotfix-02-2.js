const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const checks = [
  ['server/services/subjectService.js', 'short-code collision protection', 'never participate in substring matching'],
  ['server/services/subjectPageService.js', 'cleaned legacy label first', '? [cleaned, raw]'],
  ['server/services/subjectService.test.js', 'Computer Graphics collision regression', 'does not collide with short code IC'],
  ['server/services/subjectPageService.test.js', 'legacy CG regression', 'Computer Graphics (CG)'],
];

let failed = 0;
for (const [relative, label, needle] of checks) {
  const file = path.join(ROOT, relative);
  const ok = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log('\nFeature #2.2 structural verification passed.');
