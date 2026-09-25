const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

// Ensure a fallback secret exists if not defined in .env, but warn loudly
let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'replace-with-a-long-random-string' || JWT_SECRET === 'dev-only-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY WARNING] Insecure or missing JWT_SECRET in production!')
  }
  JWT_SECRET = JWT_SECRET || 'chop-and-drop-secure-random-jwt-key-' + crypto.randomBytes(16).toString('hex')
}

const CUSTOMER_TOKEN_EXPIRY = '7d'
const ADMIN_TOKEN_EXPIRY = '24h'

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

async function comparePassword(plain, hash) {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}

function signCustomerToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: 'customer',
      phone: user.phone,
    },
    JWT_SECRET,
    { expiresIn: CUSTOMER_TOKEN_EXPIRY }
  )
}

function signAdminToken() {
  return jwt.sign(
    {
      sub: 'admin',
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRY }
  )
}

// Backward-compatible alias
function signToken(user) {
  return signCustomerToken(user)
}

function verifyToken(token) {
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

function validatePhoneNumber(phone) {
  const cleaned = String(phone || '').replace(/[\s\-()]/g, '')
  // Basic validation: 10 to 15 digits
  return /^\+?[0-9]{10,15}$/.test(cleaned) ? cleaned : null
}

module.exports = {
  hashPassword,
  comparePassword,
  signCustomerToken,
  signAdminToken,
  signToken,
  verifyToken,
  validatePhoneNumber,
}
