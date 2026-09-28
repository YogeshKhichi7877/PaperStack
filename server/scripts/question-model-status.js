require('dotenv').config();

const Paper = require('../models/Paper');
const Question = require('../models/Question');
const {
  connectScriptDatabase,
  disconnectQuietly,
} = require('../utils/scriptDatabase');

async function main() {
  try {
    await connectScriptDatabase();

    const [
      papers,
      questions,
      papersWithQuestions,
      extractionStates,
    ] = await Promise.all([
      Paper.countDocuments({}),
      Question.countDocuments({ status: { $ne: 'rejected' } }),
      Question.distinct('paperId', { status: { $ne: 'rejected' } }),
      Paper.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$questionExtractionStatus', 'not_started'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    console.log('\nPaperStack Question Model Status');
    console.log('-------------------------------');
    console.log(`Papers: ${papers}`);
    console.log(`Questions: ${questions}`);
    console.log(`Papers with questions: ${papersWithQuestions.length}`);
    console.log('Schema version: question-v1');
    console.log('Extraction version: question-extract-v1');
    console.log('\nExtraction states:');

    extractionStates.forEach((item) => {
      console.log(`  ${item._id}: ${item.count}`);
    });
  } finally {
    await disconnectQuietly();
  }
}

main().catch(async (error) => {
  console.error('\nQuestion model status failed.');
  console.error(error.code || error.message || error);
  await disconnectQuietly();
  process.exit(1);
});
