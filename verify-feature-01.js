const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
let failed = false;

function check(label, condition) {
  if (condition) console.log(`PASS  ${label}`);
  else {
    console.error(`FAIL  ${label}`);
    failed = true;
  }
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

const required = [
  'server/data/resourceTypes.js',
  'server/models/Resource.js',
  'server/plugins/paperResourceSync.js',
  'server/routes/resourceRoutes.js',
  'server/scripts/backfillResources.js',
  'server/services/resourceMapper.js',
  'server/services/resourceService.js',
  'server/services/subjectService.js',
];

required.forEach((file) => check(`exists: ${file}`, fs.existsSync(path.join(ROOT, file))));

const serverIndex = read('server/index.js');
const paperModel = read('server/models/Paper.js');
const pkg = JSON.parse(read('server/package.json'));

check('resource routes registered', serverIndex.includes("app.use('/api/resources', resourceRoutes);"));
check('paper saves auto-sync into resources', paperModel.includes('paperSchema.plugin(paperResourceSyncPlugin);'));
check('view counter mirrors to resource', serverIndex.includes("incrementResourceStatForPaper(req.params.id, 'views')"));
check('download counter mirrors to resource', serverIndex.includes("incrementResourceStatForPaper(req.params.id, 'downloads')"));
check('resource dry-run migration script registered', pkg.scripts?.['migrate:resources:dry'] === 'node scripts/backfillResources.js --dry-run');
check('resource migration script registered', pkg.scripts?.['migrate:resources'] === 'node scripts/backfillResources.js');

for (const file of required) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'pipe' });
    check(`syntax: ${file}`, true);
  } catch (_) {
    check(`syntax: ${file}`, false);
  }
}

if (failed) process.exit(1);
console.log('\nFeature #1 structural verification passed.');
