const crypto = require('crypto');

const Resource = require('../models/Resource');
const ResourceContribution =
  require('../models/ResourceContribution');
const { bestDuplicateCandidate } = require('./duplicateDetectionService');

const {
  isValidResourceType,
} = require('../data/resourceTypes');

const {
  normalizeBranchList,
  resolveSubject,
} = require('./subjectService');

const {
  baseResourcePoints,
  calculateResourcePoints,
} = require('../utils/resourceContributionPoints');

const {
  cloudinary,
  folder,
} = require('../cloudConfig');

const UPLOADABLE_RESOURCE_KINDS =
  new Set([
    'solution',
    'notes',
    'formula_sheet',
    'assignment',
    'lab_material',
    'quiz',
    'viva_questions',
    'important_questions',
    'syllabus',
    'revision_sheet',
    'other',
  ]);

const ALLOWED_EXTENSIONS =
  new Set([
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.txt',
    '.csv',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
    '.zip',
  ]);

function hashBuffer(buffer) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

function cleanText(
  value,
  maxLength = 500
) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanTags(value) {
  const raw =
    Array.isArray(value)
      ? value
      : String(value || '')
          .split(',');

  return [
    ...new Set(
      raw
        .map((item) =>
          cleanText(item, 40)
        )
        .filter(Boolean)
    ),
  ].slice(0, 12);
}

function parseYear(value) {
  const numeric = Number(value);

  if (
    Number.isInteger(numeric) &&
    numeric >= 2000 &&
    numeric <= 2100
  ) {
    return numeric;
  }

  return null;
}

function parseSemester(value) {
  const numeric = Number(value);

  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 8
  ) {
    return numeric;
  }

  return null;
}

function extensionOf(filename) {
  const match =
    String(filename || '')
      .toLowerCase()
      .match(/(\.[a-z0-9]+)$/);

  return match
    ? match[1]
    : '';
}

function validateUploadFile(file) {
  if (!file?.buffer?.length) {
    const error =
      new Error(
        'Resource file is required.'
      );

    error.statusCode = 400;
    throw error;
  }

  const extension =
    extensionOf(
      file.originalname
    );

  if (
    !ALLOWED_EXTENSIONS.has(
      extension
    )
  ) {
    const error =
      new Error(
        'Unsupported file type. Use PDF, image, Office document, text/CSV, spreadsheet, presentation, or ZIP.'
      );

    error.statusCode = 400;
    throw error;
  }

  return extension;
}

function validateKind(kind) {
  const normalized =
    cleanText(kind, 50);

  if (
    !isValidResourceType(
      normalized
    ) ||
    !UPLOADABLE_RESOURCE_KINDS.has(
      normalized
    )
  ) {
    const error =
      new Error(
        'Choose a valid resource type. Question papers should use the normal PaperStack paper contribution flow.'
      );

    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function uploadBufferToCloudinary(file) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder:
              `${folder}/resources`,
            resource_type:
              'auto',
            use_filename:
              true,
            unique_filename:
              true,
          },
          (
            error,
            result
          ) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(result);
          }
        );

      uploadStream.end(
        file.buffer
      );
    }
  );
}

async function destroyCloudinaryAsset(
  contribution
) {
  if (
    !contribution?.filePublicId
  ) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      contribution.filePublicId,
      {
        resource_type:
          contribution.fileResourceType ||
          'raw',
        invalidate:
          true,
      }
    );
  } catch (error) {
    console.warn(
      'Resource contribution cleanup skipped:',
      error.message
    );
  }
}

