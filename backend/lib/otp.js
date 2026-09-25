// Simple in-memory OTP store. Fine for a small business: OTPs are only
// valid for a few minutes anyway, so losing them on a server restart
// doesn't matter. For a bigger deployment (multiple server instances),
// move this to Redis or a database table instead.

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5

const store = new Map() // phone -> { code, expiresAt, attempts }

function generateOtp(phone) {
  const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 digits
  store.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })
  return code
}

function verifyOtp(phone, code) {
  const entry = store.get(phone)
  if (!entry) return { ok: false, reason: 'no-otp-requested' }
  if (Date.now() > entry.expiresAt) {
    store.delete(phone)
    return { ok: false, reason: 'expired' }
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(phone)
    return { ok: false, reason: 'too-many-attempts' }
  }
  if (entry.code !== String(code).trim()) {
    entry.attempts += 1
    return { ok: false, reason: 'incorrect' }
  }
  store.delete(phone)
  return { ok: true }
}

module.exports = { generateOtp, verifyOtp }
