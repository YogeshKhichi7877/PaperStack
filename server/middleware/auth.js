const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const header = String(req.header('Authorization') || '').trim();
  if (!header) return '';

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : header;
}

function createAuthMiddleware(jwtSecret) {
  function authenticate(req, res, next) {
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Authentication is not configured' });
    }

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Access denied: no token' });

    try {
      req.user = jwt.verify(token, jwtSecret);
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  function authenticateAdmin(req, res, next) {
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Admin authentication is not configured' });
    }

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Admin token required' });

    try {
      const verified = jwt.verify(token, jwtSecret);
      if (verified.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.admin = verified;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid or expired admin token' });
    }
  }

  return { authenticate, authenticateAdmin };
}

module.exports = {
  getBearerToken,
  createAuthMiddleware,
};
