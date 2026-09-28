const mongoose = require('mongoose');
const dns = require('dns');

async function disconnectQuietly() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch {}
}

async function connectScriptDatabase() {
  const standardUri = String(process.env.MONGODB_URI_STANDARD || '').trim();
  const srvUri = String(process.env.MONGODB_URI || '').trim();

  if (!standardUri && !srvUri) {
    throw new Error('MONGODB_URI or MONGODB_URI_STANDARD is required');
  }

  const options = {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 15000),
  };

  if (standardUri) {
    console.log('Connecting with MONGODB_URI_STANDARD...');
    await mongoose.connect(standardUri, options);
    return mongoose.connection;
  }

  try {
    console.log('Connecting with MongoDB SRV URI...');
    await mongoose.connect(srvUri, options);
    return mongoose.connection;
  } catch (firstError) {
    await disconnectQuietly();

    console.warn(
      `Initial MongoDB connection failed: ${firstError.code || firstError.message}`
    );
    console.log('Retrying MongoDB SRV lookup with public DNS...');

    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {}

    await mongoose.connect(srvUri, options);
    return mongoose.connection;
  }
}

module.exports = {
  connectScriptDatabase,
  disconnectQuietly,
};
