const express = require('express')
const crypto = require('crypto')
const adminAuth = require('../middleware/adminAuth')
const { createSupportTicket, getAllSupportTickets } = require('../lib/db')
const { validatePhoneNumber } = require('../lib/auth')
const { emitNewTicket } = require('../lib/socket')

const router = express.Router()

// POST /api/support — submit a customer support query or ticket
router.post('/', async (req, res) => {
  const { name, phone, email, orderId, issueType, message } = req.body || {}

  const cleanName = String(name || '').trim()
  const cleanPhone = validatePhoneNumber(phone) || String(phone || '').trim()
  const cleanMessage = String(message || '').trim()
  const cleanIssueType = String(issueType || 'General Enquiry').trim()

  if (!cleanName || !cleanPhone || !cleanMessage) {
    return res.status(400).json({ error: 'Name, phone number, and message are required.' })
  }

  const ticket = {
    id: 'TKT-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    name: cleanName,
    phone: cleanPhone,
    email: String(email || '').trim().toLowerCase(),
    orderId: String(orderId || '').trim().toUpperCase(),
    issueType: cleanIssueType,
    message: cleanMessage,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  const saved = await createSupportTicket(ticket)
  emitNewTicket(saved)

  res.status(201).json({
    ok: true,
    ticketId: saved.id,
    message: 'Your support ticket has been received. Our team will contact you shortly.',
  })
})

// GET /api/support — admin view of all tickets
router.get('/', adminAuth, async (req, res) => {
  const tickets = await getAllSupportTickets()
  res.json({ tickets })
})

module.exports = router
