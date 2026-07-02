const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const crypto = require('crypto');
const dns = require('dns');
const pdfParse = require('pdf-parse');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const axios = require('axios');
require('dotenv').config();

const {
  SUBJECT_CATALOG,
  EXPECTED_YEARS,
  EXPECTED_EXAM_TYPES
} = require('./data/subjectCatalog');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('Using custom DNS servers for MongoDB SRV lookup');
} catch (error) {
  console.warn('Could not set custom DNS servers:', error.message);
}

// If mongodb+srv DNS still fails on some networks, use MONGODB_URI_STANDARD
// with the non-SRV Atlas connection string.

const { cloudinary, folder: cloudinaryFolder } = require('./cloudConfig');
const Paper = require('./models/Paper');
const User = require('./models/User');
const Comment = require('./models/Comment');
const Contribution = require('./models/Contribution');
const Report = require('./models/Report');
const PaperRequest = require('./models/PaperRequest');
const PaperVote = require('./models/PaperVote');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.admin_password;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://paper-stack-beryl.vercel.app';
const CLOUDINARY_FOLDER = cloudinaryFolder;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || process.env.saltrounds || 10);
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const ALLOWED_EMAIL_DOMAIN = 'iiitsurat.ac.in';

function maskValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length <= 18) return `${raw.slice(0, 3)}...${raw.slice(-4)}`;
  return `${raw.slice(0, 6)}...${raw.slice(-12)}`;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isAllowedInstituteEmail(value) {
  return normalizeEmail(value).endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

function isValidGoogleClientId(value) {
  const raw = String(value || '');
  return Boolean(
    raw &&
    raw === raw.trim() &&
    !/["'\s]/.test(raw) &&
    raw.includes('.apps.googleusercontent.com')
  );
}

// Nodemailer SMTP Transporter
let emailTransporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 465),
    secure: String(process.env.EMAIL_SECURE || 'true') === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
} else {
  console.warn('Email notifications disabled.');
}

async function sendContributionEmail(contribution) {
  if (!emailTransporter) {
    console.warn('Contribution email skipped: email transporter not configured.');
    return;
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('Contribution email skipped: EMAIL_USER or EMAIL_APP_PASSWORD missing.');
    return;
  }

  const receiverEmail =
    process.env.CONTRIBUTION_EMAIL ||
    process.env.CONTRIBUTION_RECEIVER_EMAIL ||
    process.env.EMAIL_USER;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: receiverEmail,
    subject: 'New PaperStack Contribution Submitted',
    text: `
New contribution submitted.

Subject: ${contribution.subject || ''}
Branch: ${contribution.branch || ''}
Semester: ${contribution.semester || ''}
Exam Type: ${contribution.examType || ''}
Year: ${contribution.year || ''}
Contributor: ${contribution.contributorName || contribution.contributedByName || contribution.contributedBy || ''}
Paper PDF: ${contribution.paperUrl || ''}
Solution PDF: ${contribution.solutionUrl || ''}
Admin Review Hub: ${FRONTEND_URL}/admin/contributions
    `,
    html: `
      <h3>New Paper Contribution Received</h3>
      <p><strong>Contributor Name:</strong> ${contribution.contributorName || ''}</p>
      <p><strong>Contributor Email:</strong> ${contribution.contributorEmail || ''}</p>
      <p><strong>Branch:</strong> ${contribution.branch || ''}</p>
      <p><strong>Semester:</strong> Sem ${contribution.semester || ''}</p>
      <p><strong>Subject:</strong> ${contribution.subject || ''}</p>
      <p><strong>Paper Title:</strong> ${contribution.title || ''}</p>
      <p><strong>Year:</strong> ${contribution.year || ''}</p>
      <p><strong>Exam Type:</strong> ${contribution.examType || ''}</p>
      <p><strong>Notes:</strong> ${contribution.notes || 'None'}</p>
      <p><strong>Paper PDF Link:</strong> <a href="${contribution.paperUrl || ''}" target="_blank">View Paper PDF</a></p>
      ${contribution.solutionUrl ? `<p><strong>Solution PDF Link:</strong> <a href="${contribution.solutionUrl}" target="_blank">View Solution PDF</a></p>` : ''}
      <p><strong>Admin Review Hub:</strong> <a href="${FRONTEND_URL}/admin/contributions" target="_blank">${FRONTEND_URL}/admin/contributions</a></p>
    `
  };

  await emailTransporter.sendMail(mailOptions);
}
let databaseStatus = 'disconnected';

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    FRONTEND_URL,
    'https://paper-stack-beryl.vercel.app',
    'https://paper-stack-beryl.vercel.app/',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    'https://paperstack.onrender.com',
    'https://paperstack-backend-7oeo.onrender.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(
  helmet({
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups',
    },
  })
);
app.use('/api/', rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(compression());

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not configured. Auth routes will fail until it is set.');
}

if (!ADMIN_PASSWORD) {
  console.warn('ADMIN_PASSWORD is not configured. Admin routes will fail until it is set.');
}

if (!GOOGLE_CLIENT_ID) {
  console.warn('GOOGLE_CLIENT_ID is not configured. Google login will fail until it is set.');
} else if (!isValidGoogleClientId(GOOGLE_CLIENT_ID)) {
  console.warn(`GOOGLE_CLIENT_ID looks invalid: ${maskValue(GOOGLE_CLIENT_ID)}. Use a Web OAuth client ID ending with .apps.googleusercontent.com.`);
}

function logMongoTroubleshooting(err) {
  const message = err?.message || 'Unknown MongoDB connection error';
  console.error(`MongoDB connection failed: ${message}`);
  if (/querySrv|ECONNREFUSED|ENOTFOUND|ETIMEOUT/i.test(message)) {
    console.error('MongoDB Atlas troubleshooting hints:');
    console.error('1. Check MongoDB Atlas Network Access IP allowlist.');
    console.error('2. Add current IP or 0.0.0.0/0 for development only.');
    console.error('3. Check database username/password.');
    console.error('4. Check connection string cluster hostname.');
    console.error('5. Try changing DNS to 8.8.8.8 or 1.1.1.1.');
    console.error('6. Try MongoDB Atlas standard connection string if SRV DNS fails.');
  }
}

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not configured. Database connection will fail until it is set.');
} else {
  console.log('Connecting to MongoDB Atlas...');
  mongoose.connect(MONGODB_URI, { dbName: 'PaperStack', serverSelectionTimeoutMS: 10000 })
    .then(() => {
      databaseStatus = 'connected';
      console.log('MongoDB connected successfully');
    })
    .catch((err) => {
      databaseStatus = 'disconnected';
      logMongoTroubleshooting(err);
    });
}

mongoose.connection.on('disconnected', () => {
  databaseStatus = 'disconnected';
});

mongoose.connection.on('connected', () => {
  databaseStatus = 'connected';
});

function getDatabaseStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : databaseStatus;
}

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    if (!isPdf) return cb(new Error('Only PDF files are allowed'));
    cb(null, true);
  },
});

const SUBJECT_ALIASES = {
  SE: 'Software Engineering',
  SS: 'System Software',
  ADC: 'Analog & Digital Communication',
  DAA: 'Design Analysis & Algorithm',
  DSA: 'Data Structure & Algorithms',
  OOT: 'Object Oriented Technology',
  DBMS: 'Database Management System',
  OS: 'Operating System',
  CN: 'Computer Networks',
};

const BRANCH_ALIASES = ['CSE', 'ECE', 'AI', 'AIML', 'IT'];
const ROMAN_SEMESTERS = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getBearerToken(req) {
  const header = req.header('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : header;
}

function buildUserResponse(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    semester: user.semester ?? user.currentSemester ?? null,
    currentSemester: user.currentSemester ?? user.semester ?? null,
    role: user.role || 'student',
    bookmarks: user.bookmarks || [],
    avatar: user.avatar || '',
    authProvider: user.authProvider || 'local',
  };
}

function signUserToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'student',
      semester: user.semester ?? user.currentSemester ?? null,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

async function makeUniqueUsername(baseValue) {
  const base = String(baseValue || 'student')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 32) || 'student';
  let candidate = base;
  let suffix = 1;
  while (await User.exists({ username: candidate })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function authenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Access denied: no token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authenticateAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Admin token required' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    if (verified.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.admin = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeRequestPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPaperRequestKey(source) {
  return [
    normalizeRequestPart(source.branch || 'CSE'),
    `sem${Number(source.semester) || ''}`,
    normalizeRequestPart(source.subjectCode || source.shortCode || source.subject),
    Number(source.year) || '',
    normalizeRequestPart(source.examType)
  ].join('-');
}

function publicPaperRequest(request) {
  return {
    id: request._id,
    _id: request._id,
    requestKey: request.requestKey,
    subject: request.subject,
    subjectCode: request.subjectCode,
    shortCode: request.shortCode,
    branch: request.branch,
    semester: request.semester,
    year: request.year,
    examType: request.examType,
    requestCount: request.requestCount || 0,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
}

function buildVoteSummary(votes = []) {
  const totalVotes = votes.length;
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  let usefulCount = 0;

  votes.forEach((vote) => {
    if (difficultyCounts[vote.difficulty] !== undefined) {
      difficultyCounts[vote.difficulty] += 1;
    }
    if (vote.useful === true) usefulCount += 1;
  });

  const dominantDifficulty = Object.entries(difficultyCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Medium';

  return {
    totalVotes,
    difficultyCounts,
    dominantDifficulty,
    usefulPercentage: totalVotes ? Math.round((usefulCount / totalVotes) * 100) : 0
  };
}

async function getVoteSummaryForPaper(paperId) {
  const votes = await PaperVote.find({ paperId }).lean();
  return buildVoteSummary(votes);
}

async function uploadBufferToCloudinary(file, folder = CLOUDINARY_FOLDER) {
  return new Promise((resolve, reject) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');

    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isPdf ? 'raw' : 'auto',
        filename_override: file.originalname,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    upload.end(file.buffer);
  });
}

async function destroyCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn('Cloudinary cleanup warning:', err.message);
  }
}

