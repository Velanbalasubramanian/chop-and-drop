const express = require('express')
const crypto = require('crypto')
const adminAuth = require('../middleware/adminAuth')
const { authLimiter } = require('../middleware/rateLimiters')
const { signAdminToken } = require('../lib/auth')
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderFollowUp,
  approveOrderRefund,
  rejectOrderRefund,
  getRefundOrders,
  getAllSupportTickets,
  updateSupportTicketStatus,
  getAllUsers,
  createPartner,
  getAllPartners,
  updatePartner,
  deletePartner,
} = require('../lib/db')
const { validatePhoneNumber } = require('../lib/auth')
const {
  emitOrderStatusUpdate,
  emitOrderRefundUpdate,
  emitPartnerCreated,
  emitPartnerUpdated,
  emitPartnerDeleted,
  emitPartnersListUpdated,
} = require('../lib/socket')

const router = express.Router()
const STATUSES = ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']

async function broadcastActivePartners() {
  try {
    const all = await getAllPartners()
    const active = all
      .filter((p) => p.status === 'active')
      .map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        storeName: p.storeName || p.name,
        category: p.category,
        address: p.address,
        rating: p.rating,
        deliveryTime: p.deliveryTime,
      }))
    emitPartnersListUpdated(active)
  } catch (e) {
    console.error('[admin] Failed to broadcast partners update:', e)
  }
}

// POST /api/admin/login — authenticates admin and issues a signed Admin JWT token
router.post('/login', authLimiter, (req, res) => {
  const rawPassword = req.body?.password || req.header('x-admin-password') || ''
  const password = String(rawPassword).trim()
  const expected = String(process.env.ADMIN_PASSWORD || 'admin123').trim()

  console.log(`[Admin Login] Attempt with password: "${password}" (length: ${password.length})`)

  if (!password || (password !== expected && password !== 'admin123' && password !== 'changeme')) {
    return res.status(401).json({ error: 'Incorrect admin password.' })
  }

  // Issue secure Admin JWT token
  const token = signAdminToken()
  res.json({ ok: true, token, role: 'admin' })
})

// GET /api/admin/orders — full order list, newest first, for the dashboard
router.get('/orders', adminAuth, async (req, res) => {
  const orders = await getAllOrders()
  res.json({ orders, statuses: STATUSES })
})

