const express = require('express')
const crypto = require('crypto')

const { hashPassword, comparePassword, signCustomerToken, validatePhoneNumber } = require('../lib/auth')
const { generateOtp, verifyOtp } = require('../lib/otp')
const { sendOtpSms } = require('../lib/sms')
const { requireAuth } = require('../middleware/requireAuth')
const { authLimiter } = require('../middleware/rateLimiters')
const { getUserByPhone, createUser, updateUser } = require('../lib/db')

const router = express.Router()

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { name, phone, email, password } = req.body || {}

  const cleanName = String(name || '').trim()
  const cleanPhone = validatePhoneNumber(phone)
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  if (!cleanName || !cleanPhone || !cleanPassword) {
    return res.status(400).json({ error: 'Valid name, phone number, and password are required.' })
  }
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' })
  }

  const existing = await getUserByPhone(cleanPhone)
  if (existing) {
    if (existing.passwordHash) {
      return res.status(409).json({
        error: 'An account with this phone number already exists. Please sign in.',
        alreadyRegistered: true,
      })
    }
    // If account was created by OTP without password, update name and save chosen password
    const passwordHash = await hashPassword(cleanPassword)
    const updatedUser = await updateUser(existing.id, {
      name: cleanName || existing.name,
      email: cleanEmail || existing.email,
      passwordHash,
    })

    const token = signCustomerToken(updatedUser)
    const { passwordHash: _passwordHash, ...safeUser } = updatedUser
    return res.status(200).json({ token, user: safeUser, message: 'Account updated and logged in successfully.' })
  }

  const passwordHash = await hashPassword(cleanPassword)
  const user = await createUser({
    id: 'U-' + crypto.randomBytes(5).toString('hex'),
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    passwordHash,
    role: 'customer',
    createdAt: new Date().toISOString(),
  })

  const token = signCustomerToken(user)
  const { passwordHash: _passwordHash, ...safeUser } = user
  res.status(201).json({ token, user: safeUser })
})

// POST /api/auth/login — log in with phone + password
router.post('/login', authLimiter, async (req, res) => {
  const { phone, password } = req.body || {}
  const cleanPhone = validatePhoneNumber(phone)

  if (!cleanPhone || !password) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number and password are required.' })
  }

  const user = await getUserByPhone(cleanPhone)
  if (!user) {
    return res.status(401).json({
      error: 'No account found with this phone number. Please sign up or log in with OTP.',
      notFound: true,
    })
  }

  if (!user.passwordHash) {
    return res.status(401).json({
      error: 'This account was created via OTP. Please sign in using "Log in with OTP" or register to set a password.',
      needsOtpLogin: true,
    })
  }

  const passwordMatches = await comparePassword(password, user.passwordHash)
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' })
  }

  const token = signCustomerToken(user)
  const { passwordHash: _passwordHash, ...safeUser } = user
  res.json({ token, user: safeUser })
})

// POST /api/auth/otp/request — send a 6-digit login code to a phone number
router.post('/otp/request', authLimiter, async (req, res) => {
  const { phone } = req.body || {}
  const cleanPhone = validatePhoneNumber(phone)
  if (!cleanPhone) return res.status(400).json({ error: 'A valid 10-digit mobile number is required.' })

  const user = await getUserByPhone(cleanPhone)
  const isNewUser = !user

  const code = generateOtp(cleanPhone)
  const smsResult = await sendOtpSms(cleanPhone, code)

  const isDev = process.env.NODE_ENV !== 'production'
  res.json({
    ok: true,
    isNewUser,
    devOtp: (isDev || !smsResult.sent) ? code : undefined,
    message: smsResult.sent ? 'OTP sent successfully to your mobile number.' : 'OTP generated (use test OTP in dev mode).',
  })
})

// POST /api/auth/otp/verify — verify code and log in / create account
router.post('/otp/verify', authLimiter, async (req, res) => {
  const { phone, code, name } = req.body || {}
  const cleanPhone = validatePhoneNumber(phone)
  const cleanCode = String(code || '').trim()

  if (!cleanPhone || !cleanCode) {
    return res.status(400).json({ error: 'Valid phone number and OTP code are required.' })
  }

  const result = verifyOtp(cleanPhone, cleanCode)

  if (!result.ok) {
    const messages = {
      'no-otp-requested': 'Please request a verification code first.',
      expired: 'This code has expired. Please request a new one.',
      'too-many-attempts': 'Too many incorrect attempts. Please request a new code.',
      incorrect: 'Incorrect code. Please check and try again.',
    }
    return res.status(400).json({ error: messages[result.reason] || 'Could not verify that code.' })
  }

  let user = await getUserByPhone(cleanPhone)

  if (!user) {
    const cleanName = String(name || '').trim()
    if (!cleanName) {
      return res.status(400).json({ error: 'Please enter your name to finish creating your account.', needsName: true })
    }
    user = await createUser({
      id: 'U-' + crypto.randomBytes(5).toString('hex'),
      name: cleanName,
      phone: cleanPhone,
      email: '',
      passwordHash: null,
      role: 'customer',
      createdAt: new Date().toISOString(),
    })
  }

  const token = signCustomerToken(user)
  const { passwordHash: _passwordHash, ...safeUser } = user
  res.json({ token, user: safeUser })
})

// GET /api/auth/me — returns the logged-in user for a valid token
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router