function detectExamType(source) {
  const text = source.toLowerCase();
  if (/\b(mid|midsem|mid-sem|mid semester|mse)\b/.test(text)) return 'Mid-Sem';
  if (/\b(end|endsem|end-sem|end semester|ese)\b/.test(text)) return 'End-Sem';
  return '';
}

function detectYear(source) {
  const match = source.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function detectSemester(source) {
  const semMatch = source.match(/\b(?:sem|semester)\s*[-:]?\s*([1-8]|viii|vii|vi|iv|iii|ii|i)\b/i)
    || source.match(/\b([1-8]|viii|vii|vi|iv|iii|ii|i)\s*(?:sem|semester)\b/i);
  if (!semMatch) return null;
  const raw = semMatch[1].toUpperCase();
  return ROMAN_SEMESTERS[raw] || Number(raw);
}

function detectBranch(source) {
  const upper = source.toUpperCase();
  const branch = BRANCH_ALIASES.find((item) => new RegExp(`\\b${item}\\b`, 'i').test(upper));
  return branch || 'CSE';
}

function normalizeSubject(source, existingSubjects = []) {
  const searchable = ` ${source.replace(/[_-]+/g, ' ')} `;
  const upper = searchable.toUpperCase();

  for (const [code, name] of Object.entries(SUBJECT_ALIASES)) {
    const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
    const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (codeRegex.test(searchable) || nameRegex.test(searchable)) {
      return { subject: name, normalizedSubject: name.toLowerCase(), subjectCode: code };
    }
  }

  const foundExisting = existingSubjects.find((subject) => {
    if (!subject) return false;
    return upper.includes(String(subject).toUpperCase());
  });
  if (foundExisting) {
    return { subject: foundExisting, normalizedSubject: foundExisting.toLowerCase(), subjectCode: '' };
  }

  const fileLike = source
    .replace(/\b(20\d{2})\b/g, ' ')
    .replace(/\b(mid|midsem|mid-sem|mid semester|mse|end|endsem|end-sem|end semester|ese)\b/gi, ' ')
    .replace(/\b(sem|semester)\s*[-:]?\s*([1-8]|viii|vii|vi|iv|iii|ii|i)\b/gi, ' ')
    .replace(/\b(cse|ece|aiml|ai|it)\b/gi, ' ')
    .replace(/\b(paper|question|exam|iiit|surat|pdf|pyq|previous|year)\b/gi, ' ');
  const subject = titleCase(fileLike).slice(0, 80);
  return {
    subject: subject || 'Unknown Subject',
    normalizedSubject: (subject || 'unknown subject').toLowerCase(),
    subjectCode: '',
  };
}

function createDuplicateKey({ branch, semester, normalizedSubject, subject, year, examType }) {
  if (!semester || !year || !examType || !(normalizedSubject || subject)) return '';
  return [
    slugify(branch || 'CSE'),
    `sem${semester}`,
    slugify(normalizedSubject || subject),
    year,
    slugify(examType),
  ].join('-');
}

async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer, { max: 3 });
    return (data.text || '').replace(/\s+/g, ' ').trim();
  } catch (err) {
    return '';
  }
}

function confidenceForExtraction(result) {
  let confidence = 10;
  if (result.subject && result.subject !== 'Unknown Subject') confidence += 25;
  if (result.semester) confidence += 15;
  if (result.year) confidence += 15;
  if (result.examType) confidence += 15;
  if (result.branch) confidence += 5;
  if (result.extractedTextPreview) confidence += 10;
  if (result.subjectCode) confidence += 5;
  return Math.min(confidence, 100);
}

async function buildExtraction(file, existingSubjects = []) {
  const originalFileName = file.originalname;
  const fileHash = hashBuffer(file.buffer);
  const text = await extractPdfText(file.buffer);
  const source = `${originalFileName} ${text}`;
  const subjectInfo = normalizeSubject(source, existingSubjects);
  const result = {
    originalFileName,
    title: titleCase(originalFileName.replace(/\.pdf$/i, '')),
    subject: subjectInfo.subject,
    normalizedSubject: subjectInfo.normalizedSubject,
    subjectCode: subjectInfo.subjectCode,
    branch: detectBranch(source),
    semester: detectSemester(source),
    year: detectYear(source),
    examType: detectExamType(source),
    fileHash,
    fileSize: file.size,
    mimeType: file.mimetype,
    extractedTextPreview: text.slice(0, 500),
    extractionWarnings: [],
  };

  if (!result.extractedTextPreview) result.extractionWarnings.push('Could not extract readable text from PDF; filename was used.');
  if (!result.subject || result.subject === 'Unknown Subject') result.extractionWarnings.push('Subject needs review.');
  if (!result.semester) result.extractionWarnings.push('Semester needs review.');
  if (!result.year) result.extractionWarnings.push('Year needs review.');
  if (!result.examType) result.extractionWarnings.push('Exam type needs review.');

  result.extractionConfidence = confidenceForExtraction(result);
  result.duplicateKey = createDuplicateKey(result);
  const duplicate = await findDuplicate(result.fileHash, result.duplicateKey);
  result.status = duplicate
    ? 'Duplicate'
    : result.extractionConfidence < 70 || result.extractionWarnings.length
      ? 'Needs Review'
      : 'Ready';
  if (duplicate) {
    result.duplicateType = duplicate.type;
    result.duplicatePaperId = duplicate.paper._id;
  }
  return result;
}

async function findDuplicate(fileHash, duplicateKey) {
  if (fileHash) {
    const exact = await Paper.findOne({ fileHash }).lean();
    if (exact) return { type: 'exact', paper: exact };
  }
  if (duplicateKey) {
    const logical = await Paper.findOne({ duplicateKey }).lean();
    if (logical) return { type: 'logical', paper: logical };
  }
  return null;
}

function buildPaperPayload(body, extraction, uploadResult, solutionResult, uploadMode) {
  const normalizedSubject = String(body.normalizedSubject || extraction.normalizedSubject || body.subject || '').toLowerCase();
  const payload = {
    title: body.title || extraction.title,
    subject: body.subject || extraction.subject,
    normalizedSubject,
    subjectCode: body.subjectCode || extraction.subjectCode || '',
    branch: body.branch || extraction.branch || 'CSE',
    semester: Number(body.semester || extraction.semester),
    examType: body.examType || extraction.examType,
    year: Number(body.year || extraction.year),
    originalFileName: extraction.originalFileName,
    filePath: uploadResult.secure_url || uploadResult.url,
    filePublicId: uploadResult.public_id,
    solutionPath: solutionResult ? solutionResult.secure_url || solutionResult.url : null,
    solutionPublicId: solutionResult ? solutionResult.public_id : null,
    fileHash: extraction.fileHash,
    duplicateKey: createDuplicateKey({
      branch: body.branch || extraction.branch || 'CSE',
      semester: Number(body.semester || extraction.semester),
      normalizedSubject,
      subject: body.subject || extraction.subject,
      year: Number(body.year || extraction.year),
      examType: body.examType || extraction.examType,
    }),
    fileSize: extraction.fileSize,
    mimeType: extraction.mimeType,
    extractedTextPreview: extraction.extractedTextPreview,
    extractionConfidence: Number(body.extractionConfidence || extraction.extractionConfidence || 0),
    extractionWarnings: Array.isArray(extraction.extractionWarnings) ? extraction.extractionWarnings : [],
    uploadedBy: body.uploadedBy || 'admin',
    uploadMode,
  };
  return payload;
}

function validateRequiredPaperFields(payload) {
  const missing = [];
  ['title', 'subject', 'branch', 'semester', 'year', 'examType'].forEach((key) => {
    if (!payload[key]) missing.push(key);
  });
  if (!['Mid-Sem', 'End-Sem'].includes(payload.examType)) missing.push('valid examType');
  return missing;
}

async function saveConfirmedPaper({ file, solutionFile, body, uploadMode }) {
  const existingSubjects = await Paper.distinct('subject');
  const extraction = await buildExtraction(file, existingSubjects);
  const normalizedBody = {
    ...body,
    normalizedSubject: body.normalizedSubject || String(body.subject || extraction.subject || '').toLowerCase(),
  };
  const duplicateKey = createDuplicateKey({
    branch: normalizedBody.branch || extraction.branch || 'CSE',
    semester: Number(normalizedBody.semester || extraction.semester),
    normalizedSubject: normalizedBody.normalizedSubject,
    subject: normalizedBody.subject || extraction.subject,
    year: Number(normalizedBody.year || extraction.year),
    examType: normalizedBody.examType || extraction.examType,
  });
  const duplicate = await findDuplicate(extraction.fileHash, duplicateKey);
  if (duplicate) {
    const subject = normalizedBody.subject || extraction.subject;
    return {
      skipped: true,
      status: 'Duplicate',
      message: `Duplicate paper skipped: ${subject} ${normalizedBody.examType || extraction.examType || ''} ${normalizedBody.year || extraction.year || ''}`.trim(),
      duplicateType: duplicate.type,
    };
  }

  const uploadResult = await uploadBufferToCloudinary(file);
  let solutionResult = null;
  try {
    if (solutionFile) solutionResult = await uploadBufferToCloudinary(solutionFile);
    const payload = buildPaperPayload(normalizedBody, extraction, uploadResult, solutionResult, uploadMode);
    payload.duplicateKey = duplicateKey;
    const missing = validateRequiredPaperFields(payload);
    if (missing.length) {
      await destroyCloudinary(uploadResult.public_id);
      if (solutionResult) await destroyCloudinary(solutionResult.public_id);
      return { skipped: true, status: 'Needs Review', message: `Missing fields: ${missing.join(', ')}` };
    }
    const paper = await new Paper(payload).save();
    return { skipped: false, status: 'Uploaded', paper };
  } catch (err) {
    await destroyCloudinary(uploadResult.public_id);
    if (solutionResult) await destroyCloudinary(solutionResult.public_id);
    if (err.code === 11000) {
      return { skipped: true, status: 'Duplicate', message: 'Duplicate paper skipped after database check.' };
    }
    throw err;
  }
}

