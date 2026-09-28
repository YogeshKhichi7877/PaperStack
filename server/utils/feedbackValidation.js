const { normalizeBranch } = require('./branches');

function plainText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1);
}

function validateTestimonial(body) {
  const message = plainText(body?.message, 600);
  if (message.length < 15 || message.length > 600) return { error: 'Experience must be 15 to 600 characters.' };
  const branch = body?.branch ? normalizeBranch(body.branch) : null;
  if (body?.branch && !branch) return { error: 'Choose an official branch.' };
  const semester = body?.semester === '' || body?.semester == null ? null : Number(body.semester);
  if (semester != null && (!Number.isInteger(semester) || semester < 1 || semester > 8)) return { error: 'Semester must be between 1 and 8.' };
  const rating = body?.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Select a rating from 1 to 5 stars.' };
  return { value: { message, branch, semester, rating } };
}

const REPORT_CATEGORIES = Object.freeze(['Broken page', 'Incorrect paper', 'Missing file', 'Wrong metadata', 'Feature not working', 'UI problem', 'Login issue', 'AI answer problem', 'Inappropriate resource', 'Duplicate content', 'Other']);

function validateSiteReport(body) {
  const category = plainText(body?.category, 50);
  const title = plainText(body?.title, 120);
  const message = plainText(body?.message, 2000);
  const page = plainText(body?.page, 120);
  const url = plainText(body?.url, 300);
  const relatedId = plainText(body?.relatedId, 80);
  if (!REPORT_CATEGORIES.includes(category)) return { error: 'Choose a valid report category.' };
  if (title.length < 5 || title.length > 120) return { error: 'Title must be 5 to 120 characters.' };
  if (message.length < 15 || message.length > 2000) return { error: 'Description must be 15 to 2000 characters.' };
  if (page.length > 120 || url.length > 300 || relatedId.length > 80) return { error: 'A report field is too long.' };
  if (url && !/^\/[^\s]*$/.test(url) && !/^https?:\/\/[^\s]+$/i.test(url)) return { error: 'Enter a valid page path or URL.' };
  return { value: { category, title, message, page, url, relatedId } };
}

module.exports = { plainText, validateTestimonial, validateSiteReport, REPORT_CATEGORIES };