async function findDuplicate({
  fileHash,
  subjectKey,
  kind,
  title = '',
}) {
  const pending =
    await ResourceContribution.findOne({
      fileHash,
      subjectKey,
      kind,
      status: {
        $in: [
          'pending',
          'approved',
          'needs_correction',
        ],
      },
    })
      .select(
        '_id status'
      )
      .lean();

  if (pending) {
    return {
      type:
        'resource_contribution',
      item:
        pending,
    };
  }

  const activeResource =
    await Resource.findOne({
      subjectKey,
      kind,
      status:
        'active',
      'metadata.fileHash':
        fileHash,
    })
      .select('_id')
      .lean();

  if (activeResource) {
    return {
      type:
        'active_resource',
      item:
        activeResource,
    };
  }

  if (title) {
    const [contributions, resources] = await Promise.all([
      ResourceContribution.find({ subjectKey, kind, status: { $in: ['pending', 'approved', 'needs_correction'] } }).select('_id title').limit(50).lean(),
      Resource.find({ subjectKey, kind, status: 'active' }).select('_id title').limit(50).lean(),
    ]);
    const probable = bestDuplicateCandidate({ title }, [...contributions, ...resources], (item) => item.title);
    if (probable && ['probable', 'possible'].includes(probable.classification)) {
      return { type: 'probable_resource', item: probable.candidate, review: probable };
    }
  }

  return null;
}

function subjectPayload(body = {}) {
  const semester =
    parseSemester(
      body.semester
    );

  const branches =
    normalizeBranchList(
      body.branch ||
      body.branches
    );

  const resolved =
    resolveSubject({
      subject:
        body.subjectName ||
        body.subject,
      subjectName:
        body.subjectName ||
        body.subject,
      subjectCode:
        body.subjectCode,
      shortCode:
        body.subjectShortCode ||
        body.shortCode,
      branch:
        branches,
      semester,
    });

  return {
    subjectKey:
      resolved.key,
    subjectCode:
      resolved.code ||
      cleanText(
        body.subjectCode,
        30
      ).toUpperCase(),
    subjectShortCode:
      resolved.shortCode ||
      cleanText(
        body.subjectShortCode ||
        body.shortCode,
        20
      ).toUpperCase(),
    subjectName:
      resolved.name ||
      cleanText(
        body.subjectName ||
        body.subject,
        120
      ),
    branches:
      branches.length
        ? branches
        : resolved.branches ||
          [],
    semesters:
      semester
        ? [semester]
        : resolved.semesters ||
          [],
  };
}

async function createResourceContribution({
  body,
  file,
  user,
}) {
  validateUploadFile(file);

  const kind =
    validateKind(
      body.kind
    );

  const title =
    cleanText(
      body.title,
      180
    );

  if (!title) {
    const error =
      new Error(
        'Resource title is required.'
      );

    error.statusCode = 400;
    throw error;
  }

  const subject =
    subjectPayload(
      body
    );

  if (
    !subject.subjectName ||
    !subject.subjectKey
  ) {
    const error =
      new Error(
        'Subject information is required.'
      );

    error.statusCode = 400;
    throw error;
  }

  if (
    !subject.branches.length
  ) {
    const error =
      new Error(
        'Branch is required.'
      );

    error.statusCode = 400;
    throw error;
  }

  if (
    !subject.semesters.length
  ) {
    const error =
      new Error(
        'Semester is required.'
      );

    error.statusCode = 400;
    throw error;
  }

  const fileHash =
    hashBuffer(
      file.buffer
    );

  const duplicate =
    await findDuplicate({
      fileHash,
      subjectKey:
        subject.subjectKey,
      kind,
      title,
    });

  if (duplicate && duplicate.type !== 'probable_resource') {
    const error =
      new Error(
        'This resource appears to have already been submitted or published.'
      );

    error.statusCode = 409;
    error.duplicateType =
      duplicate.type;

    throw error;
  }

  const uploaded =
    await uploadBufferToCloudinary(
      file
    );

  try {
    const basePoints =
      baseResourcePoints(
        kind
      );

    const contribution =
      await ResourceContribution.create({
        contributorUserId:
          user._id ||
          user.id,
        contributorName:
          cleanText(
            user.username ||
            user.name ||
            'Contributor',
            120
          ),
        contributorEmail:
          cleanText(
            user.email,
            180
          ),

        kind,
        title,
        description:
          cleanText(
            body.description,
            1500
          ),

        ...subject,

        examType:
          cleanText(
            body.examType,
            60
          ),
        year:
          parseYear(
            body.year
          ),

        tags:
          cleanTags(
            body.tags
          ),
        topics:
          cleanTags(
            body.topics
          ),

        fileUrl:
          uploaded.secure_url ||
          uploaded.url,
        filePublicId:
          uploaded.public_id,
        fileResourceType:
          uploaded.resource_type ||
          'raw',
        originalFileName:
          cleanText(
            file.originalname,
            240
          ),
        mimeType:
          cleanText(
            file.mimetype,
            120
          ),
        fileSize:
          Number(
            file.size ||
            file.buffer.length ||
            0
          ),
        fileHash,

        status:
          'pending',
        basePoints,
        bonusPoints:
          0,
        pointsAwarded:
          0,

        metadata: {
          uploadExtension:
            extensionOf(
              file.originalname
            ),
          duplicateReview: duplicate?.review
            ? {
                classification: duplicate.review.classification,
                matchedId: String(duplicate.review.candidate?._id || ''),
                confidence: duplicate.review.confidence,
                reason: duplicate.review.reason,
              }
            : null,
        },
      });

    return contribution;
  } catch (error) {
    try {
      await cloudinary.uploader.destroy(
        uploaded.public_id,
        {
          resource_type:
            uploaded.resource_type ||
            'raw',
          invalidate:
            true,
        }
      );
    } catch {}

    throw error;
  }
}