function adminUploadFields(req, res, next) {
  pdfUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'solution', maxCount: 1 },
    { name: 'files', maxCount: 50 },
    { name: 'csv', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

const adminUploadCenterUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 160 },
  fileFilter: (req, file, cb) => {
    const isCsv = file.fieldname === 'csv' && (/\.csv$/i.test(file.originalname) || /csv/i.test(file.mimetype));
    const isPdf = ['paperFile', 'solutionFile', 'papers', 'solutions'].includes(file.fieldname) &&
      (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname));
    if (!isCsv && !isPdf) return cb(new Error('Only CSV mapping files and PDF uploads are allowed'));
    cb(null, true);
  },
});

function adminUploadCenterFields(req, res, next) {
  adminUploadCenterUpload.fields([
    { name: 'csv', maxCount: 1 },
    { name: 'paperFile', maxCount: 1 },
    { name: 'solutionFile', maxCount: 1 },
    { name: 'papers', maxCount: 80 },
    { name: 'solutions', maxCount: 80 },
  ])(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}

const ADMIN_UPLOAD_BRANCHES = ['CSE', 'ECE', 'CSE & ECE'];
const ADMIN_UPLOAD_EXAM_TYPES = ['Mid-Sem', 'End-Sem'];

function isUploadedPdf(file) {
  return Boolean(file && (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '')));
}

function normalizeAdminUploadSubject(subject, subjectCode) {
  const cleanSubject = String(subject || '').trim();
  const cleanCode = String(subjectCode || '').trim();
  return cleanCode ? `${cleanSubject} (${cleanCode})` : cleanSubject;
}

function parseSemesterValue(value) {
  const match = String(value || '').match(/[1-8]/);
  return match ? Number(match[0]) : NaN;
}

function buildAdminUploadPaperBody(body) {
  const branch = String(body.branch || '').trim();
  const subject = normalizeAdminUploadSubject(body.subject, body.subjectCode);
  return {
    title: String(body.title || '').trim() || `Branch : ${branch}`,
    subject,
    normalizedSubject: subject.toLowerCase(),
    subjectCode: String(body.subjectCode || '').trim(),
    branch,
    semester: parseSemesterValue(body.semester),
    year: Number(body.year),
    examType: String(body.examType || '').trim(),
    views: 0,
    downloads: 0,
    uploadedBy: 'admin',
  };
}

function validateAdminUploadBody(body, requireFileName = false) {
  const errors = [];
  if (requireFileName && !String(body.fileName || '').trim()) errors.push('Missing required field: fileName');
  if (!String(body.subject || '').trim()) errors.push('Missing required field: subject');
  if (!ADMIN_UPLOAD_BRANCHES.includes(String(body.branch || '').trim())) errors.push('Invalid branch');
  const semester = parseSemesterValue(body.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) errors.push('Invalid semester');
  if (!ADMIN_UPLOAD_EXAM_TYPES.includes(String(body.examType || '').trim())) errors.push('Invalid exam type');
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.push('Missing required field: year');
  return errors;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function parseAdminUploadCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = { rowNumber: index + 2 };
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || '';
    });
    return row;
  });
}

function mapFilesByName(files = []) {
  return new Map(files.map((file) => [file.originalname, file]));
}

async function validateAdminUploadRows(rows, paperFiles, solutionFiles, includeDuplicateWarnings = true) {
  const paperMap = mapFilesByName(paperFiles);
  const solutionMap = mapFilesByName(solutionFiles);
  const validatedRows = [];

  for (const rawRow of rows) {
    const row = {
      rowNumber: rawRow.rowNumber,
      fileName: String(rawRow.fileName || '').trim(),
      solutionFileName: String(rawRow.solutionFileName || '').trim(),
      branch: String(rawRow.branch || '').trim(),
      semester: String(rawRow.semester || '').trim(),
      subject: String(rawRow.subject || '').trim(),
      subjectCode: String(rawRow.subjectCode || '').trim(),
      examType: String(rawRow.examType || '').trim(),
      year: String(rawRow.year || '').trim(),
      title: String(rawRow.title || '').trim() || `Branch : ${String(rawRow.branch || '').trim()}`,
      status: 'Ready',
      errors: [],
      warnings: [],
    };

    row.errors.push(...validateAdminUploadBody(row, true));
    if (row.fileName && !paperMap.has(row.fileName)) row.errors.push('Missing PDF file');
    if (row.solutionFileName && !solutionMap.has(row.solutionFileName)) row.errors.push('Missing solution PDF file');

    if (includeDuplicateWarnings && !row.errors.length) {
      const subject = normalizeAdminUploadSubject(row.subject, row.subjectCode);
      const duplicate = await Paper.findOne({
        title: row.title,
        subject,
        semester: Number(row.semester),
        year: Number(row.year),
        examType: row.examType,
      }).lean();
      if (duplicate) row.warnings.push('Duplicate paper already exists');
    }

    if (row.errors.length) {
      const priority = ['Missing required field', 'Missing PDF file', 'Invalid branch', 'Invalid semester', 'Invalid exam type'];
      row.status = priority.find((label) => row.errors.some((error) => error.includes(label) || error === label)) || row.errors[0];
    }
    validatedRows.push(row);
  }

  return validatedRows;
}

