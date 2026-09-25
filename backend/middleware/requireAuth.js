const { verifyToken } = require('../lib/auth')
const { getUserById } = require('../lib/db')

// Reads the 'Authorization: Bearer <token>' header, verifies it, and
// attaches the matching user (without passwordHash) to req.user.
// Responds 401 if the token is missing, invalid, or the user no longer exists.
async function requireAuth(req, res, next) {
  const header = req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token) return res.status(401).json({ error: 'Please log in.' })

  const payload = verifyToken(token)
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' })
  }

  const user = await getUserById(payload.sub)
  if (!user) return res.status(401).json({ error: 'Account not found.' })

  const { passwordHash: _passwordHash, ...safeUser } = user
  req.user = safeUser
  next()
}

// Attaches req.user if a valid token happens to be present.
// Used on the order-creation route so both guests and logged-in customers can order.
async function attachUserIfPresent(req, _res, next) {
  const header = req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (token) {
    const payload = verifyToken(token)
    if (payload && payload.sub) {
      const user = await getUserById(payload.sub)
      if (user) {
        const { passwordHash: _passwordHash, ...safeUser } = user
        req.user = safeUser
      }
    }
  }

  next()
}

module.exports = { requireAuth, attachUserIfPresent }