async function approveResourceContribution({
  contributionId,
  admin,
  adminNote = '',
}) {
  const contribution =
    await ResourceContribution.findById(
      contributionId
    );

  if (!contribution) {
    const error =
      new Error(
        'Resource contribution not found.'
      );

    error.statusCode = 404;
    throw error;
  }

  const sourceKey =
    `resource-contribution:${String(contribution._id)}`;

  const existingResource =
    await Resource.findOne({
      legacySourceKey:
        sourceKey,
    });

  if (existingResource) {
    if (
      contribution.status !==
      'approved'
    ) {
      contribution.status =
        'approved';
      contribution.approvedResourceId =
        existingResource._id;
      contribution.pointsAwarded =
        Number(
          existingResource.metadata?.pointsAwarded ||
          contribution.pointsAwarded ||
          contribution.basePoints ||
          0
        );
      contribution.approvedAt =
        contribution.approvedAt ||
        new Date();
      contribution.reviewedAt =
        new Date();

      await contribution.save();
    }

    return {
      contribution,
      resource:
        existingResource,
      alreadyApproved:
        true,
    };
  }

  if (
    [
      'rejected',
      'duplicate',
    ].includes(
      contribution.status
    )
  ) {
    const error =
      new Error(
        `Cannot approve a ${contribution.status} resource contribution.`
      );

    error.statusCode = 409;
    throw error;
  }

  const existingCategoryCount =
    await Resource.countDocuments({
      subjectKey:
        contribution.subjectKey,
      kind:
        contribution.kind,
      status:
        'active',
    });

  const pointAward =
    calculateResourcePoints(
      contribution.kind,
      {
        firstInCategory:
          existingCategoryCount ===
          0,
      }
    );

  let resource;

  try {
    resource =
      await Resource.create({
        title:
          contribution.title,
        kind:
          contribution.kind,

        subjectKey:
          contribution.subjectKey,
        subjectCode:
          contribution.subjectCode,
        subjectShortCode:
          contribution.subjectShortCode,
        subjectName:
          contribution.subjectName,

        branches:
          contribution.branches,
        semesters:
          contribution.semesters,
        examType:
          contribution.examType,
        year:
          contribution.year,

        fileUrl:
          contribution.fileUrl,
        filePublicId:
          contribution.filePublicId,
        originalFileName:
          contribution.originalFileName,
        mimeType:
          contribution.mimeType,
        fileSize:
          contribution.fileSize,

        sourceType:
          'contribution',
        status:
          'active',
        visibility:
          'public',

        contributorUserId:
          contribution.contributorUserId,
        contributorName:
          contribution.contributorName,

        tags:
          contribution.tags,
        topics:
          contribution.topics,

        legacySourceKey:
          sourceKey,

        metadata: {
          resourceContributionId:
            String(
              contribution._id
            ),
          fileHash:
            contribution.fileHash,
          description:
            contribution.description,
          pointsAwarded:
            pointAward.total,
          basePoints:
            pointAward.base,
          bonusPoints:
            pointAward.bonus,
        },
      });
  } catch (error) {
    if (
      error.code ===
      11000
    ) {
      resource =
        await Resource.findOne({
          legacySourceKey:
            sourceKey,
        });
    } else {
      throw error;
    }
  }

  if (!resource) {
    const error =
      new Error(
        'Could not create the approved resource.'
      );

    error.statusCode = 500;
    throw error;
  }

  contribution.status =
    'approved';
  contribution.adminNote =
    cleanText(
      adminNote,
      500
    );
  contribution.basePoints =
    pointAward.base;
  contribution.bonusPoints =
    pointAward.bonus;
  contribution.pointsAwarded =
    pointAward.total;
  contribution.approvedResourceId =
    resource._id;
  contribution.approvedBy =
    admin ||
    {
      role:
        'admin',
    };
  contribution.reviewedAt =
    new Date();
  contribution.approvedAt =
    new Date();

  await contribution.save();

  return {
    contribution,
    resource,
    pointAward,
    alreadyApproved:
      false,
  };
}

