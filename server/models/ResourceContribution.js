const mongoose = require('mongoose');

const {
  RESOURCE_TYPE_VALUES,
} = require('../data/resourceTypes');

const resourceContributionSchema =
  new mongoose.Schema({
    contributorUserId: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref:
        'User',
      required:
        true,
      index:
        true,
    },
    contributorName: {
      type:
        String,
      required:
        true,
      trim:
        true,
    },
    contributorEmail: {
      type:
        String,
      default:
        '',
      trim:
        true,
    },

    kind: {
      type:
        String,
      required:
        true,
      enum:
        RESOURCE_TYPE_VALUES,
      index:
        true,
    },

    title: {
      type:
        String,
      required:
        true,
      trim:
        true,
      maxlength:
        180,
    },
    description: {
      type:
        String,
      default:
        '',
      trim:
        true,
      maxlength:
        1500,
    },

    subjectKey: {
      type:
        String,
      required:
        true,
      index:
        true,
    },
    subjectCode: {
      type:
        String,
      default:
        '',
      index:
        true,
    },
    subjectShortCode: {
      type:
        String,
      default:
        '',
      index:
        true,
    },
    subjectName: {
      type:
        String,
      required:
        true,
      index:
        true,
    },

    branches: {
      type:
        [String],
      default:
        [],
      index:
        true,
    },
    semesters: {
      type:
        [Number],
      default:
        [],
      index:
        true,
    },

    examType: {
      type:
        String,
      default:
        '',
      index:
        true,
    },
    year: {
      type:
        Number,
      default:
        null,
      index:
        true,
    },

    tags: {
      type:
        [String],
      default:
        [],
    },
    topics: {
      type:
        [String],
      default:
        [],
    },

    fileUrl: {
      type:
        String,
      required:
        true,
    },
    filePublicId: {
      type:
        String,
      required:
        true,
    },
    fileResourceType: {
      type:
        String,
      default:
        'raw',
    },
    originalFileName: {
      type:
        String,
      default:
        '',
    },
    mimeType: {
      type:
        String,
      default:
        '',
    },
    fileSize: {
      type:
        Number,
      default:
        0,
    },
    fileHash: {
      type:
        String,
      required:
        true,
      index:
        true,
    },

    status: {
      type:
        String,
      enum: [
        'pending',
        'approved',
        'rejected',
        'needs_correction',
        'duplicate',
      ],
      default:
        'pending',
      index:
        true,
    },

    adminNote: {
      type:
        String,
      default:
        '',
      maxlength:
        500,
    },

    basePoints: {
      type:
        Number,
      default:
        0,
      min:
        0,
    },
    bonusPoints: {
      type:
        Number,
      default:
        0,
      min:
        0,
    },
    pointsAwarded: {
      type:
        Number,
      default:
        0,
      min:
        0,
      index:
        true,
    },

    approvedResourceId: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref:
        'Resource',
      default:
        null,
      index:
        true,
    },

    approvedBy: {
      type:
        mongoose.Schema.Types.Mixed,
      default:
        null,
    },
    reviewedAt: {
      type:
        Date,
      default:
        null,
    },
    approvedAt: {
      type:
        Date,
      default:
        null,
    },
    rejectedAt: {
      type:
        Date,
      default:
        null,
    },

    metadata: {
      type:
        mongoose.Schema.Types.Mixed,
      default:
        {},
    },
  }, {
    timestamps:
      true,
  });

resourceContributionSchema.index({
  contributorUserId: 1,
  status: 1,
  createdAt: -1,
});

resourceContributionSchema.index({
  subjectKey: 1,
  kind: 1,
  status: 1,
  createdAt: -1,
});

resourceContributionSchema.index({
  fileHash: 1,
  status: 1,
});

module.exports =
  mongoose.model(
    'ResourceContribution',
    resourceContributionSchema
  );
