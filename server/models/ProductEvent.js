const mongoose =
  require('mongoose');

const EVENT_NAMES = [
  'page_view',
  'search',
  'save_item',
  'unsave_item',
  'ai_action',
  'ai_feedback',
  'related_open',
  'mini_practice_start',
  'study_resume',
];

const productEventSchema =
  new mongoose.Schema({
    eventName: {
      type:
        String,
      enum:
        EVENT_NAMES,
      required:
        true,
      index:
        true,
    },
    sessionId: {
      type:
        String,
      required:
        true,
      maxlength:
        80,
      index:
        true,
    },
    routeKey: {
      type:
        String,
      required:
        true,
      maxlength:
        60,
      index:
        true,
    },
    dayKey: {
      type:
        String,
      required:
        true,
      match:
        /^\d{4}-\d{2}-\d{2}$/,
      index:
        true,
    },
    type: {
      type:
        String,
      default:
        '',
      maxlength:
        40,
    },
    branch: {
      type:
        String,
      default:
        '',
      maxlength:
        20,
    },
    semester: {
      type:
        Number,
      default:
        null,
    },
    examType: {
      type:
        String,
      default:
        '',
      maxlength:
        30,
    },
    resultBucket: {
      type:
        String,
      enum: [
        '',
        '0',
        '1-5',
        '6-20',
        '21+',
      ],
      default:
        '',
      index:
        true,
    },
    expiresAt: {
      type:
        Date,
      required:
        true,
    },
  }, {
    timestamps:
      true,
  });

productEventSchema.index({
  dayKey:
    1,
  eventName:
    1,
});

productEventSchema.index({
  sessionId:
    1,
  dayKey:
    1,
  routeKey:
    1,
});

productEventSchema.index(
  {
    expiresAt:
      1,
  },
  {
    expireAfterSeconds:
      0,
  }
);

productEventSchema.statics.EVENT_NAMES =
  EVENT_NAMES;

module.exports =
  mongoose.model(
    'ProductEvent',
    productEventSchema
  );
