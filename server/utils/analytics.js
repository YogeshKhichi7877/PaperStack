const DIFFICULTY_WEIGHTS = Object.freeze({
  Easy: 1,
  Medium: 2,
  Hard: 3,
});

function getPaperSubject(paper) {
  return paper?.subject || paper?.normalizedSubject || 'Unknown Subject';
}

function buildDifficultyStats(papers = [], votes = []) {
  const subjectByPaperId = new Map(
    papers.map((paper) => [String(paper._id), getPaperSubject(paper)])
  );
  const subjectStats = new Map();

  votes.forEach((vote) => {
    const subject = subjectByPaperId.get(String(vote.paperId));
    const weight = DIFFICULTY_WEIGHTS[vote.difficulty];
    if (!subject || !weight) return;

    const current = subjectStats.get(subject) || {
      subject,
      voteCount: 0,
      weightedTotal: 0,
    };

    current.voteCount += 1;
    current.weightedTotal += weight;
    subjectStats.set(subject, current);
  });

  return Array.from(subjectStats.values())
    .map((item) => ({
      subject: item.subject,
      voteCount: item.voteCount,
      averageDifficulty: Number((item.weightedTotal / item.voteCount).toFixed(2)),
    }))
    .sort((a, b) => {
      if (b.averageDifficulty !== a.averageDifficulty) {
        return b.averageDifficulty - a.averageDifficulty;
      }
      return b.voteCount - a.voteCount;
    });
}

function findHardestSubject(papers = [], votes = []) {
  return buildDifficultyStats(papers, votes)[0]?.subject || '';
}

module.exports = {
  DIFFICULTY_WEIGHTS,
  buildDifficultyStats,
  findHardestSubject,
};
