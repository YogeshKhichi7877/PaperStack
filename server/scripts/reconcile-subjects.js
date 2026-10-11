require('dotenv').config();

const mongoose = require('mongoose');
const { connectScriptDatabase, disconnectQuietly } = require('../utils/scriptDatabase');
const { FLAT_SUBJECT_CATALOG, normalizeSubjectCode, normalizeSubjectText } = require('../services/subjectService');

const APPLY = process.argv.includes('--apply');
const TARGETS = [
  ['papers', 'subjectCode', 'subject'], ['questions', 'subjectCode', 'subject'],
  ['resources', 'subjectCode', 'subjectName'], ['privatestudyresources', 'subjectCode', 'subjectName'],
  ['dailylearningcheckins', 'subjectCode', 'subjectName'], ['practicesessions', 'subjectCode', 'subjectName'],
  ['learningtutorsessions', 'subjectCode', 'subjectName'], ['generatedmocks', 'subjectCode', 'subjectName'],
  ['usertopicmasteries', 'subjectCode', 'subjectName'], ['usernotes', 'subjectCode', 'topicName'],
];

function buildIndexes(catalog = FLAT_SUBJECT_CATALOG) {
  const byCode = new Map();
  const byName = new Map();
  for (const subject of catalog) {
    byCode.set(normalizeSubjectCode(subject.code), subject);
    for (const alias of [subject.name, ...(subject.aliases || [])]) {
      const key = normalizeSubjectText(alias);
      if (!key) continue;
      const values = byName.get(key) || [];
      if (!values.some((item) => item.code === subject.code)) values.push(subject);
      byName.set(key, values);
    }
  }
  return { byCode, byName };
}

function planSubjectUpdate(document, codeField = 'subjectCode', nameField = 'subject', indexes = buildIndexes()) {
  const rawCode = String(document?.[codeField] || '').trim();
  const rawName = String(document?.[nameField] || '').trim();
  const normalizedCode = normalizeSubjectCode(rawCode);
  if (normalizedCode) {
    const canonical = indexes.byCode.get(normalizedCode);
    const update = {};
    if (rawCode !== normalizedCode) update[codeField] = normalizedCode;
    if (canonical && nameField !== 'topicName' && rawName !== canonical.name) update[nameField] = canonical.name;
    return { status: canonical ? 'safe' : 'unknown-code', canonical: canonical || null, update };
  }
  const matches = indexes.byName.get(normalizeSubjectText(rawName)) || [];
  if (matches.length !== 1) return { status: matches.length > 1 ? 'ambiguous-name' : 'unresolved', canonical: null, update: {} };
  const canonical = matches[0];
  return { status: 'safe', canonical, update: { [codeField]: canonical.code, ...(nameField === 'topicName' ? {} : { [nameField]: canonical.name }) } };
}

async function reconcileCollection(collection, codeField, nameField, summary) {
  const operations = [];
  const cursor = collection.find({ $or: [{ [codeField]: { $exists: true, $ne: '' } }, { [nameField]: { $exists: true, $ne: '' } }] }, { projection: { [codeField]: 1, [nameField]: 1 } });
  for await (const document of cursor) {
    summary.scanned += 1;
    const plan = planSubjectUpdate(document, codeField, nameField);
    summary.statuses[plan.status] = (summary.statuses[plan.status] || 0) + 1;
    if (plan.status !== 'safe' || !Object.keys(plan.update).length) continue;
    summary.proposed += 1;
    operations.push({ updateOne: { filter: { _id: document._id }, update: { $set: plan.update } } });
    if (APPLY && operations.length >= 500) { await collection.bulkWrite(operations, { ordered: false }); summary.applied += operations.length; operations.length = 0; }
  }
  if (APPLY && operations.length) { await collection.bulkWrite(operations, { ordered: false }); summary.applied += operations.length; }
}

async function main() {
  await connectScriptDatabase();
  const summary = { mode: APPLY ? 'apply' : 'dry-run', canonicalSubjects: FLAT_SUBJECT_CATALOG.length, knownAliases: FLAT_SUBJECT_CATALOG.reduce((sum, item) => sum + item.aliases.length, 0), scanned: 0, proposed: 0, duplicates: 0, applied: 0, statuses: {}, collections: [] };
  const existing = new Set((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  for (const [name, codeField, nameField] of TARGETS) {
    if (!existing.has(name)) continue;
    const before = summary.scanned;
    await reconcileCollection(mongoose.connection.db.collection(name), codeField, nameField, summary);
    summary.collections.push({ name, scanned: summary.scanned - before });
  }
  summary.duplicates = summary.proposed;
  console.log(JSON.stringify(summary, null, 2));
  await disconnectQuietly();
}

if (require.main === module) main().catch(async (error) => { console.error(error.message); await disconnectQuietly(); process.exitCode = 1; });

module.exports = { buildIndexes, planSubjectUpdate };
