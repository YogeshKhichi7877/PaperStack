require('dotenv').config();

const {
  connectScriptDatabase,
  disconnectQuietly,
} = require('../utils/scriptDatabase');
const {
  extractPaperQuestions,
  extractQuestionBatch,
} = require('../services/questionExtractionService');

function args() {
  const values = process.argv.slice(2);
  const result = {
    paperId: '',
    all: false,
    limit: 5,
    force: false,
    allowAi: false,
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === '--paper') {
      result.paperId = String(values[index + 1] || '');
      index += 1;
    } else if (value === '--all') {
      result.all = true;
    } else if (value === '--limit') {
      result.limit = Number(values[index + 1] || 5);
      index += 1;
    } else if (value === '--force') {
      result.force = true;
    } else if (value === '--ai') {
      result.allowAi = true;
    }
  }

  return result;
}

async function main() {
  const options = args();

  if (!options.paperId && !options.all) {
    console.log('Usage:');
    console.log('  node scripts/extract-questions.js --paper <paperId> [--force] [--ai]');
    console.log('  node scripts/extract-questions.js --all [--limit 5] [--force] [--ai]');
    process.exitCode = 1;
    return;
  }

  try {
    await connectScriptDatabase();

    if (options.paperId) {
      const result = await extractPaperQuestions({
        paperId: options.paperId,
        force: options.force,
        allowAi: options.allowAi,
      });

      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const result = await extractQuestionBatch({
      limit: options.limit,
      force: options.force,
      allowAi: options.allowAi,
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await disconnectQuietly();
  }
}

main().catch(async (error) => {
  console.error(error.stack || error.message || error);
  await disconnectQuietly();
  process.exit(1);
});
