const express = require('express')
const crypto = require('crypto')
const adminAuth = require('../middleware/adminAuth')
const { authLimiter } = require('../middleware/rateLimiters')
const { signAdminToken } = require('../lib/auth')
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  approveOrderRefund,
  rejectOrderRefund,
  getRefundOrders,
  getAllSupportTickets,
  updateSupportTicketStatus,
  getAllUsers,
} = require('../lib/db')
const { emitOrderStatusUpdate, emitOrderRefundUpdate } = require('../lib/socket')

const router = express.Router()
const STATUSES = ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']

// POST /api/admin/login — authenticates admin and issues a signed Admin JWT token
router.post('/login', authLimiter, (req, res) => {
  const password = req.body?.password || req.header('x-admin-password')
  const expected = process.env.ADMIN_PASSWORD || 'changeme'

  if (!password || password !== expected) {
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

module.exports = router
