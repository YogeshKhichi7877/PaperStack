const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const axios = require('axios');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const Contribution = require('../models/Contribution');
const { syntheticPdf } = require('../testFixtures/pdf');
const { extractPaperQuestions, persistQuestions, EXTRACTION_VERSION, chooseExtraction } = require('./questionExtractionService');
const { getProcessingJob, persistedJob, initialProcessingFields, queuePaperProcessing, processQueuedPaper, recoverPaperProcessing } = require('./paperProcessingQueue');
const { isTransientError } = require('./paperProcessingErrors');
function query(value) {
  return { select(){return this;},sort(){return this;},limit(){return this;},lean:async()=>value, distinct:async()=>[] };
}
function fixture(t, buffer, existing = []) {
  const paper = { _id: new mongoose.Types.ObjectId(), title:'Synthetic exam', subject:'Cloud Computing', subjectCode:'CS504', branch:'CSE', semester:5, year:2025, examType:'End-Sem', filePath:'https://res.cloudinary.com/test/raw/upload/paper.pdf', processing:{attempts:0} };
  const updates=[], writes=[];
  t.mock.method(Paper,'findById',()=>query(paper));
  t.mock.method(Paper,'findOneAndUpdate',()=>query({...paper,processing:{attempts:1}}));
  t.mock.method(Paper,'updateOne',async(filter,update)=>{updates.push(update);return {matchedCount:1};});
  t.mock.method(Paper,'findByIdAndUpdate',async(id,update)=>{updates.push(update);return paper;});
  t.mock.method(axios,'get',async()=>({data:buffer}));
  t.mock.method(Question,'find',(filter)=>query(filter.$or ? existing : []));
  t.mock.method(Question,'countDocuments',async(filter)=>filter.needsReview ? writes.filter(q=>q.needsReview).length : writes.length+existing.length);
  t.mock.method(Question,'bulkWrite',async(operations)=>{
    // Use the installed Mongoose bulk caster against every actual operation.
    const cast = require('mongoose/lib/helpers/model/castBulkWrite');
    for (const operation of operations) {
      const document=operation.updateOne.update[0].$replaceWith.$cond[2].$mergeObjects[1].$literal;
      await new Question(document).validate();
      await new Promise((resolve,reject)=>cast(Question,operation,{updatePipeline:true})(error=>error?reject(error):resolve()));
      writes.push(document);
    }
  });
  const deletion=t.mock.method(Question,'deleteMany',async()=>({deletedCount:0}));
  return {paper,updates,writes,deletion};
}
test('real text PDF processing saves questions and stages without AI',async t=>{
  const f=fixture(t,syntheticPdf([['Q1. Explain virtual memory allocation in detail. [5]','Q2(a) Explain paging and address translation. [3]','(b) Compare virtual and physical memory. [2]']]));
  const result=await extractPaperQuestions({paperId:f.paper._id,allowAi:false});
  assert.equal(result.extractionStatus,'complete');assert.equal(result.detectedQuestions,3);
  assert.deepEqual(f.writes.map(q=>q.questionKey),['q1','q2-a','q2-b']);
  assert.equal(result.ai.attempted,false);
  assert.equal(f.writes[1].paperId,f.paper._id);
  assert.equal(f.writes[1].sourceLocation.pageStart,1);
  const stages=f.updates.map(u=>u.$set?.['processing.stage']).filter(Boolean);
  assert.deepEqual(stages,['extracting_metadata','extracting_questions','classifying','saving','completed']);
});
test('PDF-only import detects metadata and saves question records without manual input', async t => {
  const f = fixture(t, syntheticPdf([['CS504 Cloud Computing', 'Branch: CSE', 'Semester V End Semester Examination 2025', 'Maximum Marks: 25', 'Q1. Explain cloud computing and virtualization in detail. [5]', 'Q2(a) Compare public clouds with private clouds. [3]', '(b) Explain Infrastructure as a Service in detail. [2]']]));
  Object.assign(f.paper, { title: 'Detecting details', subject: '', subjectCode: '', branch: '', semester: null, examType: '', year: null, importBatchId: new mongoose.Types.ObjectId() });
  t.mock.method(require('./resourceService'), 'syncResourceFromPaper', async () => {});
  const result = await extractPaperQuestions({ paperId: f.paper._id, allowAi: false });
  assert.equal(result.extractionStatus, 'complete'); assert.equal(result.detectedQuestions, 3);
  assert.equal(f.writes[0].subjectCode, 'CS504'); assert.equal(f.writes[0].semester, 5); assert.equal(f.writes[0].year, 2025);
  assert.ok(f.updates.some((update) => update.$set?.reviewStatus === 'approved'));
});
test('unknown metadata keeps valid extracted questions for review instead of failing the paper', async t => {
  const f = fixture(t, syntheticPdf([['Unrecognized examination paper', 'Q1. Explain virtual memory allocation and address translation. [5]', 'Q2. Compare logical addresses and physical addresses in detail. [5]']]));
  Object.assign(f.paper, { title: 'Detecting details', subject: '', subjectCode: '', branch: '', semester: null, examType: '', year: null, importBatchId: new mongoose.Types.ObjectId() });
  t.mock.method(require('./resourceService'), 'syncResourceFromPaper', async () => {});
  const result = await extractPaperQuestions({ paperId: f.paper._id, allowAi: false });
  assert.equal(result.extractionStatus, 'partial'); assert.equal(result.detectedQuestions, 2);
  assert.ok(f.writes.every((question) => question.needsReview));
  assert.ok(f.updates.some((update) => update.$set?.reviewStatus === 'needs_review'));
});
test('corrupt PDF fails safely and never deletes prior questions',async t=>{
  const f=fixture(t,Buffer.from('%PDF-1.4\nbroken'));
  const r=await extractPaperQuestions({paperId:f.paper._id,allowAi:false});
  assert.equal(r.extractionStatus,'failed');assert.equal(r.error.code,'PDF_CORRUPT');
  assert.equal(f.writes.length,0);assert.equal(f.deletion.mock.callCount(),0);
  assert.equal(r.failureReason,'Paper processing failed.');
});
test('scanned PDF without OCR retains review state instead of inventing questions',async t=>{
  const f=fixture(t,syntheticPdf([[]]));
  const r=await extractPaperQuestions({paperId:f.paper._id,allowAi:false});
  assert.equal(r.detectedQuestions,0);assert.equal(r.extractionStatus,'failed');assert.deepEqual(r.unreadablePages,[1]);
  assert.equal(f.writes.length,0);
});
test('reprocessing preserves reviewed/manual keys and does not prune partial results',async t=>{
  const f=fixture(t,syntheticPdf([[]]),[{questionKey:'q1',textHash:'protected'}]);
  const q=(key,confidence)=>({questionKey:key,questionNumber:key.slice(1),questionText:`Explain the model for ${key}.`,marks:5,confidence,source:'rule'});
  const r=await persistQuestions({paper:f.paper,selected:{source:'rule',questions:[q('q1',98),q('q2',75)],confidence:75,incomplete:true}});
  assert.equal(r.protectedQuestionsSkipped,1);assert.equal(f.writes.length,1);assert.equal(f.writes[0].needsReview,true);
  assert.equal(f.deletion.mock.callCount(),0);
});
test('current extraction is idempotent and old versions can be reprocessed',async t=>{
  const f=fixture(t,syntheticPdf([['Q1. Explain memory paging in detail. [5]']]));
  f.paper.questionExtractionStatus='complete';f.paper.questionCount=1;f.paper.questionExtractionVersion=EXTRACTION_VERSION;
  const r=await extractPaperQuestions({paperId:f.paper._id});assert.equal(r.skipped,true);assert.equal(f.writes.length,0);
  f.paper.questionExtractionVersion='question-extract-v1';
  const migrated=await extractPaperQuestions({paperId:f.paper._id,allowAi:false});assert.equal(migrated.skipped,false);assert.equal(f.writes.length,1);
});
test('AI outage or incomplete response never discards valid local questions',()=>{
  const local={questionKey:'q1',questionText:'Explain paging.',confidence:75};
  const r=chooseExtraction({localResult:{questions:[local],confidence:75,warnings:[]},aiResult:{attempted:true,questions:[{questionKey:'q2',questionText:'Explain segmentation.',confidence:95}],incomplete:true},allowAi:true});
  assert.equal(r.questions.length,2);assert.equal(r.incomplete,true);
});
test('status polling uses persisted progress after process memory is lost',async t=>{
  const p={_id:'paper',questionExtractionStatus:'partial',processing:{jobId:'durable-id',stage:'needs_review',reviewCount:2,result:{totalQuestionCount:5}}};
  t.mock.method(Paper,'findOne',()=>query(p));
  const job=await getProcessingJob('durable-id');assert.equal(job.status,'partial');assert.equal(job.result.totalQuestionCount,5);assert.equal(job.processing.reviewCount,2);
});
test('completed queue submissions do not reset a current extraction',async t=>{
  const p={_id:'paper',questionExtractionStatus:'complete',questionExtractionVersion:EXTRACTION_VERSION,processing:{jobId:'finished',result:{totalQuestionCount:5}}};
  t.mock.method(Paper,'findById',()=>query(p));
  const job=await queuePaperProcessing('paper');assert.equal(job.status,'complete');assert.equal(job.id,'finished');
});
test('retry policy bounds transient failures and never retries invalid PDFs',()=>{
  assert.equal(isTransientError({code:'PDF_CORRUPT'}),false);
  assert.equal(isTransientError({response:{status:429}}),true);
  assert.equal(isTransientError({failures:[{category:'timeout'}]}),true);
  assert.equal(isTransientError({failures:[{category:'invalid_response'}]}),false);
  assert.equal(initialProcessingFields().questionExtractionStatus,'queued');
  assert.equal(persistedJob({questionExtractionStatus:'failed',processing:{jobId:'x'}}).error,'Paper processing failed.');
});

