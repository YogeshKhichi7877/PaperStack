const { z } = require('zod');

const shortText = z.string().trim().min(1).max(5000);
const optionalText = z.string().max(5000).optional();
const metadataSchema = z.object({
  subjectName: optionalText, subjectCode: optionalText, subjectShortCode: optionalText,
  branch: optionalText, semester: z.union([z.number(), z.string(), z.null()]).optional(),
  year: z.union([z.number(), z.string(), z.null()]).optional(), examType: optionalText,
}).refine((value) => Object.values(value).some((item) => item !== '' && item != null));

const questionSchema = z.object({
  questionNumber: z.union([z.string(), z.number()]).optional(),
  number: z.union([z.string(), z.number()]).optional(),
  part: optionalText, section: optionalText,
  questionText: shortText.optional(), text: shortText.optional(),
  marks: z.number().min(0).max(100).nullable().optional(),
  pageNumber: z.number().int().min(1).nullable().optional(),
  questionType: optionalText, primaryTopic: optionalText,
  topics: z.array(z.string().max(120)).max(12).optional(),
  confidence: z.number().min(0).max(100).optional(),
}).refine((value) => Boolean(value.questionText || value.text));
const questionExtractionSchema = z.object({ questions: z.array(questionSchema).max(80) });
const mockSelectionSchema = z.object({ selectedQuestionIds: z.array(z.string().min(1).max(80)).max(90), rationale: optionalText });
const markingCriterionSchema = z.object({ criterion: shortText, marks: z.number().positive().max(100) });
const mockGenerationSchema = z.object({ questions: z.array(z.object({
  sourceQuestionId: shortText, questionText: shortText, questionType: optionalText,
  difficulty: z.enum(['easy', 'moderate', 'hard']), expectedAnswer: shortText,
  keyPoints: z.array(shortText).min(2).max(8), formulas: z.array(z.string()).max(5).optional(),
  markingScheme: z.array(markingCriterionSchema).min(1).max(12),
  numericCheck: z.object({ expression: shortText, result: z.number().finite() }).optional(),
})).max(30) });
const mockEvaluationSchema = z.object({ items: z.array(z.object({
  questionId: shortText, score: z.number().min(0).max(100),
  estimatedAccuracy: z.number().min(0).max(100), feedback: shortText,
  strengths: z.array(z.string()).max(5), missingPoints: z.array(z.string()).max(6),
  nextStep: shortText, confidence: z.enum(['low', 'medium', 'high']),
})).max(90), overallFeedback: optionalText });
const numericalReasoningSchema = z.object({
  given: z.array(z.string().max(200)).max(12), required: shortText,
  formula: shortText, expression: shortText, claimedResult: z.union([z.number(), z.string()]),
  unit: z.string().max(32).optional(), explanation: optionalText,
});
const sourceNoteSchema = z.object({ sourceId: shortText, text: shortText });
const revisionSchema = z.object({
  briefing: optionalText, notes: z.array(sourceNoteSchema).max(10).optional(),
  mistakes: z.array(sourceNoteSchema).max(10).optional(),
  formulas: z.array(z.object({ sourceId: shortText, sourceExpression: shortText, latex: shortText })).max(12).optional(),
});
const warRoomSchema = z.object({ briefing: shortText });

function parseAiJson(text, schema) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed;
  try { parsed = JSON.parse(cleaned); } catch { throw new TypeError('AI response invalid'); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new TypeError('AI response invalid');
  return result.data;
}

module.exports = { metadataSchema, mockEvaluationSchema, mockGenerationSchema, mockSelectionSchema,
  numericalReasoningSchema, parseAiJson, questionExtractionSchema, revisionSchema, warRoomSchema };
