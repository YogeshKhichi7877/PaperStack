const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const checks = [];

function check(label, condition) {
  checks.push({ label, ok: Boolean(condition) });
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

try {
  const server = read('server/index.js');
  const client = read('client/src/App.js');
  const pkg = JSON.parse(read('server/package.json'));
  const gitignore = read('.gitignore');

  check('server imports shared auth middleware', server.includes("require('./middleware/auth')"));
  check('server imports shared CSV parser', server.includes("require('./utils/csv')"));
  check('server imports analytics helper', server.includes("require('./utils/analytics')"));
  check('server imports semester-pack query helper', server.includes("require('./utils/paperQuery')"));
  check('subject catalog API is registered', server.includes("app.use('/api/catalog', catalogRoutes)"));
  check('fake contributor fallback removed', !server.includes('totalContributors.length || 5'));
  check('most-active and hardest subject are separated', server.includes('mostActiveSubject:') && server.includes('hardestSubject,'));
  check('semester pack uses branch-aware query helper', server.includes('buildSemesterPackQuery({ branch, semester, examType })'));
  check('client uses centralized config', client.includes("from './config/appConfig'"));
  check('client uses centralized auth headers', client.includes("from './services/authHeaders'"));
  check('analytics UI reads mostActiveSubject', client.includes('analyticsData.mostActiveSubject'));
  check('server test script installed', String(pkg.scripts?.test || '').includes('node --test'));
  check('feature backup directory is gitignored', gitignore.includes('.paperstack-backups/'));

  execFileSync(process.execPath, ['--check', path.join(root, 'server', 'index.js')], { stdio: 'pipe' });
  check('server/index.js syntax', true);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const failed = checks.filter((item) => !item.ok);
checks.forEach((item) => console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.label}`));

if (failed.length) {
  console.error(`\n${failed.length} verification check(s) failed.`);
  process.exit(1);
}

console.log('\nFeature #0 structural verification passed.');