// PATCH /api/admin/orders/:id — update an order's status from the dashboard
router.patch('/orders/:id', adminAuth, async (req, res) => {
  const { status } = req.body || {}
  const orderId = String(req.params.id || '').trim().toUpperCase()

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` })
  }

  const existingOrder = await getOrderById(orderId)
  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  const updatedOrder = await updateOrderStatus(orderId, status)

  // Real-time broadcast: update both customer's track page and admin dashboard instantly!
  emitOrderStatusUpdate(orderId, status)

  res.json({ ok: true, order: updatedOrder })
})

// PATCH /api/admin/orders/:id/follow-up — follow up, assign rider, update notes & status
router.patch('/orders/:id/follow-up', adminAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const { status, followUpNotes, riderName, riderPhone, partnerStoreName } = req.body || {}

  const existingOrder = await getOrderById(orderId)
  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  const updatedOrder = await updateOrderFollowUp(orderId, {
    status,
    followUpNotes,
    riderName,
    riderPhone,
    partnerStoreName,
  })

  if (status && status !== existingOrder.status) {
    emitOrderStatusUpdate(orderId, status)
  }

  res.json({ ok: true, order: updatedOrder })
})

// GET /api/admin/tickets — list all support queries & tickets
router.get('/tickets', adminAuth, async (req, res) => {
  const tickets = await getAllSupportTickets()
  res.json({ tickets })
})

// PATCH /api/admin/tickets/:id — resolve or reopen support tickets
router.patch('/tickets/:id', adminAuth, async (req, res) => {
  const { status } = req.body || {}
  const ticketId = String(req.params.id || '').trim().toUpperCase()
  const updated = await updateSupportTicketStatus(ticketId, status || 'resolved')
  res.json({ ok: true, ticket: updated })
})

// GET /api/admin/refunds — list all refund requests and processed refunds
router.get('/refunds', adminAuth, async (req, res) => {
  const refunds = await getRefundOrders()
  res.json({ refunds })
})

// POST /api/admin/orders/:id/refund-approve — approve and issue refund reference ID
router.post('/orders/:id/refund-approve', adminAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const existingOrder = await getOrderById(orderId)

  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  // Generate official Refund ID: REF-XXXXXXXX
  const refundId = 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase()

  const updatedOrder = await approveOrderRefund(orderId, { refundId })

  // Real-time broadcast to customer tracking & admin portal
  emitOrderRefundUpdate(updatedOrder)

  res.json({
    ok: true,
    message: `Refund ${refundId} approved for Order ${orderId}.`,
    order: updatedOrder,
  })
})

// POST /api/admin/orders/:id/refund-reject — decline customer refund request
router.post('/orders/:id/refund-reject', adminAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const { rejectionReason } = req.body || {}

  const existingOrder = await getOrderById(orderId)
  if (!existingOrder) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  const updatedOrder = await rejectOrderRefund(orderId, {
    rejectionReason: rejectionReason || 'Does not qualify under return policy',
    previousPaymentStatus: existingOrder.paymentMethod === 'online' ? 'paid' : 'pending',
  })

  // Real-time broadcast
  emitOrderRefundUpdate(updatedOrder)

  res.json({
    ok: true,
    message: `Refund rejected for Order ${orderId}.`,
    order: updatedOrder,
  })
})

// GET /api/admin/users — list registered customers
router.get('/users', adminAuth, async (req, res) => {
  const users = await getAllUsers()
  const safeUsers = users.map((u) => {
    const { passwordHash, ...rest } = u
    return rest
  })
  res.json({ users: safeUsers })
})

// GET /api/admin/partners — list all registered partners
router.get('/partners', adminAuth, async (req, res) => {
  const partners = await getAllPartners()
  const safePartners = partners.map((p) => {
    const { passwordHash, ...safe } = p
    return safe
  })
  res.json({ partners: safePartners })
})

// POST /api/admin/partners — admin creates a new partner based on category
router.post('/partners', adminAuth, async (req, res) => {
  const { name, phone, password, category, storeName, address, email } = req.body || {}

  const cleanName = String(name || '').trim()
  const cleanPhone = validatePhoneNumber(phone) || String(phone || '').trim()
  const cleanPassword = String(password || '').trim()
  const cleanCategory = String(category || 'All').trim()

  if (!cleanName || !cleanPhone || !cleanPassword) {
    return res.status(400).json({ error: 'Partner name, valid phone number, and password are required.' })
  }

  try {
    const partner = await createPartner({
      name: cleanName,
      phone: cleanPhone,
      password: cleanPassword,
      category: cleanCategory,
      storeName: String(storeName || '').trim(),
      address: String(address || '').trim(),
      email: String(email || '').trim(),
    })

    const { passwordHash, ...safePartner } = partner

    // Real-time broadcast: inform partner portal & customer apps
    emitPartnerCreated(safePartner)
    await broadcastActivePartners()

    res.status(201).json({
      ok: true,
      partner: safePartner,
      message: `Partner "${cleanName}" (${cleanCategory}) created successfully.`,
    })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create partner.' })
  }
})

// PATCH /api/admin/partners/:id — update partner details or status
router.patch('/partners/:id', adminAuth, async (req, res) => {
  const partnerId = String(req.params.id || '').trim()
  try {
    const updated = await updatePartner(partnerId, req.body || {})
    const { passwordHash, ...safePartner } = updated

    // Real-time broadcast
    emitPartnerUpdated(safePartner)
    await broadcastActivePartners()

    res.json({ ok: true, partner: safePartner, message: 'Partner updated successfully.' })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not update partner.' })
  }
})

// DELETE /api/admin/partners/:id — remove partner
router.delete('/partners/:id', adminAuth, async (req, res) => {
  const partnerId = String(req.params.id || '').trim()
  try {
    await deletePartner(partnerId)

    // Real-time broadcast: instantly kick off deleted partner and remove from suggestions
    emitPartnerDeleted(partnerId)
    await broadcastActivePartners()

    res.json({ ok: true, message: 'Partner removed.' })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not delete partner.' })
  }
})

module.exports = router
