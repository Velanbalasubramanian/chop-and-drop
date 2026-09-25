const express = require('express')
const crypto = require('crypto')

const { sendOrderConfirmationEmail } = require('../lib/mailer')
const { sendOrderConfirmationSms } = require('../lib/sms')
const { requireAuth, attachUserIfPresent } = require('../middleware/requireAuth')
const { orderLimiter } = require('../middleware/rateLimiters')
const { createOrder, getOrdersByUserId, getOrderByTrack, getOrderById, requestOrderRefund } = require('../lib/db')
const { validatePhoneNumber } = require('../lib/auth')
const { emitNewOrder, emitOrderRefundUpdate } = require('../lib/socket')

const router = express.Router()
const STATUSES = ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']

function makeOrderId() {
  // Short, readable, hard to guess — e.g. "CD-8K3F2A"
  return 'CD-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
}

// POST /api/orders — customer places an order
router.post('/', orderLimiter, attachUserIfPresent, async (req, res) => {
  const {
    name,
    phone,
    email,
    address,
    deliverySlot,
    items,
    notes,
    paymentMethod,
    paymentStatus,
    amount,
    transactionId,
  } = req.body || {}

  const cleanName = String(name || '').trim()
  const cleanPhone = validatePhoneNumber(phone) || String(phone || '').trim()
  const cleanAddress = String(address || '').trim()
  const cleanItems = String(items || '').trim()

  if (!cleanName || !cleanPhone || !cleanAddress || !cleanItems) {
    return res.status(400).json({ error: 'Name, valid phone, address, and items are required.' })
  }

  const isOnline = paymentMethod === 'online'
  const cleanPaymentMethod = isOnline ? 'online' : 'cod'
  const cleanPaymentStatus = isOnline ? (paymentStatus || 'paid') : 'pending'

  const order = {
    id: makeOrderId(),
    userId: req.user ? req.user.id : null,
    name: cleanName,
    phone: cleanPhone,
    email: String(email || '').trim().toLowerCase(),
    address: cleanAddress,
    deliverySlot: String(deliverySlot || 'Not specified').trim(),
    items: cleanItems,
    notes: String(notes || '').trim(),
    status: 'received',
    paymentMethod: cleanPaymentMethod,
    paymentStatus: cleanPaymentStatus,
    amount: Number(amount || 0),
    transactionId: String(transactionId || '').trim(),
    receivedAt: new Date().toISOString(),
  }

  // Save to database
  const savedOrder = await createOrder(order)

  // Real-time broadcast to admin dashboard
  emitNewOrder(savedOrder)

  // Asynchronous email/SMS notifications
  const [emailResult, smsResult] = await Promise.all([
    sendOrderConfirmationEmail(savedOrder),
    sendOrderConfirmationSms(savedOrder),
  ])

  res.status(201).json({
    ok: true,
    orderId: savedOrder.id,
    status: savedOrder.status,
    paymentMethod: savedOrder.paymentMethod,
    paymentStatus: savedOrder.paymentStatus,
    amount: savedOrder.amount,
    transactionId: savedOrder.transactionId,
    notifications: { email: emailResult, sms: smsResult },
  })
})

// GET /api/orders/mine — order history for logged-in customer
router.get('/mine', requireAuth, async (req, res) => {
  const orders = await getOrdersByUserId(req.user.id)
  res.json({ orders })
})

// GET /api/orders/transactions — transaction history for logged-in customer
router.get('/transactions', requireAuth, async (req, res) => {
  const orders = await getOrdersByUserId(req.user.id)
  const transactions = orders.map((o) => ({
    id: o.transactionId || `TXN-COD-${o.id.replace('CD-', '')}`,
    orderId: o.id,
    amount: o.amount || 0,
    paymentMethod: o.paymentMethod || 'cod',
    paymentStatus: o.paymentStatus || 'pending',
    refundId: o.refundId || '',
    refundReason: o.refundReason || '',
    refundAmount: o.refundAmount || 0,
    refundRequestedAt: o.refundRequestedAt || '',
    refundProcessedAt: o.refundProcessedAt || '',
    date: o.receivedAt,
    items: o.items,
  }))
  res.json({ transactions })
})

// POST /api/orders/:id/refund — customer requests a refund or order cancellation
router.post('/:id/refund', attachUserIfPresent, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const { phone, reason, amount, upi } = req.body || {}

  const order = await getOrderById(orderId)
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  // Security check: phone must match order, or authenticated user must own the order
  const orderPhoneClean = String(order.phone || '').trim()
  const inputPhoneClean = String(phone || '').trim()
  const userMatches = req.user && req.user.id && req.user.id === order.userId
  const phoneMatches = inputPhoneClean && (orderPhoneClean === inputPhoneClean || orderPhoneClean.slice(-10) === inputPhoneClean.slice(-10))

  if (!userMatches && !phoneMatches) {
    return res.status(403).json({ error: 'Verification failed. Phone number does not match order record.' })
  }

  if (order.paymentStatus === 'refunded') {
    return res.status(400).json({ error: 'This order has already been refunded.' })
  }

  const cleanReason = String(reason || 'Customer requested refund / cancellation').trim()
  const refundAmount = amount ? Number(amount) : order.amount

  const updatedOrder = await requestOrderRefund(orderId, {
    reason: cleanReason,
    amount: refundAmount,
    upi: upi || orderPhoneClean,
  })

  // Broadcast real-time refund event to customer and admin
  emitOrderRefundUpdate(updatedOrder)

  res.json({
    ok: true,
    message: 'Refund request submitted successfully. Our team will verify and process it shortly.',
    order: updatedOrder,
  })
})

// GET /api/orders/track?orderId=CD-XXXXXX&phone=98765xxxxx
router.get('/track', async (req, res) => {
  const { orderId, phone } = req.query

  if (!orderId || !phone) {
    return res.status(400).json({ error: 'orderId and phone are required.' })
  }

  const order = await getOrderByTrack(orderId, phone)

  if (!order) {
    return res.status(404).json({ error: "We couldn't find an order with that ID and phone number." })
  }

  res.json({
    id: order.id,
    status: order.status,
    deliverySlot: order.deliverySlot,
    items: order.items,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    amount: order.amount,
    transactionId: order.transactionId,
    refundId: order.refundId,
    refundReason: order.refundReason,
    refundAmount: order.refundAmount,
    refundRequestedAt: order.refundRequestedAt,
    refundProcessedAt: order.refundProcessedAt,
    refundUpi: order.refundUpi,
    receivedAt: order.receivedAt,
    steps: STATUSES,
  })
})

module.exports = router
