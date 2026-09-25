const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
let failed = false;

function read(relative) {
  const file = path.join(ROOT, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function check(label, condition) {
  if (condition) console.log(`PASS: ${label}`);
  else {
    console.error(`FAIL: ${label}`);
    failed = true;
  }
}

const resolver = read('server/services/subjectPageService.js');
const routeHelper = read('client/src/utils/subjectRoute.js');
const tests = read('server/services/subjectPageService.test.js');

check('backend uses shared resolveSubject', resolver.includes('resolveSubject'));
check('backend strips legacy trailing subject codes', resolver.includes('stripLegacyDisplaySuffix'));
check('frontend strips legacy trailing subject codes', routeHelper.includes('stripLegacySubjectSuffix'));
check('Data Science legacy regression test exists', tests.includes("Data Science (DS)"));
check('Computer Graphics legacy regression test exists', tests.includes("Computer Graphics (CG)"));
check('Cloud Computing legacy regression test exists', tests.includes("Cloud Computing (CC)"));

if (failed) {
  console.error('\nFeature #2.1 verification failed.');
  process.exit(1);
}
console.log('\nFeature #2.1 verification passed.');