app.post('/api/admin/upload/single', authenticateAdmin, adminUploadCenterFields, async (req, res) => {
  let paperUpload = null;
  let solutionUpload = null;
  try {
    const paperFile = req.files?.paperFile?.[0];
    const solutionFile = req.files?.solutionFile?.[0];
    const errors = validateAdminUploadBody(req.body);
    if (!paperFile) errors.push('Paper PDF file is required');
    if (paperFile && !isUploadedPdf(paperFile)) errors.push('Paper file must be a PDF');
    if (solutionFile && !isUploadedPdf(solutionFile)) errors.push('Solution file must be a PDF');
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });

    const paperBody = buildAdminUploadPaperBody(req.body);
    const duplicate = await Paper.findOne({
      title: paperBody.title,
      subject: paperBody.subject,
      semester: paperBody.semester,
      year: paperBody.year,
      examType: paperBody.examType,
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate paper already exists',
      });
    }

    paperUpload = await uploadBufferToCloudinary(paperFile);
    if (solutionFile) solutionUpload = await uploadBufferToCloudinary(solutionFile);

    const payload = {
      ...paperBody,
      filePath: paperUpload.secure_url || paperUpload.url,
      filePublicId: paperUpload.public_id,
      solutionPath: solutionUpload ? solutionUpload.secure_url || solutionUpload.url : '',
      solutionPublicId: solutionUpload ? solutionUpload.public_id : '',
      originalFileName: paperFile.originalname,
      mimeType: paperFile.mimetype,
      fileSize: paperFile.size,
      uploadMode: 'admin',
    };

    const paper = await new Paper(payload).save();
    res.status(201).json({ success: true, message: 'Paper uploaded successfully', paper });
  } catch (err) {
    if (paperUpload) await destroyCloudinary(paperUpload.public_id);
    if (solutionUpload) await destroyCloudinary(solutionUpload.public_id);

    console.error('Admin single upload failed:', {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack
    });

    res.status(500).json({
      success: false,
      message: 'Paper upload failed',
      error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
});

app.post('/api/admin/upload/bulk/preview', authenticateAdmin, adminUploadCenterFields, async (req, res) => {
  try {
    const csvFile = req.files?.csv?.[0];
    if (!csvFile) return res.status(400).json({ success: false, message: 'CSV mapping file is required' });
    const rows = parseAdminUploadCsv(csvFile.buffer);
    const validatedRows = await validateAdminUploadRows(rows, req.files?.papers || [], req.files?.solutions || []);
    const errorRows = validatedRows.filter((row) => row.errors.length).length;
    res.json({
      success: true,
      rows: validatedRows,
      summary: {
        totalRows: validatedRows.length,
        readyRows: validatedRows.length - errorRows,
        errorRows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Bulk preview failed', error: err.message });
  }
});

app.post('/api/admin/upload/bulk/confirm', authenticateAdmin, adminUploadCenterFields, async (req, res) => {
  const results = [];
  try {
    const csvFile = req.files?.csv?.[0];
    if (!csvFile) return res.status(400).json({ success: false, message: 'CSV mapping file is required' });
    const paperFiles = req.files?.papers || [];
    const solutionFiles = req.files?.solutions || [];
    const rows = parseAdminUploadCsv(csvFile.buffer);
    const validatedRows = await validateAdminUploadRows(rows, paperFiles, solutionFiles, false);
    const blockingRows = validatedRows.filter((row) => row.errors.length);
    if (blockingRows.length) {
      return res.status(400).json({
        success: false,
        message: 'Bulk upload has validation errors',
        rows: validatedRows,
      });
    }

    const paperMap = mapFilesByName(paperFiles);
    const solutionMap = mapFilesByName(solutionFiles);

    for (const row of validatedRows) {
      let paperUpload = null;
      let solutionUpload = null;
      try {
        const subject = normalizeAdminUploadSubject(row.subject, row.subjectCode);
        const duplicate = await Paper.findOne({
          title: row.title,
          subject,
          semester: Number(row.semester),
          year: Number(row.year),
          examType: row.examType,
        }).lean();
        if (duplicate) {
          results.push({ rowNumber: row.rowNumber, fileName: row.fileName, status: 'skipped', paperId: duplicate._id, error: 'Duplicate paper already exists' });
          continue;
        }

        const paperFile = paperMap.get(row.fileName);
        const solutionFile = row.solutionFileName ? solutionMap.get(row.solutionFileName) : null;
        paperUpload = await uploadBufferToCloudinary(paperFile);
        if (solutionFile) solutionUpload = await uploadBufferToCloudinary(solutionFile);

        const paper = await new Paper({
          ...buildAdminUploadPaperBody(row),
          filePath: paperUpload.secure_url || paperUpload.url,
          filePublicId: paperUpload.public_id,
          solutionPath: solutionUpload ? solutionUpload.secure_url || solutionUpload.url : '',
          solutionPublicId: solutionUpload ? solutionUpload.public_id : '',
          originalFileName: paperFile.originalname,
          mimeType: paperFile.mimetype,
          fileSize: paperFile.size,
          uploadMode: 'admin',
        }).save();
        results.push({ rowNumber: row.rowNumber, fileName: row.fileName, status: 'uploaded', paperId: paper._id });
      } catch (rowErr) {
        if (paperUpload) await destroyCloudinary(paperUpload.public_id);
        if (solutionUpload) await destroyCloudinary(solutionUpload.public_id);
        results.push({ rowNumber: row.rowNumber, fileName: row.fileName, status: 'failed', error: rowErr.message });
      }
    }

    const summary = {
      totalRows: validatedRows.length,
      uploaded: results.filter((item) => item.status === 'uploaded').length,
      failed: results.filter((item) => item.status === 'failed').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
    };

    res.json({ success: true, message: 'Bulk upload completed', summary, results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Bulk upload failed', error: err.message, results });
  }
});

app.get('/', (req, res) => {
  res.status(200).send('PaperStack API is healthy');
});

app.get('/sitemap.xml', (req, res) => {
  const paths = ['/', '/about', '/contact', '/contribute', '/privacy-policy', '/terms', '/disclaimer', '/copyright', '/faq', '/login', '/register'];
  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url>
    <loc>${FRONTEND_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === '/' ? 'daily' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : '0.6'}</priority>
  </url>`).join('\n')}
</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});

app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: ${FRONTEND_URL}/sitemap.xml`);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Authentication is not configured.' });
    }

    const username = String(req.body.username || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const semester = req.body.semester || req.body.currentSemester || 1;

    if (!username) return res.status(400).json({ success: false, message: 'Username is required.' });
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });
    if (!isAllowedInstituteEmail(email)) {
      return res.status(403).json({ success: false, message: 'Only iiitsurat.ac.in emails are allowed.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Account already exists. Please login.' });
    }

    const existingUsername = await User.findOne({ username }).lean();
    if (existingUsername) {
      return res.status(409).json({ success: false, message: 'Username already exists. Please choose another.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await new User({
      username,
      email,
      password: hashedPassword,
      semester: Number(semester) || 1,
      currentSemester: Number(semester) || 1,
      role: 'student',
      authProvider: 'local',
      emailVerified: true,
    }).save();

    const token = signUserToken(user);
    res.status(201).json({ success: true, message: 'User registered successfully', token, user: buildUserResponse(user) });
  } catch (err) {
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      const message = duplicateField === 'email'
        ? 'Account already exists. Please login.'
        : 'Account already exists with these details.';
      return res.status(409).json({ success: false, message });
    }
    console.error('Registration failed:', err.message);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Authentication is not configured.' });
    }

    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });
    if (!isAllowedInstituteEmail(email)) {
      return res.status(403).json({ success: false, message: 'Only iiitsurat.ac.in emails are allowed.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'This account uses Google sign-in. Please continue with Google.' });
    }
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    const token = signUserToken(user);
    const safeUser = buildUserResponse(user);
    res.json({ success: true, token, ...safeUser, user: safeUser });
  } catch (err) {
    console.error('Login failed:', err.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Authentication is not configured.' });
    }
    if (!GOOGLE_CLIENT_ID || !googleClient || !isValidGoogleClientId(GOOGLE_CLIENT_ID)) {
      return res.status(500).json({ success: false, message: 'Google Client ID is not configured correctly.' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required.' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      console.error('Google credential verification failed:', verifyErr.message);
      return res.status(401).json({ success: false, message: 'Google login could not be verified. Please check Google configuration.' });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email_verified !== true) {
      console.error('Google credential verification failed: missing verified email');
      return res.status(401).json({ success: false, message: 'Google login could not be verified. Please check Google configuration.' });
    }

    const email = normalizeEmail(payload.email);
    if (!isAllowedInstituteEmail(email)) {
      console.error('Google login blocked: invalid email domain');
      return res.status(403).json({ success: false, message: 'Only IIIT Surat email accounts are allowed.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Please create a manual account first, then use Google login.'
      });
    }

    let changed = false;
    if (!user.googleId && payload.sub) {
      user.googleId = payload.sub;
      changed = true;
    }
    if (user.authProvider === 'local') {
      user.authProvider = 'linked';
      changed = true;
    }
    if (!user.avatar && payload.picture) {
      user.avatar = payload.picture;
      changed = true;
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      changed = true;
    }
    if (changed) {
      await user.save();
    }

    const token = signUserToken(user);
    res.json({ success: true, token, user: buildUserResponse(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Account already exists. Please login.' });
    }
    console.error('Google login failed:', err.message);
    res.status(500).json({ success: false, message: 'Google login failed' });
  }
});

app.get('/api/user/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('username email semester currentSemester role bookmarks avatar authProvider').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(buildUserResponse(user));
  } catch (err) {
    res.status(500).json({ error: 'Could not load user' });
  }
});

app.post('/api/admin/verify', (req, res) => {
  if (!ADMIN_PASSWORD || !JWT_SECRET) return res.status(500).json({ error: 'Admin authentication is not configured' });
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: 'Wrong password' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '4h' });
  res.json({ success: true, token, expiresIn: '4h' });
});

app.post('/api/admin/extract-paper', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const file = req.files?.file?.[0];
    if (!file) return res.status(400).json({ error: 'Paper PDF is required' });
    const existingSubjects = await Paper.distinct('subject');
    const extraction = await buildExtraction(file, existingSubjects);
    res.json(extraction);
  } catch (err) {
    res.status(500).json({ error: 'Extraction failed' });
  }
});

app.post('/api/admin/extract-bulk-papers', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const files = req.files?.files || req.files?.file || [];
    if (!files.length) return res.status(400).json({ error: 'At least one PDF is required' });
    const existingSubjects = await Paper.distinct('subject');
    const rows = await Promise.all(files.map((file) => buildExtraction(file, existingSubjects).catch((err) => ({
      originalFileName: file.originalname,
      status: 'Error',
      extractionConfidence: 0,
      extractionWarnings: [err.message || 'Extraction failed'],
    }))));
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: 'Bulk extraction failed' });
  }
});

app.post('/api/admin/confirm-upload', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const file = req.files?.file?.[0];
    if (!file) return res.status(400).json({ error: 'Paper PDF is required' });
    const solutionFile = req.files?.solution?.[0] || null;
    const result = await saveConfirmedPaper({ file, solutionFile, body: req.body, uploadMode: 'normal' });
    const status = result.skipped ? 409 : 201;
    res.status(status).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Confirm upload failed' });
  }
});

app.post('/api/admin/confirm-bulk-upload', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const files = req.files?.files || [];
    const rows = JSON.parse(req.body.rows || '[]');
    if (!files.length) return res.status(400).json({ error: 'At least one PDF is required' });
    const results = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const row = rows[index] || rows.find((item) => item.originalFileName === file.originalname) || {};
      if (row.status === 'Duplicate' || row.status === 'Error') {
        results.push({ originalFileName: file.originalname, skipped: true, status: row.status, message: `${row.status}: ${file.originalname}` });
      } else {
        const result = await saveConfirmedPaper({ file, solutionFile: null, body: row, uploadMode: 'bulk' });
        results.push({ originalFileName: file.originalname, ...result });
      }
    }
    res.json({
      uploaded: results.filter((item) => !item.skipped).length,
      skipped: results.filter((item) => item.skipped).length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseBulkCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
}

app.post('/api/admin/bulk-upload', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const files = req.files?.files || [];
    const csvFile = req.files?.csv?.[0];
    if (!files.length) return res.status(400).json({ error: 'At least one PDF is required' });
    if (!csvFile) return res.status(400).json({ error: 'CSV metadata file is required' });

    const rows = parseBulkCsv(csvFile.buffer);
    const rowMap = new Map(rows.map((row) => [String(row.fileName || '').trim(), row]));
    const override = String(req.body.override || 'false') === 'true';
    const results = [];

    for (const file of files) {
      const row = rowMap.get(file.originalname);
      if (!row) {
        results.push({ fileName: file.originalname, skipped: true, status: 'Error', error: 'No CSV row matched this fileName' });
        continue;
      }

      const body = {
        title: row.title,
        subject: row.subject,
        subjectCode: row.subjectCode || row.shortCode,
        branch: row.branch || 'CSE',
        semester: row.semester,
        year: row.year,
        examType: row.examType,
        originalFileName: file.originalname
      };

      const duplicateKey = createDuplicateKey({
        branch: body.branch,
        semester: body.semester,
        normalizedSubject: String(body.subject || '').toLowerCase(),
        subject: body.subject,
        year: body.year,
        examType: body.examType
      });

      if (!override && await findDuplicate(hashBuffer(file.buffer), duplicateKey)) {
        results.push({ fileName: file.originalname, skipped: true, status: 'Duplicate', error: 'Duplicate paper skipped' });
        continue;
      }

      try {
        const result = await saveConfirmedPaper({ file, solutionFile: null, body, uploadMode: 'bulk' });
        results.push({ fileName: file.originalname, ...result });
      } catch (rowErr) {
        results.push({ fileName: file.originalname, skipped: true, status: 'Error', error: rowErr.message });
      }
    }

    res.json({
      uploaded: results.filter((item) => !item.skipped).length,
      skippedDuplicates: results.filter((item) => item.status === 'Duplicate').length,
      failedRows: results.filter((item) => item.status === 'Error').length,
      skipped: results.filter((item) => item.skipped).length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'CSV bulk upload failed' });
  }
});

