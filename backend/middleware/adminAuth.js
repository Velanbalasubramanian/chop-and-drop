const { verifyToken } = require('../lib/auth')

// Secure admin authentication middleware using JWT.
// Accepts:
// 1. Authorization: Bearer <admin_jwt_token> (Primary secure standard)
// 2. x-admin-password header (Legacy fallback for backward compatibility)
function adminAuth(req, res, next) {
  const authHeader = req.header('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const payload = verifyToken(token)
    if (payload && payload.role === 'admin') {
      req.admin = payload
      return next()
    }
    return res.status(401).json({ error: 'Admin session expired or invalid. Please log in again.' })
  }

  // Legacy header fallback
  const legacyPassword = req.header('x-admin-password')
  const expectedPassword = process.env.ADMIN_PASSWORD || 'changeme'
  if (legacyPassword && legacyPassword === expectedPassword) {
    req.admin = { sub: 'admin', role: 'admin', legacy: true }
    return next()
  }

  return res.status(401).json({ error: 'Admin authentication required.' })
}

module.exports = adminAuth
