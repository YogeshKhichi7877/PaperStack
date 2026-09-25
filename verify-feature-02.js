const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
let failed = false;

function check(label, condition) {
  if (condition) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed = true; }
}

function read(relative) {
  const file = path.join(ROOT, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const app = read('client/src/App.js');
const routes = read('server/routes/resourceRoutes.js');
const pkgText = read('server/package.json');
const page = read('client/src/pages/SubjectPage.js');
const resolver = read('server/services/subjectPageService.js');

check('SubjectPage component exists', Boolean(page));
check('SubjectPage CSS exists', fs.existsSync(path.join(ROOT, 'client/src/pages/SubjectPage.css')));
check('resource API client exists', fs.existsSync(path.join(ROOT, 'client/src/services/resourceApi.js')));
check('subject route helper exists', fs.existsSync(path.join(ROOT, 'client/src/utils/subjectRoute.js')));
check('App imports SubjectPage', app.includes("import SubjectPage from './pages/SubjectPage';"));
check('App exposes /subject/:subjectKey', app.includes('path="/subject/:subjectKey"'));
check('paper cards link to Subject Hub', app.includes('navigate(getSubjectHubPath(paper))'));
check('Exam Mode reads URL query params', app.includes("examModeParams.get('subject')"));
check('resource API resolves subject aliases', routes.includes('resolveResourceSubjectKey'));
check('resource view endpoint exists', routes.includes("router.post('/:id/view'"));
check('resource download endpoint exists', routes.includes("router.post('/:id/download'"));
check('subject resolver handles catalog aliases', resolver.includes('FLAT_SUBJECT_CATALOG'));

try {
  const pkg = JSON.parse(pkgText);
  check('Feature #2 resolver test is registered', String(pkg.scripts?.test || '').includes('services/subjectPageService.test.js'));
} catch {
  check('server/package.json parses', false);
}

if (failed) {
  console.error('\nFeature #2 verification failed.');
  process.exit(1);
}
console.log('\nFeature #2 structural verification passed.');