test('the queue worker processes a paper and exposes its persisted final result', async t => {
  const f = fixture(t, syntheticPdf([['Q1. Explain virtual memory and paging in detail. [5]', 'Q2. Compare logical and physical memory allocation. [5]']]));
  f.paper.questionExtractionStatus = 'not_started';
  const apply = (update) => {
    for (const [path, value] of Object.entries(update.$set || {})) {
      const parts = path.split('.'); let target = f.paper;
      for (const part of parts.slice(0, -1)) target = target[part] ||= {};
      target[parts.at(-1)] = value;
    }
    for (const [path, amount] of Object.entries(update.$inc || {})) if (path === 'processing.attempts') f.paper.processing.attempts += amount;
  };
  t.mock.method(Paper, 'findOneAndUpdate', (filter, update) => { apply(update); return query(f.paper); });
  t.mock.method(Paper, 'updateOne', async (filter, update) => { apply(update); return { matchedCount: 1 }; });
  t.mock.method(Paper, 'findByIdAndUpdate', async (id, update) => { apply(update); return f.paper; });
  t.mock.method(Paper, 'findOne', () => query(f.paper));
  const result = await processQueuedPaper(f.paper._id, { allowAi: false });
  assert.equal(result.extractionStatus, 'complete');
  assert.equal(result.totalQuestionCount, 2);
  assert.equal(f.paper.processing.stage, 'completed');
  assert.equal(f.paper.processing.attempts, 1);
});

test('recovery stops abandoned jobs after the bounded retry limit', async t => {
  const db = Paper.db;
  const previousState = db.readyState;
  db.readyState = 1;
  t.after(() => { db.readyState = previousState; });
  t.mock.method(Paper, 'find', () => query([{ _id: 'paper-limit', questionExtractionStatus: 'processing', processing: { jobId: 'limit', attempts: 3, stage: 'ocr' } }]));
  const calls = [];
  t.mock.method(Paper, 'updateOne', async (filter, update) => { calls.push(update); });
  await recoverPaperProcessing();
  assert.equal(calls[0].$set.questionExtractionStatus, 'failed');
  assert.equal(calls[0].$set['processing.error'].code, 'RETRY_LIMIT');
});

test('a contribution cannot enter extraction before its approval is persisted', async t => {
  t.mock.method(Paper, 'findById', () => query({ _id: 'pending-paper', uploadMode: 'contribution', contributionId: 'pending-contribution', questionExtractionStatus: 'queued', processing: { jobId: 'pending-job' } }));
  t.mock.method(Contribution, 'exists', async () => null);
  await assert.rejects(queuePaperProcessing('pending-paper'), { statusCode: 409, message: 'Contribution approval is pending.' });
});
