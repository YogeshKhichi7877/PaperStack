const Contribution = require('../models/Contribution');
const QuestionSolution = require('../models/QuestionSolution');
const PaperVerification = require('../models/PaperVerification');

const {
  buildBranchCompetition,
} = require('./branchCompetitionMetrics');

async function getBranchCompetition(period = '30d') {
  const [
    contributions,
    solutions,
    verifications,
  ] = await Promise.all([
    Contribution.find({
      status: 'approved',
    })
      .select(
        'contributorUserId contributorName branch status approvedAt updatedAt createdAt'
      )
      .lean(),

    QuestionSolution.find({
      status: 'approved',
    })
      .select(
        'authorUserId authorName questionId status approvedAt updatedAt createdAt'
      )
      .populate(
        'questionId',
        'branch'
      )
      .lean(),

    PaperVerification.find({})
      .select(
        'paperId userId createdAt'
      )
      .populate(
        'paperId',
        'branch'
      )
      .populate(
        'userId',
        'username'
      )
      .lean(),
  ]);

  const normalizedSolutions = solutions.map((item) => ({
    ...item,
    branch: item.questionId?.branch || '',
  }));

  const normalizedVerifications = verifications.map((item) => ({
    ...item,
    branch: item.paperId?.branch || '',
    userId: item.userId?._id || item.userId || '',
    userName: item.userId?.username || 'Verifier',
  }));

  return buildBranchCompetition({
    period,
    contributions,
    solutions: normalizedSolutions,
    verifications: normalizedVerifications,
  });
}

module.exports = {
  getBranchCompetition,
};
