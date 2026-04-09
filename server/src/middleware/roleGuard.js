/**
 * Role guard middleware factory.
 * Usage: roleGuard('admin') or roleGuard('admin', 'agent')
 */
const roleGuard = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
    });
  }
  next();
};

module.exports = roleGuard;
