const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');

const {
  buildChunkDocuments,
  extractPptxUnits,
  extractResource,
  processPrivateStudyResource,
  splitText,
  validatePrivateStudyFile,
} = require('./privateStudyResourceService');

test('private upload validation checks extension, MIME and PDF signature', async () => {
  const valid = await validatePrivateStudyFile({
    originalname: 'lecture.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nclass notes'),
  });
  assert.equal(valid.resourceType, 'PDF');
  await assert.rejects(validatePrivateStudyFile({
    originalname: 'lecture.pdf', mimetype: 'text/plain', buffer: Buffer.from('%PDF-1.4'),
  }), { code: 'MIME_MISMATCH', statusCode: 400 });
  await assert.rejects(validatePrivateStudyFile({
    originalname: 'lecture.pdf', mimetype: 'application/pdf', buffer: Buffer.from('not a pdf'),
  }), { code: 'INVALID_PDF', statusCode: 400 });
});

test('PPTX extraction keeps slide numbers and speaker notes without rendering images', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('ppt/presentation.xml', '<p:presentation/>');
  zip.file('ppt/slides/slide1.xml', '<a:p><a:r><a:t>Deadlock</a:t></a:r></a:p><a:p><a:r><a:t>Four conditions</a:t></a:r></a:p>');
  zip.file('ppt/notesSlides/notesSlide1.xml', '<a:p><a:r><a:t>Explain circular wait</a:t></a:r></a:p>');
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const validated = await validatePrivateStudyFile({
    originalname: 'OS Lecture 5.pptx',
    mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    buffer,
  });
  assert.equal(validated.resourceType, 'PPTX');
  const result = await extractPptxUnits(buffer);
  assert.equal(result.pageCount, 1);
  assert.equal(result.units[0].locatorNumber, 1);
  assert.match(result.units[0].text, /Deadlock/);
  assert.match(result.units[0].text, /Speaker notes/);
  assert.match(result.units[0].text, /circular wait/);
});

test('PDF extraction preserves physical pages and only uses OCR results supplied for poor pages', async () => {
  let completed = false;
  const result = await extractResource({ _id: 'resource', resourceType: 'PDF', title: 'OS', subjectCode: 'CS301' }, Buffer.from('%PDF-1.4'), {
    parsePdf: async () => ({ pages: 2, pageTexts: [{ pageNumber: 1, text: 'Selectable semaphore text', method: 'text' }, { pageNumber: 2, text: '', method: 'text' }] }),
    completePdf: async ({ parsedPdf }) => {
      completed = true;
      return { ...parsedPdf, pageTexts: [parsedPdf.pageTexts[0], { pageNumber: 2, text: 'Scanned mutex text', method: 'ocr' }], ocrPages: [2] };
    },
  });
  assert.equal(completed, true);
  assert.equal(result.extractionStatus, 'MIXED');
  assert.deepEqual(result.units.map((item) => [item.locatorNumber, item.extractionMethod]), [[1, 'NATIVE_TEXT'], [2, 'OCR']]);
});

test('chunking is bounded, overlapping and keeps private ownership metadata', () => {
  const text = Array(700).fill('semaphore').join(' ');
  const pieces = splitText(text, 400, 40);
  assert.ok(pieces.length > 2);
  assert.ok(pieces.every((piece) => piece.length <= 410));
  const docs = buildChunkDocuments({ _id: 'r1', userId: 'u1', subjectCode: 'CS301' }, [{ locatorType: 'SLIDE', locatorNumber: 14, heading: 'Semaphore', text, extractionMethod: 'NATIVE_TEXT' }]);
  assert.equal(docs[0].userId, 'u1');
  assert.equal(docs[0].resourceId, 'r1');
  assert.equal(docs[0].locatorNumber, 14);
});

test('resource processing persists reusable chunks and canonical topic links', async () => {
  const resource = {
    _id: 'r1', userId: 'u1', subjectCode: 'CS301', subjectName: 'Operating Systems',
    resourceType: 'TEXT', title: 'Lecture', processing: { stage: 'queued' },
  };
  const updates = [];
  const inserted = [];
  const ResourceModel = {
    findOneAndUpdate: () => ({ lean: async () => resource }),
    updateOne: async (...args) => { updates.push(args); },
  };
  const ChunkModel = {
    deleteMany: async () => {},
    insertMany: async (docs) => { inserted.push(...docs); },
  };
  const result = await processPrivateStudyResource('r1', { buffer: Buffer.from('Deadlock and semaphore lecture content') }, {
    ResourceModel, ChunkModel,
    mapTopics: async () => ({ topics: [{ topicKey: 'cs301:deadlock', name: 'Deadlock' }] }),
  });
  assert.equal(result.extractionStatus, 'complete');
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0].topicKeys, ['cs301:deadlock']);
  assert.ok(updates.some(([, update]) => update.$set?.processingStatus === 'READY'));
});
