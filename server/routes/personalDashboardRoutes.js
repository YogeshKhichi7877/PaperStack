const express = require('express');

const {
  getPersonalDashboard,
} = require('../services/personalDashboardService');

function createPersonalDashboardRoutes({ authenticate }) {
  if (typeof authenticate !== 'function') {
    throw new Error(
      'Personal dashboard routes require authenticate middleware'
    );
  }

  const router = express.Router();

  router.get('/', authenticate, async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
        });
      }

      const dashboard = await getPersonalDashboard(userId);

      if (!dashboard) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      return res.json(dashboard);
    } catch (error) {
      console.error('Personal dashboard failed:', error);

      return res.status(500).json({
        error: 'Failed to load personal dashboard',
      });
    }
  });

  return router;
}

module.exports = {
  createPersonalDashboardRoutes,
};
