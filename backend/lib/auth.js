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
  JWT_SECRET = JWT_SECRET || 'zippo-secure-random-jwt-key-' + crypto.randomBytes(16).toString('hex')
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

function signPartnerToken(partner) {
  return jwt.sign(
    {
      sub: partner.id,
      role: 'partner',
      category: partner.category || 'All',
      phone: partner.phone,
      name: partner.name,
      storeName: partner.store_name || partner.storeName || '',
    },
    JWT_SECRET,
    { expiresIn: CUSTOMER_TOKEN_EXPIRY }
  )
}

function signDeliveryToken(rider) {
  return jwt.sign(
    {
      sub: rider.id,
      role: 'delivery',
      phone: rider.phone,
      name: rider.name,
      vehicle: rider.vehicle || 'Bike',
    },
    JWT_SECRET,
    { expiresIn: CUSTOMER_TOKEN_EXPIRY }
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

function normalizePhoneNumber(phone) {
  if (!phone) return null
  let cleaned = String(phone).trim().replace(/[\s\-()]/g, '')
  if (!cleaned) return null

  // Strip Indian prefix if present (+91, 91, or leading 0)
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    cleaned = cleaned.slice(3)
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2)
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1)
  }

  // 10-digit Indian mobile number
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return cleaned
  }

  // General 10-digit number
  if (/^\d{10}$/.test(cleaned)) {
    return cleaned
  }

  // Valid international format (e.g. +14155552671 or 10-15 digits)
  if (/^\+?[0-9]{10,15}$/.test(cleaned)) {
    return cleaned
  }

  return null
}

function validatePhoneNumber(phone) {
  return normalizePhoneNumber(phone)
}

module.exports = {
  hashPassword,
  comparePassword,
  signCustomerToken,
  signAdminToken,
  signPartnerToken,
  signDeliveryToken,
  signToken,
  verifyToken,
  validatePhoneNumber,
  normalizePhoneNumber,
}
