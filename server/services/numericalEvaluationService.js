const { equivalentValues, evaluateExpression } = require('./mathVerificationService');

function extractFinalValue(text) {
  const source = String(text || '').replace(/\$/g, '').trim();
  if (!source || source.length > 5000) return null;
  const matches = [...source.matchAll(/(?:final answer|result|therefore|=)\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)(?:\s*([a-zA-Z°][a-zA-Z0-9°/^]*))?/gi)];
  if (matches.length) {
    const last = matches.at(-1);
    return { value: Number(last[1]), unit: String(last[2] || '').toLowerCase() };
  }
  if (source.length <= 100 && /^[0-9eEpiPI.\s+\-*/^()sqrtlogincosta]+$/.test(source)) {
    try {
      const value = evaluateExpression(source);
      if (typeof value === 'number') return { value, unit: '' };
    } catch {}
  }
  return null;
}

function assessNumericalAnswer(entry) {
  const question = entry.question || {};
  if (question.questionType !== 'numerical' && !Number.isFinite(question.verifiedNumericResult)) return null;
  const reference = Number.isFinite(question.verifiedNumericResult)
    ? { value: question.verifiedNumericResult, unit: extractFinalValue(question.expectedAnswer)?.unit || '' }
    : extractFinalValue(entry.approvedSolutions?.[0]?.answerText || '');
  if (!reference) return null;
  const student = extractFinalValue(entry.answerText);
  const correctValue = Boolean(student && equivalentValues(reference.value, student.value, 1e-4));
  const unitMismatch = Boolean(reference.unit && reference.unit !== (student?.unit || ''));
  const hasMethod = /(?:formula|substitut|step|=.+(?:=|\n))/i.test(String(entry.answerText || ''));
  return { verified: true, correct: correctValue && !unitMismatch, unitMismatch,
    hasMethod, expected: reference.value, actual: student?.value ?? null };
}

function applyNumericalScoreCap(evaluation, entry, roundHalf) {
  const check = assessNumericalAnswer(entry);
  if (!check || check.correct) return evaluation;
  const cap = roundHalf(Number(evaluation.maxMarks || 0) * (check.hasMethod ? 0.5 : 0.2));
  const score = Math.min(Number(evaluation.score || 0), cap);
  return { ...evaluation, score,
    estimatedAccuracy: evaluation.maxMarks ? Math.round(score / evaluation.maxMarks * 100) : 0,
    feedback: `${check.unitMismatch ? 'The final unit does not match the reference.' :
      'The final numerical value could not be verified against the reference.'} ${evaluation.feedback || ''}`.trim(),
    numericalVerification: check };
}

module.exports = { applyNumericalScoreCap, assessNumericalAnswer, extractFinalValue };
