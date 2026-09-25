const fs = require('fs');
const path = require('path');

const packageRoot = __dirname;
const repoRoot = process.cwd();
const clientDir = path.join(repoRoot, 'client');
const serverDir = path.join(repoRoot, 'server');

if (!fs.existsSync(clientDir) || !fs.existsSync(serverDir)) {
  console.error('Run this command from the PaperStack repository root (the folder containing client/ and server/).');
  process.exit(1);
}

const source = path.join(packageRoot, 'server', 'scripts', 'backfillResources.js');
const target = path.join(serverDir, 'scripts', 'backfillResources.js');
const backupDir = path.join(repoRoot, '.paperstack-backups', 'feature-01.1');
fs.mkdirSync(backupDir, { recursive: true });

if (fs.existsSync(target)) {
  fs.copyFileSync(target, path.join(backupDir, 'backfillResources.js'));
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);

const envExample = path.join(serverDir, '.env.example');
if (fs.existsSync(envExample)) {
  let content = fs.readFileSync(envExample, 'utf8');
  if (!/^MONGODB_URI_STANDARD=/m.test(content)) {
    if (!content.endsWith('\n')) content += '\n';
    content += '\n# Optional non-SRV fallback if your network blocks MongoDB Atlas SRV DNS lookups.\nMONGODB_URI_STANDARD=\n';
    fs.writeFileSync(envExample, content);
  }
}

console.log('Feature #1.1 MongoDB DNS hotfix applied successfully.');
console.log('Next: cd server && npm run migrate:resources:dry');