app.post('/api/upload', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const file = req.files?.file?.[0];
    if (!file) return res.status(400).json({ error: 'Paper PDF is required' });
    const solutionFile = req.files?.solution?.[0] || null;
    const result = await saveConfirmedPaper({ file, solutionFile, body: req.body, uploadMode: 'admin' });
    res.status(result.skipped ? 409 : 201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/papers', authenticateAdmin, adminUploadFields, async (req, res) => {
  try {
    const file = req.files?.file?.[0];
    if (!file) return res.status(400).json({ error: 'Paper PDF is required' });
    const result = await saveConfirmedPaper({ file, solutionFile: null, body: req.body, uploadMode: 'admin' });
    res.status(result.skipped ? 409 : 201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/papers', async (req, res) => {
  try {
    const papers = await Paper.find().sort({ year: -1, semester: 1, createdAt: -1 }).lean();
    const paperIds = papers.map((paper) => paper._id);
    const votes = paperIds.length ? await PaperVote.find({ paperId: { $in: paperIds } }).lean() : [];
    const votesByPaper = new Map();

    votes.forEach((vote) => {
      const key = String(vote.paperId);
      if (!votesByPaper.has(key)) votesByPaper.set(key, []);
      votesByPaper.get(key).push(vote);
    });

    const papersWithVotes = papers.map((paper) => ({
      ...paper,
      voteSummary: buildVoteSummary(votesByPaper.get(String(paper._id)) || [])
    }));

    if (process.env.NODE_ENV !== 'production') {
      console.log('Paper query debug:', {
        database: mongoose.connection.name,
        paperCollection: Paper.collection.name,
        paperCount: papersWithVotes.length,
      });
    }
    res.json(papersWithVotes);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/db', async (req, res) => {
    try {
      const paperCount = await Paper.countDocuments();
      const samplePaper = await Paper.findOne()
        .select('title subject semester year examType')
        .lean();

      res.json({
        database: mongoose.connection.name,
        paperCollection: Paper.collection.name,
        paperCount,
        samplePaper: samplePaper ? {
          title: samplePaper.title,
          subject: samplePaper.subject,
          semester: samplePaper.semester,
          year: samplePaper.year,
          examType: samplePaper.examType,
        } : null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Debug database check failed' });
    }
  });

  app.get('/api/debug/google-auth', (req, res) => {
    const isConfigured = !!GOOGLE_CLIENT_ID;
    res.json({
      googleClientConfigured: isConfigured,
      googleClientIdSuffix: isConfigured ? String(GOOGLE_CLIENT_ID).slice(-12) : '',
      googleClientIdPreview: maskValue(GOOGLE_CLIENT_ID),
      allowedEmailDomain: ALLOWED_EMAIL_DOMAIN
    });
  });

  app.get('/api/debug/auth-config', (req, res) => {
    res.json({
      serverOk: true,
      mongoConnected: getDatabaseStatus() === 'connected',
      jwtConfigured: Boolean(JWT_SECRET),
      googleClientConfigured: Boolean(GOOGLE_CLIENT_ID && isValidGoogleClientId(GOOGLE_CLIENT_ID)),
      googleClientIdPreview: maskValue(GOOGLE_CLIENT_ID),
      allowedEmailDomain: ALLOWED_EMAIL_DOMAIN,
      frontendUrl: FRONTEND_URL
    });
  });
}

app.post('/api/papers/:id/view', async (req, res) => {
  try {
    await Paper.findByIdAndUpdate(req.params.id, { $inc: { views: 1 }, updatedAt: new Date() });
    res.status(200).json({ message: 'View counted' });
  } catch (err) {
    res.status(500).json({ error: 'Could not count view' });
  }
});

app.post('/api/papers/:id/download', async (req, res) => {
  try {
    await Paper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 }, updatedAt: new Date() });
    res.status(200).json({ message: 'Download counted' });
  } catch (err) {
    res.status(500).json({ error: 'Error counting download' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const papers = await Paper.find().select('title subject normalizedSubject semester examType year views downloads branch').lean();
    const subjectMap = new Map();
    const semMap = new Map();
    const examMap = new Map();
    let mostViewed = null;
    let mostDownloaded = null;

    papers.forEach((paper) => {
      const subject = paper.subject || paper.normalizedSubject || 'Unknown Subject';
      const current = subjectMap.get(subject) || { subject, views: 0, downloads: 0, paperCount: 0, difficultyScore: 0 };
      current.views += paper.views || 0;
      current.downloads += paper.downloads || 0;
      current.paperCount += 1;
      current.difficultyScore = current.views + current.downloads + current.paperCount * 5;
      subjectMap.set(subject, current);

      const sem = paper.semester || 'Unknown';
      semMap.set(sem, (semMap.get(sem) || 0) + 1);
      const exam = paper.examType || 'Unknown';
      examMap.set(exam, (examMap.get(exam) || 0) + 1);

      if (!mostViewed || (paper.views || 0) > (mostViewed.views || 0)) mostViewed = paper;
      if (!mostDownloaded || (paper.downloads || 0) > (mostDownloaded.downloads || 0)) mostDownloaded = paper;
    });

    const subjects = Array.from(subjectMap.values()).sort((a, b) => b.difficultyScore - a.difficultyScore);
    const mostViewedPapers = [...papers].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const mostDownloadedPapers = [...papers].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5);

    const totalViews = papers.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalDownloads = papers.reduce((sum, p) => sum + (p.downloads || 0), 0);
    const totalContributors = await Contribution.distinct('contributorUserId', { status: 'approved' });
    const totalApprovedContributions = await Contribution.countDocuments({ status: 'approved' });

    const combos = [];
    const comboMap = new Set();
    papers.forEach(p => {
      if (!p.branch || !p.semester || !p.subject || !p.examType) return;
      const key = `${p.branch}-${p.semester}-${p.subject}-${p.examType}`;
      if (!comboMap.has(key)) {
        comboMap.add(key);
        combos.push(p);
      }
    });
    const currentYear = new Date().getFullYear();
    let missingCount = 0;
    combos.forEach(c => {
      for (let y = 2021; y <= currentYear; y++) {
        const found = papers.some(p => 
          p.branch === c.branch &&
          p.semester === c.semester &&
          p.subject === c.subject &&
          p.examType === c.examType &&
          p.year === y
        );
        if (!found) missingCount++;
      }
    });

    const trendingSubjects = Array.from(subjectMap.values())
      .sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads))
      .slice(0, 3)
      .map(s => s.subject);

    res.json({
      totalPapers: papers.length,
      totalViews,
      totalDownloads,
      totalContributors: totalContributors.length || 5,
      hardestSubject: subjects[0]?.subject || '',
      mostViewed: mostViewed ? { subject: mostViewed.subject, title: mostViewed.title, views: mostViewed.views || 0 } : null,
      mostDownloaded: mostDownloaded ? { subject: mostDownloaded.subject, title: mostDownloaded.title, downloads: mostDownloaded.downloads || 0 } : null,
      subjects,
      semesterDistribution: Array.from(semMap.entries()).map(([semester, paperCount]) => ({ semester, paperCount })),
      examTypeDistribution: Array.from(examMap.entries()).map(([examType, paperCount]) => ({ examType, paperCount })),
      mostViewedPapers,
      mostDownloadedPapers,
      trendingSubjects,
      missingPaperStats: {
        missingCount
      },
      contributionStats: {
        totalApproved: totalApprovedContributions
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Analytics failed' });
  }
});

function flattenSubjectCatalog() {
  const map = new Map();
  SUBJECT_CATALOG.forEach((entry) => {
    entry.subjects.forEach((subject) => {
      const key = subject.shortCode || subject.code || subject.name;
      if (!map.has(key)) {
        map.set(key, {
          ...subject,
          branches: new Set(),
          semesters: new Set()
        });
      }
      map.get(key).branches.add(entry.branch);
      map.get(key).semesters.add(entry.semester);
    });
  });

  return Array.from(map.values()).map((subject) => ({
    ...subject,
    branches: Array.from(subject.branches),
    semesters: Array.from(subject.semesters).sort((a, b) => a - b)
  }));
}

function paperMatchesSubjectMeta(paper, subjectMeta) {
  const paperPool = [
    paper.subject,
    paper.normalizedSubject,
    paper.subjectCode,
    paper.shortCode,
    paper.title
  ].map(normalizeMissingSubject).join(' ');

  return [
    subjectMeta.name,
    subjectMeta.code,
    subjectMeta.shortCode,
    ...(subjectMeta.aliases || [])
  ]
    .map(normalizeMissingSubject)
    .some((candidate) => candidate && paperPool.includes(candidate));
}

function buildSubjectInsight(subjectMeta, papers) {
  const matched = papers.filter((paper) => paperMatchesSubjectMeta(paper, subjectMeta));
  const availableYears = Array.from(new Set(matched.map((paper) => Number(paper.year)).filter(Boolean))).sort((a, b) => b - a);
  const missingYears = EXPECTED_YEARS.filter((year) => !availableYears.includes(Number(year)));
  const mostDownloadedPaper = [...matched].sort((a, b) => (b.downloads || 0) - (a.downloads || 0))[0] || null;
  const latestUploadedPaper = [...matched].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;

  return {
    subject: subjectMeta.name,
    subjectCode: subjectMeta.shortCode || subjectMeta.code,
    catalogCode: subjectMeta.code,
    branchCoverage: Array.from(new Set(matched.map((paper) => paper.branch).filter(Boolean))).sort(),
    catalogBranches: subjectMeta.branches,
    semestersAvailable: Array.from(new Set(matched.map((paper) => paper.semester).filter(Boolean))).sort((a, b) => a - b),
    catalogSemesters: subjectMeta.semesters,
    totalPapers: matched.length,
    midSemCount: matched.filter((paper) => paper.examType === 'Mid-Sem').length,
    endSemCount: matched.filter((paper) => paper.examType === 'End-Sem').length,
    solutionCount: matched.filter((paper) => paper.solutionPath).length,
    totalViews: matched.reduce((sum, paper) => sum + Number(paper.views || 0), 0),
    totalDownloads: matched.reduce((sum, paper) => sum + Number(paper.downloads || 0), 0),
    missingYears,
    mostDownloadedPaper,
    latestUploadedPaper,
    recommendedPapers: [...matched].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 6)
  };
}

app.get('/api/subjects/insights', async (req, res) => {
  try {
    const papers = await Paper.find().lean();
    const insights = flattenSubjectCatalog()
      .map((subject) => buildSubjectInsight(subject, papers))
      .sort((a, b) => b.totalPapers - a.totalPapers);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load subject insights' });
  }
});

app.get('/api/subjects/insights/:subjectCode', async (req, res) => {
  try {
    const requested = normalizeMissingSubject(req.params.subjectCode);
    const subject = flattenSubjectCatalog().find((item) => {
      return [
        item.name,
        item.code,
        item.shortCode,
        ...(item.aliases || [])
      ].map(normalizeMissingSubject).includes(requested);
    });

    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    const papers = await Paper.find().lean();
    res.json(buildSubjectInsight(subject, papers));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load subject insight' });
  }
});

async function getContributorsLeaderboard() {
  const list = await Contribution.find({ status: 'approved' }).lean();
  const map = {};

  list.forEach((contribution) => {
    const userKey = contribution.contributorUserId
      ? contribution.contributorUserId.toString()
      : String(contribution.contributorEmail || contribution.contributorName || 'unknown').toLowerCase();

    if (!map[userKey]) {
      map[userKey] = {
        userId: contribution.contributorUserId || userKey,
        name: contribution.contributorName,
        email: contribution.contributorEmail,
        approvedPapers: 0,
        approvedSolutions: 0,
        fulfilledMissingPapers: 0,
        totalPoints: 0
      };
    }

    map[userKey].approvedPapers += 1;
    if (contribution.solutionUrl) map[userKey].approvedSolutions += 1;
    if (contribution.fulfilledMissingPaper || contribution.fulfilledRequestId) {
      map[userKey].fulfilledMissingPapers += 1;
    }
  });

  return Object.values(map)
    .map((item) => ({
      ...item,
      approvedCount: item.approvedPapers,
      solutionCount: item.approvedSolutions,
      points:
        (item.approvedPapers * 10) +
        (item.approvedSolutions * 15) +
        (item.fulfilledMissingPapers * 20)
    }))
    .sort((a, b) => b.points - a.points)
    .map((item, index) => {
      const badges = [];
      if (index === 0) badges.push('Archive Champion');
      if (index === 1) badges.push('Paper Legend');
      if (index === 2) badges.push('Study Hero');
      if (item.points >= 50) badges.push('Top Contributor');
      if (item.points >= 20) badges.push('Paper Hunter');
      if (item.approvedPapers >= 1) badges.push('Verified Uploader');

      return {
        ...item,
        rank: index + 1,
        totalPoints: item.points,
        badge: badges[0] || 'New Contributor',
        badges
      };
    });
}

// V2 Route: GET Contributors Leaderboard
app.get('/api/contributors/leaderboard', async (req, res) => {
  try {
    res.json(await getContributorsLeaderboard());
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

app.get('/api/contributors', async (req, res) => {
  try {
    res.json(await getContributorsLeaderboard());
  } catch (err) {
    res.status(500).json({ error: 'Failed to load contributors' });
  }
});

// V2 Route: GET Exam Mode
app.get('/api/exam-mode', async (req, res) => {
  try {
    const { branch, semester, subject, examType } = req.query;
    if (!branch || !semester || !subject || !examType) {
      return res.status(400).json({ error: 'Missing query parameters' });
    }

    const query = {
      branch,
      semester: Number(semester),
      subject,
      examType
    };

    const papers = await Paper.find(query).lean();
    const availableYears = Array.from(new Set(papers.map(p => p.year).filter(Boolean))).sort((a, b) => b - a);

    const currentYear = new Date().getFullYear();
    const expectedYears = [];
    for (let y = 2021; y <= currentYear; y++) {
      expectedYears.push(y);
    }
    const missingYears = expectedYears.filter(y => !availableYears.includes(y)).sort((a, b) => b - a);

    let mostViewed = null;
    let mostDownloaded = null;
    let totalViews = 0;
    let totalDownloads = 0;
    let solutionCount = 0;

    papers.forEach(p => {
      totalViews += (p.views || 0);
      totalDownloads += (p.downloads || 0);
      if (p.solutionPath) solutionCount++;

      if (!mostViewed || (p.views || 0) > (mostViewed.views || 0)) {
        mostViewed = p;
      }
      if (!mostDownloaded || (p.downloads || 0) > (mostDownloaded.downloads || 0)) {
        mostDownloaded = p;
      }
    });

    const recommendedOrder = [...papers].sort((a, b) => (b.year || 0) - (a.year || 0));

    res.json({
      subject,
      branch,
      semester: Number(semester),
      examType,
      availableYears,
      missingYears,
      papers,
      mostViewed,
      mostDownloaded,
      recommendedOrder,
      quickStats: {
        totalPapers: papers.length,
        totalViews,
        totalDownloads,
        solutionCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exam mode data' });
  }
});

// V2 Route: POST User Contribution
app.get('/api/contributions/mine', authenticate, async (req, res) => {
  try {
    const list = await Contribution.find({ contributorUserId: req.user._id || req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load your contributions' });
  }
});

app.post('/api/contributions', authenticate, adminUploadFields, async (req, res) => {
  try {
    const existingSubjects = await Paper.distinct('subject');
    const file = req.files?.file?.[0];
    if (!file) return res.status(400).json({ error: 'Paper PDF file is required' });
    const solutionFile = req.files?.solution?.[0] || null;

    const extraction = await buildExtraction(file, existingSubjects);

    const duplicateKey = createDuplicateKey({
      branch: req.body.branch || extraction.branch || 'CSE',
      semester: Number(req.body.semester || extraction.semester),
      normalizedSubject: String(req.body.subject || extraction.subject).toLowerCase(),
      subject: req.body.subject || extraction.subject,
      year: Number(req.body.year || extraction.year),
      examType: req.body.examType || extraction.examType
    });

    const duplicate = await findDuplicate(extraction.fileHash, duplicateKey);
    if (duplicate) {
      return res.status(409).json({
        error: 'This paper may already exist.',
        duplicateType: duplicate.type,
        message: 'Duplicate paper detected by content hash or metadata combination.'
      });
    }

    const uploadResult = await uploadBufferToCloudinary(file);
    let solutionResult = null;
    if (solutionFile) {
      solutionResult = await uploadBufferToCloudinary(solutionFile);
    }

    const contribution = await new Contribution({
      contributorUserId: req.user._id,
      contributorName: req.user.username,
      contributorEmail: req.user.email || `${req.user.username}@iiitsurat.ac.in`,
      branch: req.body.branch || extraction.branch || 'CSE',
      semester: Number(req.body.semester || extraction.semester),
      subject: req.body.subject || extraction.subject,
      normalizedSubject: String(req.body.subject || extraction.subject).toLowerCase(),
      subjectCode: req.body.subjectCode || extraction.subjectCode || '',
      title: req.body.title || extraction.title,
      year: Number(req.body.year || extraction.year),
      examType: req.body.examType || extraction.examType,
      paperUrl: uploadResult.secure_url || uploadResult.url,
      paperPublicId: uploadResult.public_id,
      solutionUrl: solutionResult ? (solutionResult.secure_url || solutionResult.url) : null,
      solutionPublicId: solutionResult ? solutionResult.public_id : null,
      notes: req.body.notes || '',
      fileHash: extraction.fileHash,
      duplicateKey,
      status: 'pending'
    }).save();

    res.status(201).json({
      success: true,
      message: 'Contribution submitted successfully. It will appear after admin approval.',
      contribution
    });

    sendContributionEmail(contribution).catch((mailError) => {
      console.warn('Contribution email notification failed:', mailError.message);
    });
  } catch (err) {
    console.error('Contribution upload failed:', {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack
    });

    res.status(500).json({
      success: false,
      message: 'Contribution upload failed',
      error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
});

// V2 Route: GET Admin Contributions
app.get('/api/admin/contributions', authenticateAdmin, async (req, res) => {
  try {
    const list = await Contribution.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// V2 Route: PATCH Approve Contribution
app.patch('/api/admin/contributions/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.status === 'approved') return res.status(400).json({ error: 'Already approved' });

    const subject = req.body.subject || contribution.subject;
    const title = req.body.title || contribution.title;
    const branch = req.body.branch || contribution.branch || 'CSE';
    const semester = Number(req.body.semester || contribution.semester);
    const year = Number(req.body.year || contribution.year);
    const examType = req.body.examType || contribution.examType;

    const updatedDuplicateKey = createDuplicateKey({
      branch,
      semester,
      normalizedSubject: subject.toLowerCase(),
      subject,
      year,
      examType
    });

    const duplicate = await findDuplicate(contribution.fileHash, updatedDuplicateKey);
    if (duplicate) {
      contribution.status = 'duplicate';
      contribution.reviewedBy = req.admin || { role: 'admin' };
      contribution.reviewedAt = new Date();
      await contribution.save();
      return res.status(409).json({ error: 'This paper already exists in the main archive.' });
    }

    const paper = await new Paper({
      title,
      subject,
      normalizedSubject: subject.toLowerCase(),
      subjectCode: req.body.subjectCode || contribution.subjectCode || '',
      branch,
      semester,
      examType,
      year,
      originalFileName: contribution.title + '.pdf',
      filePath: contribution.paperUrl,
      filePublicId: contribution.paperPublicId,
      solutionPath: contribution.solutionUrl,
      solutionPublicId: contribution.solutionPublicId,
      fileHash: contribution.fileHash,
      duplicateKey: updatedDuplicateKey,
      contributedBy: contribution.contributorName,
      contributedByName: contribution.contributorName,
      contributorUserId: contribution.contributorUserId,
      contributionId: contribution._id,
      uploadMode: 'contribution',
      approvedAt: new Date()
    }).save();

    contribution.status = 'approved';
    contribution.approvedAt = new Date();
    contribution.approvedPaperId = paper._id;
    contribution.reviewedBy = req.admin || { role: 'admin' };
    contribution.reviewedAt = new Date();
    contribution.adminNote = req.body.adminNote || '';
    contribution.subject = subject;
    contribution.title = title;
    contribution.branch = branch;
    contribution.semester = semester;
    contribution.year = year;
    contribution.examType = examType;
    contribution.subjectCode = req.body.subjectCode || contribution.subjectCode || '';
    await contribution.save();

    await PaperRequest.findOneAndUpdate(
      { requestKey: buildPaperRequestKey({ branch, semester, subjectCode: contribution.subjectCode, subject, year, examType }) },
      { status: 'fulfilled' }
    );

    res.json({ message: 'Contribution approved and published successfully', paper });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// V2 Route: PATCH Reject Contribution
app.patch('/api/admin/contributions/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.status === 'approved') return res.status(400).json({ error: 'Cannot reject approved contribution' });
    if (!String(req.body.adminNote || '').trim()) {
      return res.status(400).json({ error: 'Admin note is required when rejecting a contribution' });
    }

    contribution.status = 'rejected';
    contribution.rejectedAt = new Date();
    contribution.reviewedBy = req.admin || { role: 'admin' };
    contribution.reviewedAt = new Date();
    contribution.adminNote = req.body.adminNote;
    await contribution.save();

    res.json({ message: 'Contribution rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/contributions/:id/needs-correction', authenticateAdmin, async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.status === 'approved') return res.status(400).json({ error: 'Cannot request correction for approved contribution' });
    if (!String(req.body.adminNote || '').trim()) {
      return res.status(400).json({ error: 'Admin note is required when asking for correction' });
    }

    contribution.status = 'needs_correction';
    contribution.reviewedBy = req.admin || { role: 'admin' };
    contribution.reviewedAt = new Date();
    contribution.adminNote = req.body.adminNote;
    await contribution.save();

    res.json({ message: 'Contribution marked as needs correction', contribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// V2 Route: POST Report Wrong Paper
app.post('/api/papers/:id/report', authenticate, async (req, res) => {
  try {
    const { reason, message } = req.body;
    if (!reason) return res.status(400).json({ error: 'Report reason is required' });

    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const report = await new Report({
      paperId: paper._id,
      paperTitle: paper.title,
      reporterUserId: req.user._id,
      reporterName: req.user.username,
      reporterEmail: req.user.email || `${req.user.username}@iiitsurat.ac.in`,
      reason,
      message: message || ''
    }).save();

    await Paper.findByIdAndUpdate(paper._id, { $inc: { reportedIssuesCount: 1 } });

    res.status(201).json({ message: 'Thanks, report submitted.', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// V2 Route: GET Admin Reports
app.get('/api/admin/reports', authenticateAdmin, async (req, res) => {
  try {
    const list = await Report.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// V2 Route: PATCH Admin Report Status
app.patch('/api/admin/reports/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['open', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '' },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });

    res.json({ message: 'Report status updated successfully', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/paper-requests', async (req, res) => {
  try {
    const requests = await PaperRequest.find().sort({ requestCount: -1, updatedAt: -1 }).lean();
    res.json(requests.map(publicPaperRequest));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load paper requests' });
  }
});

app.post('/api/paper-requests', authenticate, async (req, res) => {
  try {
    const payload = {
      subject: String(req.body.subject || '').trim(),
      subjectCode: String(req.body.subjectCode || '').trim(),
      shortCode: String(req.body.shortCode || '').trim(),
      branch: String(req.body.branch || 'CSE').trim().toUpperCase(),
      semester: Number(req.body.semester),
      year: Number(req.body.year),
      examType: String(req.body.examType || '').trim()
    };

    const missing = ['subject', 'branch', 'semester', 'year', 'examType'].filter((key) => !payload[key]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const requestKey = buildPaperRequestKey(payload);
    const userId = req.user._id || req.user.id;
    const email = req.user.email || '';
    let request = await PaperRequest.findOne({ requestKey });
    let alreadyRequested = false;

    if (!request) {
      request = new PaperRequest({
        ...payload,
        requestKey,
        requestedBy: userId,
        requestedByEmail: email,
        requestedUsers: [{ userId, email }],
        requestCount: 1,
        status: 'open'
      });
    } else {
      alreadyRequested = request.requestedUsers.some((entry) => {
        return String(entry.userId || '') === String(userId) ||
          (email && String(entry.email || '').toLowerCase() === String(email).toLowerCase());
      });

      if (!alreadyRequested) {
        request.requestedUsers.push({ userId, email });
        request.requestCount = request.requestedUsers.length;
        if (request.status === 'dismissed') request.status = 'open';
      }
    }

    await request.save();
    res.status(alreadyRequested ? 200 : 201).json({
      message: alreadyRequested ? 'You already requested this paper.' : 'Paper request submitted.',
      alreadyRequested,
      request: publicPaperRequest(request)
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Paper request already exists. Refresh and try again.' });
    }
    res.status(500).json({ error: 'Failed to save paper request' });
  }
});

app.post('/api/paper-requests/:id/vote', authenticate, async (req, res) => {
  try {
    const request = await PaperRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Paper request not found' });

    const userId = req.user._id || req.user.id;
    const email = req.user.email || '';
    const alreadyRequested = request.requestedUsers.some((entry) => {
      return String(entry.userId || '') === String(userId) ||
        (email && String(entry.email || '').toLowerCase() === String(email).toLowerCase());
    });

    if (!alreadyRequested) {
      request.requestedUsers.push({ userId, email });
      request.requestCount = request.requestedUsers.length;
      if (request.status === 'dismissed') request.status = 'open';
      await request.save();
    }

    res.json({
      message: alreadyRequested ? 'You already requested this paper.' : 'Request vote added.',
      alreadyRequested,
      request: publicPaperRequest(request)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote for paper request' });
  }
});

app.patch('/api/admin/paper-requests/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'fulfilled', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await PaperRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!request) return res.status(404).json({ error: 'Paper request not found' });
    res.json(publicPaperRequest(request));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update paper request status' });
  }
});

async function streamSemesterPack(req, res) {
  const { branch, semester } = req.query;
  const examType = String(req.query.examType || '').trim();

  if (!branch || !semester || !examType) {
    return res.status(400).json({
      success: false,
      message: 'branch, semester, and examType are required'
    });
  }

  const branchValue = String(branch || '').trim();
  const normalizedBranch = branchValue.toUpperCase();
  const escapedBranch = branchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const branchRegex = normalizedBranch === 'CSE & ECE'
    ? /CSE\s*&\s*ECE|CSE|ECE/i
    : new RegExp(escapedBranch, 'i');

  const query = {
    semester: Number(semester),
    examType,
    title: branchRegex,
    filePath: { $exists: true, $ne: '' }
  };

  const papers = await Paper.find(query).sort({ subject: 1, year: -1, examType: 1 }).lean();

  if (!papers.length) {
    return res.status(404).json({
      success: false,
      message: 'No papers found for this semester pack'
    });
  }

  const safeBranch = branchValue.replace(/[^a-z0-9]/gi, '_');
  const safeExamType = examType.replace(/[^a-z0-9]/gi, '_');
  const zipName = `PaperStack_${safeBranch}_Sem${semester}_${safeExamType}_Pack.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (archiveErr) => {
    console.error('Semester pack archive error:', archiveErr);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to create zip' });
    } else {
      res.end();
    }
  });
  archive.pipe(res);

  for (const paper of papers) {
    try {
      if (!paper.filePath) continue;
      const response = await axios.get(paper.filePath, { responseType: 'arraybuffer' });
      const subject = String(paper.subject || 'Subject').replace(/[^a-z0-9]/gi, '_');
      const year = paper.year || 'Year';
      const type = String(paper.examType || examType).replace(/[^a-z0-9]/gi, '_');
      archive.append(Buffer.from(response.data), { name: `${subject}_${year}_${type}.pdf` });

      if (paper.solutionPath) {
        try {
          const solutionResponse = await axios.get(paper.solutionPath, { responseType: 'arraybuffer' });
          archive.append(Buffer.from(solutionResponse.data), { name: `${subject}_${year}_${type}_Solution.pdf` });
        } catch (solutionErr) {
          console.warn('Failed to fetch solution:', paper.solutionPath, solutionErr.message);
        }
      }

      await Paper.findByIdAndUpdate(paper._id, { $inc: { downloads: 1 } });
    } catch (downloadErr) {
      console.error(`Failed to fetch PDF for ${paper.title}:`, downloadErr.message);
    }
  }

  await archive.finalize();
}

// V2 Route: GET Download Semester Pack ZIP
app.get('/api/papers/semester-pack', authenticate, async (req, res) => {
  try {
    await streamSemesterPack(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate semester zip pack' });
  }
});

app.get('/api/papers/download-pack', authenticate, async (req, res) => {
  try {
    await streamSemesterPack(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate semester zip pack' });
  }
});

app.get('/api/download-pack', authenticate, async (req, res) => {
  try {
    await streamSemesterPack(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate semester zip pack' });
  }
});

app.get('/api/papers/:id/votes-summary', async (req, res) => {
  try {
    const paper = await Paper.exists({ _id: req.params.id });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    res.json(await getVoteSummaryForPaper(req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load vote summary' });
  }
});

app.post('/api/papers/:id/vote', authenticate, async (req, res) => {
  try {
    const { difficulty, useful } = req.body;
    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be Easy, Medium, or Hard' });
    }
    if (typeof useful !== 'boolean') {
      return res.status(400).json({ error: 'Useful vote must be true or false' });
    }

    const paper = await Paper.exists({ _id: req.params.id });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const vote = await PaperVote.findOneAndUpdate(
      { paperId: req.params.id, userId: req.user._id || req.user.id },
      {
        paperId: req.params.id,
        userId: req.user._id || req.user.id,
        userEmail: req.user.email || '',
        difficulty,
        useful
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: 'Vote saved',
      vote,
      summary: await getVoteSummaryForPaper(req.params.id)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save vote' });
  }
});

app.get('/api/papers/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ paperId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Fetch comments failed' });
  }
});

app.post('/api/papers/:id/comments', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    const newComment = await new Comment({ paperId: req.params.id, username: req.user.username, text }).save();
    res.json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/bookmark/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const exists = user.bookmarks.some((id) => id.toString() === req.params.id);
    if (exists) user.bookmarks = user.bookmarks.filter((id) => id.toString() !== req.params.id);
    else user.bookmarks.push(req.params.id);
    await user.save();
    res.json(user.bookmarks);
  } catch (err) {
    res.status(500).json({ error: 'Bookmark failed' });
  }
});

app.put('/api/user/semester', authenticate, async (req, res) => {
  try {
    const { semester } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { semester, currentSemester: semester }, { new: true }).lean();
    res.json({ message: 'Semester updated', semester: user.semester, currentSemester: user.currentSemester });
  } catch (err) {
    res.status(500).json({ error: 'Could not update semester' });
  }
});

app.put('/api/papers/:id/solution', authenticateAdmin, adminUploadFields, async (req, res) => {
  let solutionResult = null;
  try {
    const solutionFile = req.files?.solution?.[0];
    if (!solutionFile) return res.status(400).json({ error: 'Solution PDF is required' });
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    solutionResult = await uploadBufferToCloudinary(solutionFile);
    if (paper.solutionPublicId) await destroyCloudinary(paper.solutionPublicId);
    paper.solutionPath = solutionResult.secure_url || solutionResult.url;
    paper.solutionPublicId = solutionResult.public_id;
    await paper.save();
    res.json(paper);
  } catch (err) {
    if (solutionResult) await destroyCloudinary(solutionResult.public_id);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/papers/:id', authenticateAdmin, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id).lean();
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    await destroyCloudinary(paper.filePublicId);
    await destroyCloudinary(paper.solutionPublicId);
    await Paper.findByIdAndDelete(req.params.id);
    res.json({ message: 'Paper and files deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    server: 'running',
    database: getDatabaseStatus(),
  });
});

// =====================================================
// Missing Papers Board API
// =====================================================

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' ')
    .replace(/branch\s*:/g, '')
    .replace(/semester\s*/g, '')
    .replace(/sem\s*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMissingSubject(value) {
  return normalizeText(value)
    .replace(/\bdsa\b/g, 'data structure algorithm')
    .replace(/\bdaa\b/g, 'design analysis algorithm')
    .replace(/\badc\b/g, 'analog digital communication')
    .replace(/\bfcp\b/g, 'fundamentals computers programming')
    .replace(/\beca\b/g, 'engineering circuit analysis')
    .replace(/\bedc\b/g, 'electronic devices circuits')
    .replace(/\bcao\b/g, 'computer architecture organisation')
    .replace(/\bpsa\b/g, 'probability statistical analysis')
    .replace(/\bdbms\b/g, 'database management systems')
    .replace(/\boot\b/g, 'object oriented technology')
    .replace(/\boop\b/g, 'object oriented technology')
    .replace(/\bcn\b/g, 'computer networks')
    .replace(/\bse\b/g, 'software engineering')
    .replace(/\bml\b/g, 'machine learning')
    .replace(/\bai\b/g, 'artificial intelligence');
}

function parseBranchFromPaper(paper) {
  const raw = `${paper.branch || ''} ${paper.title || ''}`.toUpperCase();

  const hasCSE = raw.includes('CSE');
  const hasECE = raw.includes('ECE');

  if (hasCSE && hasECE) return 'CSE & ECE';
  if (hasCSE) return 'CSE';
  if (hasECE) return 'ECE';

  return '';
}

function branchMatchesExpected(expectedBranch, paperBranch) {
  if (!expectedBranch || !paperBranch) return false;

  const expected = String(expectedBranch).toUpperCase().trim();
  const paper = String(paperBranch).toUpperCase().trim();

  if (expected === paper) return true;

  // A common paper should count for both CSE and ECE.
  if (paper === 'CSE & ECE' && (expected === 'CSE' || expected === 'ECE')) {
    return true;
  }

  return false;
}

function getPaperSemester(paper) {
  const raw = paper.semester || paper.sem || '';
  const match = String(raw).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function examTypeMatches(expectedExamType, paperExamType) {
  return normalizeText(expectedExamType) === normalizeText(paperExamType);
}

function subjectMatchesExpected(expectedSubject, paperSubject) {
  const paperNorm = normalizeMissingSubject(paperSubject);

  if (!paperNorm) return false;

  const candidates = [
    expectedSubject.name,
    expectedSubject.code,
    expectedSubject.shortCode,
    ...(expectedSubject.aliases || [])
  ]
    .filter(Boolean)
    .map(normalizeMissingSubject);

  return candidates.some((candidate) => {
    if (!candidate) return false;

    return (
      paperNorm === candidate ||
      paperNorm.includes(candidate) ||
      candidate.includes(paperNorm)
    );
  });
}

function getMissingPriority(year) {
  const currentYear = new Date().getFullYear();

  if (Number(year) >= currentYear) return 'High';
  if (Number(year) === currentYear - 1) return 'Medium';

  return 'Low';
}

function buildContributionUrl(item) {
  const params = new URLSearchParams({
    branch: item.branch,
    semester: String(item.semester),
    subject: item.subject,
    subjectCode: item.subjectCode || '',
    examType: item.examType,
    year: String(item.year)
  });

  return `/contribute?${params.toString()}`;
}

function paperExistsForExpectedItem(papers, expectedItem) {
  return papers.some((paper) => {
    const paperBranch = parseBranchFromPaper(paper);
    const paperSemester = getPaperSemester(paper);
    const paperYear = Number(paper.year);

    return (
      branchMatchesExpected(expectedItem.branch, paperBranch) &&
      paperSemester === Number(expectedItem.semester) &&
      paperYear === Number(expectedItem.year) &&
      examTypeMatches(expectedItem.examType, paper.examType) &&
      subjectMatchesExpected(expectedItem.subjectMeta, paper.subject)
    );
  });
}

app.get('/api/missing-papers', async (req, res) => {
  try {
    const selectedBranch = req.query.branch ? String(req.query.branch).toUpperCase() : '';
    const selectedSemester = req.query.semester ? Number(req.query.semester) : null;
    const selectedExamType = req.query.examType ? String(req.query.examType) : '';
    const selectedYear = req.query.year ? Number(req.query.year) : null;
    const searchSubject = req.query.subject ? normalizeMissingSubject(req.query.subject) : '';

    const papers = await mongoose.connection.db
      .collection('paper')
      .find({})
      .toArray();

    const missingPapers = [];

    SUBJECT_CATALOG.forEach((catalogItem) => {
      if (selectedBranch && catalogItem.branch !== selectedBranch) return;
      if (selectedSemester && Number(catalogItem.semester) !== selectedSemester) return;

      catalogItem.subjects.forEach((subject) => {
        if (searchSubject) {
          const subjectPool = [
            subject.name,
            subject.code,
            subject.shortCode,
            ...(subject.aliases || [])
          ]
            .filter(Boolean)
            .map(normalizeMissingSubject)
            .join(' ');

          if (!subjectPool.includes(searchSubject)) return;
        }

        EXPECTED_YEARS.forEach((year) => {
          if (selectedYear && Number(year) !== selectedYear) return;

          EXPECTED_EXAM_TYPES.forEach((examType) => {
            if (selectedExamType && normalizeText(examType) !== normalizeText(selectedExamType)) {
              return;
            }

            const expectedItem = {
              branch: catalogItem.branch,
              semester: catalogItem.semester,
              subject: subject.name,
              subjectCode: subject.code,
              shortCode: subject.shortCode,
              subjectMeta: subject,
              examType,
              year
            };

            const exists = paperExistsForExpectedItem(papers, expectedItem);

            if (!exists) {
              const priority = getMissingPriority(year);

              const publicItem = {
                branch: expectedItem.branch,
                semester: expectedItem.semester,
                subject: expectedItem.subject,
                subjectCode: expectedItem.subjectCode,
                shortCode: expectedItem.shortCode,
                examType: expectedItem.examType,
                year: expectedItem.year,
                priority
              };

              missingPapers.push({
                ...publicItem,
                contributionUrl: buildContributionUrl(publicItem)
              });
            }
          });
        });
      });
    });

    const priorityOrder = {
      High: 1,
      Medium: 2,
      Low: 3
    };

    missingPapers.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      if (b.year !== a.year) return b.year - a.year;
      if (a.semester !== b.semester) return a.semester - b.semester;

      return a.subject.localeCompare(b.subject);
    });

    const requestKeys = missingPapers.map(buildPaperRequestKey);
    const requests = requestKeys.length
      ? await PaperRequest.find({ requestKey: { $in: requestKeys } }).lean()
      : [];
    const requestMap = new Map(requests.map((request) => [request.requestKey, request]));
    missingPapers.forEach((item) => {
      const request = requestMap.get(buildPaperRequestKey(item));
      item.requestId = request?._id || null;
      item.requestKey = buildPaperRequestKey(item);
      item.requestCount = request?.requestCount || 0;
      item.requestStatus = request?.status || 'open';
    });

    const summary = {
      totalMissing: missingPapers.length,
      highPriority: missingPapers.filter((item) => item.priority === 'High').length,
      mediumPriority: missingPapers.filter((item) => item.priority === 'Medium').length,
      lowPriority: missingPapers.filter((item) => item.priority === 'Low').length,
      yearsTracked: EXPECTED_YEARS,
      examTypesTracked: EXPECTED_EXAM_TYPES,
      uploadedPapersChecked: papers.length
    };

    res.json({
      success: true,
      summary,
      missingPapers
    });
  } catch (error) {
    console.error('Missing papers API failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate missing papers',
      error: error.message
    });
  }
});

app.listen(PORT, () => console.log(`Server running on Port ${PORT}`));
