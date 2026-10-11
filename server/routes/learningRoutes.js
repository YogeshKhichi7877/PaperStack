const express = require('express');
const mongoose = require('mongoose');
const DailyLearningCheckin = require('../models/DailyLearningCheckin');
const UserNote = require('../models/UserNote');
const User = require('../models/User');
const UserRating = require('../models/UserRating');
const { mapLearningTopics } = require('../services/topicMappingService');
const { listCanonicalTopics } = require('../services/topicCatalogService');
const { getLearningDashboard, indiaDayKey } = require('../services/learningDashboardService');
const { createPracticeSession, getSession, submitAttempt } = require('../services/practiceService');
const LearningTutorSession = require('../models/LearningTutorSession');
const { completeTutorSession, tutorReply } = require('../services/learningTutorService');
const { resolveSubject } = require('../services/subjectService');

function clean(value, max) { return String(value || '').trim().slice(0, max); }

function createLearningRoutes({ authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/dashboard', async (req, res) => {
    try { return res.json(await getLearningDashboard(req.user._id)); }
    catch (error) { console.error('Learning dashboard failed:', error); return res.status(500).json({ error: 'Could not load your learning dashboard.' }); }
  });

  router.get('/subjects/:subjectCode/topics', async (req, res) => {
    try { return res.json({ topics: await listCanonicalTopics(req.params.subjectCode) }); }
    catch { return res.status(500).json({ error: 'Could not load subject topics.' }); }
  });

  router.post('/topic-map', async (req, res) => {
    try {
      const result = await mapLearningTopics({
        text: req.body?.text,
        subjectCode: req.body?.subjectCode,
        subjectName: req.body?.subjectName,
        branch: req.body?.branch,
        semester: req.body?.semester,
      });
      return res.json(result);
    } catch (error) { return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Topic mapping is temporarily unavailable. Choose topics manually.' }); }
  });

  router.post('/checkins', async (req, res) => {
    try {
      const originalText = clean(req.body?.originalText, 3000);
      const subject = resolveSubject({ subjectCode: req.body?.subjectCode, subjectName: req.body?.subjectName, branch: req.user?.branch, semester: req.user?.semester });
      const subjectCode = clean(subject.code, 30).toUpperCase();
      const subjectName = clean(subject.name, 160);
      if (!originalText || !subjectCode || !subjectName) return res.status(400).json({ error: 'Learning text and subject are required.' });
      const canonical = await listCanonicalTopics(subjectCode);
      const byKey = new Map(canonical.map((item) => [item.topicKey, item]));
      const topics = (req.body?.topics || []).slice(0, 12).map((item) => {
        const match = byKey.get(String(item.topicKey || ''));
        return match ? { topicKey: match.topicKey, name: match.name, confidence: Math.max(0, Math.min(1, Number(item.confidence) || 1)), confirmed: true } : null;
      }).filter(Boolean);
      let note = null;
      let doubtNote = null;
      const noteContent = clean(req.body?.note, 12000);
      if (noteContent) note = await UserNote.create({ userId: req.user._id, subjectCode, topicKey: topics[0]?.topicKey || '', topicName: topics[0]?.name || '', dayKey: indiaDayKey(), type: req.body?.noteType || 'CLASS_NOTE', content: noteContent, private: true });
      const doubtContent = clean(req.body?.doubt, 2000);
      if (doubtContent) doubtNote = await UserNote.create({ userId: req.user._id, subjectCode, topicKey: topics[0]?.topicKey || '', topicName: topics[0]?.name || '', dayKey: indiaDayKey(), type: 'DOUBT', status: 'OPEN', content: doubtContent, private: true });
      const checkin = await DailyLearningCheckin.create({
        userId: req.user._id, dayKey: indiaDayKey(), subjectCode, subjectName, originalText, topics,
        doubt: doubtContent, doubtNoteId: doubtNote?._id || null, noteId: note?._id || null,
      });
      return res.status(201).json({ checkin, note, doubtNote, nextActions: ['UNDERSTAND_WITH_AI', 'PRACTICE'] });
    } catch (error) { return res.status(500).json({ error: 'Could not save today’s learning.' }); }
  });

  router.post('/tutor', async (req, res) => {
    try {
      const result = await tutorReply(req.user._id, req.body || {});
      return res.status(result.available ? 201 : 503).json(result);
    } catch (error) {
      console.error('Learning tutor failed:', error);
      return res.status(error.statusCode || 502).json({ error: error.statusCode ? error.message : 'PaperStack AI could not prepare this explanation. Please try again.' });
    }
  });

  router.get('/tutor/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid tutor session id.' });
    const session = await LearningTutorSession.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    return session ? res.json({ session }) : res.status(404).json({ error: 'Tutor session not found.' });
  });

  router.post('/tutor/:id/complete', async (req, res) => {
    try { return res.json({ session: await completeTutorSession(req.user._id, req.params.id) }); }
    catch (error) { return res.status(error.statusCode || 500).json({ error: error.message || 'Could not complete this topic.' }); }
  });

  router.get('/notes', async (req, res) => {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    const query = { userId: req.user._id };
    if (req.query.subjectCode) query.subjectCode = clean(req.query.subjectCode, 30).toUpperCase();
    return res.json({ notes: await UserNote.find(query).sort({ dayKey: -1, createdAt: -1 }).limit(limit).lean() });
  });

  router.post('/notes', async (req, res) => {
    try {
      const content = clean(req.body?.content, 12000);
      const subjectCode = clean(req.body?.subjectCode, 30).toUpperCase();
      if (!content || !subjectCode) return res.status(400).json({ error: 'Subject and note content are required.' });
      const type = ['CLASS_NOTE', 'IMPORTANT_POINT', 'FORMULA', 'DOUBT', 'REVISION_NOTE'].includes(req.body?.type) ? req.body.type : 'CLASS_NOTE';
      const note = await UserNote.create({ userId: req.user._id, subjectCode, topicKey: clean(req.body?.topicKey, 180), topicName: clean(req.body?.topicName, 160), dayKey: indiaDayKey(), type, status: type === 'DOUBT' ? 'OPEN' : null, content, private: true });
      return res.status(201).json({ note });
    } catch { return res.status(500).json({ error: 'Could not save note.' }); }
  });

  router.delete('/notes/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid note id.' });
    const deleted = await UserNote.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    return deleted ? res.json({ success: true }) : res.status(404).json({ error: 'Note not found.' });
  });

  router.patch('/notes/:id/status', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid note id.' });
    const status = String(req.body?.status || '').toUpperCase();
    if (!['OPEN', 'IMPROVING', 'RESOLVED'].includes(status)) return res.status(400).json({ error: 'Choose a valid doubt status.' });
    const note = await UserNote.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, type: 'DOUBT' }, { $set: { status } }, { new: true, runValidators: true });
    return note ? res.json({ note }) : res.status(404).json({ error: 'Doubt not found.' });
  });

  router.post('/practice-sessions', async (req, res) => {
    try {
      const result = await createPracticeSession(req.user._id, req.body || {});
      if (req.body?.checkinId && mongoose.Types.ObjectId.isValid(req.body.checkinId)) await DailyLearningCheckin.updateOne({ _id: req.body.checkinId, userId: req.user._id }, { $set: { practiceSessionId: result.session._id } });
      return res.status(201).json(result);
    } catch (error) { return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Could not prepare practice.' }); }
  });

  router.get('/practice-sessions/:id', async (req, res) => {
    try { return res.json(await getSession(req.user._id, req.params.id)); }
    catch (error) { return res.status(error.statusCode || 500).json({ error: error.message || 'Could not load practice.' }); }
  });

  router.post('/practice-sessions/:id/attempts', async (req, res) => {
    try { return res.status(201).json(await submitAttempt(req.user._id, req.params.id, req.body || {})); }
    catch (error) { console.error('Practice attempt failed:', error); return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Could not evaluate this answer.' }); }
  });

  router.patch('/profile-visibility', async (req, res) => {
    const isPublic = req.body?.public === true;
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $set: { academicProfilePublic: isPublic } }),
      UserRating.findOneAndUpdate({ userId: req.user._id }, { $set: { public: isPublic }, $setOnInsert: { globalRating: 1000, ratedCount: 0, provisional: true } }, { upsert: true }),
    ]);
    return res.json({ public: isPublic });
  });

  return router;
}

module.exports = { createLearningRoutes };