async function updateResourceContributionStatus({
  contributionId,
  status,
  admin,
  adminNote = '',
}) {
  const contribution =
    await ResourceContribution.findById(
      contributionId
    );

  if (!contribution) {
    const error =
      new Error(
        'Resource contribution not found.'
      );

    error.statusCode = 404;
    throw error;
  }

  if (
    contribution.status ===
    'approved'
  ) {
    const error =
      new Error(
        'Approved resources cannot be moved back to a review state.'
      );

    error.statusCode = 409;
    throw error;
  }

  if (
    ![
      'rejected',
      'needs_correction',
    ].includes(
      status
    )
  ) {
    const error =
      new Error(
        'Invalid resource moderation status.'
      );

    error.statusCode = 400;
    throw error;
  }

  contribution.status =
    status;
  contribution.adminNote =
    cleanText(
      adminNote,
      500
    );
  contribution.approvedBy =
    admin ||
    {
      role:
        'admin',
    };
  contribution.reviewedAt =
    new Date();

  if (
    status ===
    'rejected'
  ) {
    contribution.rejectedAt =
      new Date();
    contribution.pointsAwarded =
      0;
    contribution.bonusPoints =
      0;
  }

  await contribution.save();

  if (
    status ===
    'rejected'
  ) {
    await destroyCloudinaryAsset(
      contribution
    );
  }

  return contribution;
}

async function getOwnResourceContributions(
  userId
) {
  return ResourceContribution.find({
    contributorUserId:
      userId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(100)
    .lean();
}

module.exports = {
  ALLOWED_EXTENSIONS,
  UPLOADABLE_RESOURCE_KINDS,
  approveResourceContribution,
  cleanTags,
  createResourceContribution,
  destroyCloudinaryAsset,
  extensionOf,
  findDuplicate,
  getOwnResourceContributions,
  hashBuffer,
  parseSemester,
  parseYear,
  subjectPayload,
  updateResourceContributionStatus,
  uploadBufferToCloudinary,
  validateKind,
  validateUploadFile,
};
