const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const checks = [
  ['server/routes/contributorProfileRoutes.js', 'createContributorProfileRoutes'],
  ['server/services/contributorProfileService.js', 'buildContributorProfiles'],
  ['server/utils/contributorXp.js', 'APPROVED_PAPER: 100'],
  ['server/index.js', "app.use('/api/contributors', createContributorProfileRoutes({ authenticate }))"],
  ['server/package.json', 'utils/contributorXp.test.js'],
  ['client/src/services/contributorApi.js', '/api/contributors/leaderboard'],
  ['client/src/pages/ContributorLeaderboardPage.js', 'Contribution XP'],
  ['client/src/pages/ContributorProfilePage.js', 'Approved contributions'],
  ['client/src/pages/ContributorPages.css', '.contributor-profile-hero'],
  ['client/src/App.js', "import ContributorLeaderboardPage from './pages/ContributorLeaderboardPage';"],
  ['client/src/App.js', 'path="/contributors/:contributorId"'],
];

let failed = false;
for (const [relative, needle] of checks) {
  const file = path.join(ROOT, relative);
  const ok = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${relative} -> ${needle}`);
  if (!ok) failed = true;
}

const appSource = fs.readFileSync(path.join(ROOT, 'client/src/App.js'), 'utf8');
const legacyRemoved = !appSource.includes('function ContributorsPage(');
console.log(`${legacyRemoved ? 'PASS' : 'FAIL'}: client/src/App.js -> legacy ContributorsPage removed`);
if (!legacyRemoved) failed = true;

if (failed) {
  console.error('\nFeature #4 verification failed.');
  process.exit(1);
}
console.log('\nFeature #4 structural verification passed.');
