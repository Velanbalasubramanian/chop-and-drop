const rateLimit = require('express-rate-limit')

const isDev = process.env.NODE_ENV !== 'production'

const isLocalOrLAN = (ip) => {
  if (!ip) return true
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('::ffff:192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('::ffff:10.')
  )
}

// Strict rate limit for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  skip: (req) => isDev || isLocalOrLAN(req.ip),
})

// Rate limit for placing orders to prevent spam
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order requests from this IP. Please try again later.' },
  skip: (req) => isDev || isLocalOrLAN(req.ip),
})

// General API rate limiter (generous in production, completely bypassed in dev or LAN)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100000 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => isDev || isLocalOrLAN(req.ip),
})

module.exports = {
  authLimiter,
  orderLimiter,
  apiLimiter,
}
