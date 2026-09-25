const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = process.cwd();

const checks = [
  ['server/services/smartContributionService.js', 'analyzeContributionFile'],
  ['server/services/freeAiMetadataService.js', 'gemini-3.5-flash-lite'],
  ['server/routes/smartContributionRoutes.js', "router.post('/analyze'"],
  ['client/src/services/contributionApi.js', '/api/contributions/analyze'],
  ['client/src/components/SmartPaperUpload.js', 'Smart detection'],
  ['client/src/components/SmartPaperUpload.css', '.smart-upload-dropzone'],
  ['server/index.js', "createSmartContributionRouter({ authenticate })"],
  ['client/src/App.js', '<SmartPaperUpload'],
  ['client/src/App.js', "subjectCode: queryParams.get('subjectCode') || ''"],
  ['server/.env.example', 'SMART_AI_MIN_CONFIDENCE=82'],
];

let failed = false;
for (const [relative, needle] of checks) {
  const file = path.join(ROOT, relative);
  const ok = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${relative} -> ${needle}`);
  if (!ok) failed = true;
}

for (const relative of [
  'server/routes/smartContributionRoutes.js',
  'server/services/smartContributionService.js',
  'server/services/freeAiMetadataService.js',
]) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, relative)], { stdio: 'pipe' });
    console.log(`PASS: syntax ${relative}`);
  } catch (error) {
    console.log(`FAIL: syntax ${relative}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nFeature #3 verification failed. Do not continue to deployment.');
  process.exit(1);
}
console.log('\nFeature #3 structural verification passed.');
