const express =
  require('express');

const {
  recordProductEvent,
} = require('../services/productEventService');

const router =
  express.Router();

router.post(
  '/',
  async (
    req,
    res
  ) => {
    try {
      const result =
        await recordProductEvent(
          req.body ||
          {}
        );

      return res
        .status(202)
        .json({
          accepted:
            true,
          event:
            result,
        });
    } catch (
      error
    ) {
      const status =
        Number(
          error.statusCode ||
          500
        );

      if (
        status >=
        500
      ) {
        console.error(
          'Product event failed:',
          error
        );
      }

      return res
        .status(
          status
        )
        .json({
          error:
            status >=
              500
              ? 'Failed to record product event'
              : error.message,
        });
    }
  }
);

module.exports =
  router;
