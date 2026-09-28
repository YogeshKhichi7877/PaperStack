const express =
  require('express');

const {
  getProductAnalytics,
} = require('../services/productAnalyticsService');

module.exports = function createProductAnalyticsRoutes({
  authenticateAdmin,
}) {
  if (
    typeof authenticateAdmin !==
    'function'
  ) {
    throw new Error(
      'Product analytics routes require authenticateAdmin middleware.'
    );
  }

  const router =
    express.Router();

  router.use(
    authenticateAdmin
  );

  router.get(
    '/',
    async (
      req,
      res
    ) => {
      try {
        const period =
          req.query.period ===
          '7d'
            ? '7d'
            : '30d';

        return res.json(
          await getProductAnalytics(
            period
          )
        );
      } catch (
        error
      ) {
        console.error(
          'Product analytics failed:',
          error
        );

        return res
          .status(500)
          .json({
            error:
              'Failed to load product analytics',
          });
      }
    }
  );

  return router;
};
