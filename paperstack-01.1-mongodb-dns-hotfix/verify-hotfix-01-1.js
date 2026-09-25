const fs = require('fs');
const path = require('path');

const root = process.cwd();
const file = path.join(root, 'server', 'scripts', 'backfillResources.js');
if (!fs.existsSync(file)) {
  console.error('FAIL: server/scripts/backfillResources.js not found. Run from PaperStack root.');
  process.exit(1);
}
const source = fs.readFileSync(file, 'utf8');
const checks = [
  ['MONGODB_URI_STANDARD fallback', source.includes('MONGODB_URI_STANDARD')],
  ['system DNS first', source.includes("connectOnce(srvUri, 'system DNS')")],
  ['fallback DNS', source.includes('dns.setServers(FALLBACK_DNS)')],
  ['clear DNS failure guidance', source.includes('MongoDB Atlas SRV DNS lookup still failed')],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log('Feature #1.1 verification passed.');
