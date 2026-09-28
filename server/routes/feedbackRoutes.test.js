const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const User = require('../models/User');
const Testimonial = require('../models/Testimonial');
const Report = require('../models/Report');
const createFeedbackRoutes = require('./feedbackRoutes');

const userId = '507f1f77bcf86cd799439011';
const itemId = '507f1f77bcf86cd799439012';

test('feedback routes validate student submissions and enforce admin deletion', async () => {
  const originals = {
    findUser: User.findById,
    findTestimonial: Testimonial.findOne,
    listTestimonials: Testimonial.find,
    createTestimonial: Testimonial.create,
    deleteTestimonial: Testimonial.findByIdAndDelete,
    findReport: Report.findOne,
    createReport: Report.create,
    deleteReport: Report.findByIdAndDelete,
  };
  const created = [];
  User.findById = () => ({ select: () => ({ lean: async () => ({ displayName: 'Student', username: 'student', email: 'student@iiitsurat.ac.in' }) }) });
  Testimonial.findOne = async () => null;
  let offset = 0;
  Testimonial.find = () => {
    const query = { select: () => query, sort: () => query, skip: (value) => { offset = value; return query; }, limit: () => query, lean: async () => Array.from({ length: 13 }, (_, index) => ({ _id: `${offset + index}`, rating: 4 })) };
    return query;
  };
  Testimonial.create = async (value) => { created.push(['testimonial', value]); return { ...value, _id: itemId, createdAt: new Date() }; };
  Testimonial.findByIdAndDelete = async () => ({ _id: itemId });
  Report.findOne = async () => null;
  Report.create = async (value) => { created.push(['report', value]); return { ...value, _id: itemId }; };
  Report.findByIdAndDelete = async () => ({ _id: itemId });
  const authenticate = (req, res, next) => req.headers.authorization ? (req.user = { _id: userId }, next()) : res.status(401).json({ error: 'Sign in required' });
  const authenticateAdmin = (req, res, next) => req.headers.authorization === 'Bearer admin' ? next() : res.status(403).json({ error: 'Admin access required' });
  const app = express();
  app.use(express.json());
  app.use('/api', createFeedbackRoutes({ authenticate, authenticateAdmin }));
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = (path, body, token = 'Bearer student') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify(body) });
  try {
    const firstPage = await (await fetch(`${base}/testimonials?page=1`)).json();
    assert.equal(firstPage.items.length, 12);
    assert.equal(firstPage.hasMore, true);
    const secondPage = await (await fetch(`${base}/testimonials?page=2`)).json();
    assert.equal(secondPage.items[0]._id, '12');
    assert.ok(Array.isArray(await (await fetch(`${base}/testimonials`)).json()));
    assert.equal((await fetch(`${base}/testimonials?page=-1`)).status, 400);
    assert.equal((await post('/testimonials', { message: 'short' })).status, 400);
    assert.equal((await post('/testimonials', { message: 'PaperStack made finding papers much easier.', branch: 'MnC', rating: 5 })).status, 201);
    assert.equal(created[0][1].branch, 'Mathematics and Computing');
    assert.equal(created[0][1].rating, 5);
    assert.equal((await post('/site-reports', { category: 'Bad category', title: 'Broken archive', message: 'The archive search is not loading for me.' })).status, 400);
    assert.equal((await post('/site-reports', { category: 'Broken page', title: 'Broken archive', message: 'The archive search is not loading for me.' })).status, 201);
    assert.equal(created[1][1].reporterEmail, 'student@iiitsurat.ac.in');
    assert.equal((await fetch(`${base}/admin/testimonials/${itemId}`, { method: 'DELETE', headers: { Authorization: 'Bearer student' } })).status, 403);
    assert.equal((await fetch(`${base}/admin/testimonials/${itemId}`, { method: 'DELETE', headers: { Authorization: 'Bearer admin' } })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    User.findById = originals.findUser;
    Testimonial.findOne = originals.findTestimonial;
    Testimonial.find = originals.listTestimonials;
    Testimonial.create = originals.createTestimonial;
    Testimonial.findByIdAndDelete = originals.deleteTestimonial;
    Report.findOne = originals.findReport;
    Report.create = originals.createReport;
    Report.findByIdAndDelete = originals.deleteReport;
  }
});
