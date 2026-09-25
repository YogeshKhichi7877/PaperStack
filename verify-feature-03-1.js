const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const checks = [
  ['client/src/App.js', "const [uploadMode, setUploadMode] = useState('smart')"],
  ['client/src/App.js', 'Initially, this is all you need to provide.'],
  ['client/src/App.js', 'Manual Upload'],
  ['client/src/App.js', 'Review detected details'],
  ['client/src/App.js', 'handleManualPaperSelection'],
  ['client/src/App.js', '<SmartPaperUpload'],
  ['client/src/components/SmartPaperUpload.js', 'Upload your question paper'],
  ['client/src/components/SmartPaperUpload.js', 'Detection complete'],
  ['client/src/components/SmartPaperUpload.css', '.contribution-mode-switch'],
  ['client/src/components/SmartPaperUpload.css', '.contribution-details-panel'],
];

let failed = false;
for (const [relative, marker] of checks) {
  const file = path.join(ROOT, relative);
  const ok = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(marker);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${relative} -> ${marker}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nFeature #3.1 verification failed.');
  process.exit(1);
}
console.log('\nFeature #3.1 structural verification passed.');
