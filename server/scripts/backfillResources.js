require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const { buildQuestionPaperResource, buildSolutionResource } = require('../services/resourceMapper');
const { syncResourceFromPaper } = require('../services/resourceService');

const DRY_RUN = process.argv.includes('--dry-run');
const DB_NAME = process.env.MONGODB_DB_NAME || 'PaperStack';
const CONNECT_TIMEOUT_MS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 15000);
const FALLBACK_DNS = ['8.8.8.8', '1.1.1.1'];

function isSrvUri(uri = '') {
  return String(uri).trim().toLowerCase().startsWith('mongodb+srv://');
}

function isDnsError(error) {
  const message = String(error?.message || error || '');
  return /querySrv|ECONNREFUSED|ENOTFOUND|ETIMEOUT|ESERVFAIL|EREFUSED|dns/i.test(message);
}

async function resetMongooseConnection() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (_) {
    // A failed connection attempt can already be disconnected; safe to ignore.
  }
}

async function connectOnce(uri, label) {
  console.log(`Connecting to MongoDB (${label})...`);
  await mongoose.connect(uri, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
  console.log(`MongoDB connected successfully (${label}).`);
}

async function connectMongoForMigration() {
  const srvUri = String(process.env.MONGODB_URI || '').trim();
  const standardUri = String(process.env.MONGODB_URI_STANDARD || '').trim();

  if (!srvUri && !standardUri) {
    throw new Error('MONGODB_URI is missing from server/.env');
  }

  // A non-SRV Atlas connection string avoids SRV DNS entirely, so prefer it
  // when the user has configured one explicitly.
  if (standardUri) {
    try {
      await connectOnce(standardUri, 'standard URI');
      return;
    } catch (error) {
      await resetMongooseConnection();
      console.warn(`Standard MongoDB URI failed: ${error.message}`);
      if (!srvUri) throw error;
      console.warn('Falling back to MONGODB_URI...');
    }
  }

  // First try the machine/network DNS configuration. This is ideal when it works.
  try {
    await connectOnce(srvUri, 'system DNS');
    return;
  } catch (error) {
    await resetMongooseConnection();

    if (!isSrvUri(srvUri) || !isDnsError(error)) {
      throw error;
    }

    console.warn(`MongoDB SRV lookup failed with system DNS: ${error.message}`);
  }

  // PaperStack's normal server already uses this fallback on networks where
  // Windows/ISP DNS has trouble resolving MongoDB Atlas SRV records.
  const originalDnsServers = dns.getServers();
  try {
    dns.setServers(FALLBACK_DNS);
    console.log(`Retrying MongoDB SRV lookup with fallback DNS: ${FALLBACK_DNS.join(', ')}`);
    await connectOnce(srvUri, 'fallback DNS');
  } catch (error) {
    await resetMongooseConnection();

    const guidance = [
      'MongoDB Atlas SRV DNS lookup still failed.',
      'Your resource migration code is valid, but this network cannot currently resolve the mongodb+srv SRV record.',
      'Option 1: retry on a different network/hotspot.',
      'Option 2 (recommended fallback): add MONGODB_URI_STANDARD to server/.env using an Atlas non-SRV/standard connection string, then rerun the migration.',
      `Original error: ${error.message}`,
    ].join('\n');

    const wrapped = new Error(guidance);
    wrapped.cause = error;
    throw wrapped;
  } finally {
    try {
      if (originalDnsServers?.length) dns.setServers(originalDnsServers);
    } catch (_) {
      // One-shot migration process; restoring DNS is best effort only.
    }
  }
}

async function main() {
  await connectMongoForMigration();

  const papers = await Paper.find().lean();
  let questionPapers = 0;
  let solutions = 0;
  let failed = 0;

  for (const paper of papers) {
    try {
      const mappedPaper = buildQuestionPaperResource(paper);
      const mappedSolution = buildSolutionResource(paper);
      if (mappedPaper) questionPapers += 1;
      if (mappedSolution) solutions += 1;
      if (!DRY_RUN) await syncResourceFromPaper(paper);
    } catch (error) {
      failed += 1;
      console.error(`Failed for paper ${paper._id}:`, error.message);
    }
  }

  console.log(JSON.stringify({
    mode: DRY_RUN ? 'dry-run' : 'write',
    papersRead: papers.length,
    questionPaperResources: questionPapers,
    solutionResources: solutions,
    totalResourcesExpected: questionPapers + solutions,
    failed,
  }, null, 2));

  await mongoose.disconnect();
  if (failed) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error('\nResource backfill failed:\n' + error.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
