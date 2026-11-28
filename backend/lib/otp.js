// Simple in-memory OTP store. Fine for a small business: OTPs are only
// valid for a few minutes anyway, so losing them on a server restart
// doesn't matter. For a bigger deployment (multiple server instances),
// move this to Redis or a database table instead.

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5

const store = new Map() // normalized phone -> { code, expiresAt, attempts }

function normalizePhoneKey(phone) {
  let cleaned = String(phone || '').trim().replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('+91') && cleaned.length === 13) cleaned = cleaned.slice(3)
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2)
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1)
  return cleaned
}

function generateOtp(phone) {
  const key = normalizePhoneKey(phone)
  const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 digits
  store.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })
  console.log(`[OTP] Generated code ${code} for phone ${phone} (key: ${key})`)
  return code
}

function verifyOtp(phone, code) {
  const key = normalizePhoneKey(phone)
  const enteredCode = String(code || '').trim()

  // Master development / testing bypass code: 123456
  if (process.env.NODE_ENV !== 'production' && enteredCode === '123456') {
    store.delete(key)
    return { ok: true }
  }

  const entry = store.get(key)
  if (!entry) return { ok: false, reason: 'no-otp-requested' }
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return { ok: false, reason: 'expired' }
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key)
    return { ok: false, reason: 'too-many-attempts' }
  }
  if (entry.code !== enteredCode) {
    entry.attempts += 1
    return { ok: false, reason: 'incorrect' }
  }
  store.delete(key)
  return { ok: true }
}

module.exports = { generateOtp, verifyOtp, normalizePhoneKey }
