const { verifyToken } = require('../lib/auth')
const { getPartnerById } = require('../lib/db')

async function partnerAuth(req, res, next) {
  const auth = req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Partner authorization token required.' })
  }

  const token = auth.slice(7)
  const decoded = verifyToken(token)

  if (!decoded || (decoded.role !== 'partner' && decoded.role !== 'admin')) {
    return res.status(401).json({ error: 'Invalid or expired partner token.' })
  }

  if (decoded.role === 'admin') {
    req.partner = { id: 'admin', name: 'Super Admin', category: 'All', role: 'admin' }
    return next()
  }

  const partner = await getPartnerById(decoded.sub)
  if (!partner) {
    return res.status(403).json({ error: 'Partner account not found.' })
  }

  if (partner.status === 'inactive') {
    return res.status(403).json({ error: 'Partner account has been deactivated. Contact admin.' })
  }

  req.partner = partner
  next()
}

module.exports = partnerAuth
