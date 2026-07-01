require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');

// Same DNS fix that your server is using
dns.setServers([
  '8.8.8.8',
  '1.1.1.1',
  '8.8.4.4',
  '1.0.0.1'
]);

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI missing in server/.env');
      process.exit(1);
    }

    console.log('Using custom DNS servers for MongoDB SRV lookup...');
    console.log('Connecting to MongoDB Atlas...');

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000
    });

    console.log('MongoDB connected successfully');

    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();

    console.log('\nCollections found:');
    collections.forEach((collection) => {
      console.log('-', collection.name);
    });

    const collectionName = process.argv[2] || 'paper';

    console.log(`\nReading sample documents from collection: ${collectionName}`);

    const docs = await db
      .collection(collectionName)
      .find({})
      .limit(10)
      .toArray();

    if (!docs.length) {
      console.log(`No documents found in collection: ${collectionName}`);
      await mongoose.disconnect();
      return;
    }

    console.log('\nSample document keys:');
    console.log(Object.keys(docs[0]));

    console.log('\nImportant paper fields:');

    const sample = docs.map((doc) => ({
      _id: String(doc._id),
      title: doc.title,
      subject: doc.subject,
      normalizedSubject: doc.normalizedSubject,
      subjectCode: doc.subjectCode,
      branch: doc.branch,
      semester: doc.semester,
      year: doc.year,
      examType: doc.examType,
      type: doc.type,
      filePath: doc.filePath,
      paperUrl: doc.paperUrl,
      downloads: doc.downloads,
      views: doc.views,
      contributorName: doc.contributorName,
      uploadedBy: doc.uploadedBy,
      status: doc.status,
      createdAt: doc.createdAt
    }));

    console.log(JSON.stringify(sample, null, 2));

    await mongoose.disconnect();
    console.log('\nDone.');
  } catch (error) {
    console.error('\nInspect failed:', error.message);

    console.log('\nTroubleshooting:');
    console.log('1. Make sure your normal server can connect to MongoDB.');
    console.log('2. Check that MONGODB_URI is correct in server/.env.');
    console.log('3. Check MongoDB Atlas Network Access allows your IP or 0.0.0.0/0 for development.');
    console.log('4. If this script still fails but server works, use the temporary API route method.');

    process.exit(1);
  }
}

main();