const express = require('express')
const {
  getAllRiders,
  getRiderById,
  getRiderByPhone,
  updateRiderStatus,
  createRider,
  getAllOrders,
  getOrderById,
  updateOrderFollowUp,
  updateOrderPaymentStatus,
  getAllStores,
} = require('../lib/db')
const { comparePassword, signDeliveryToken, verifyToken } = require('../lib/auth')
const { emitOrderStatusUpdate, emitRiderAssigned } = require('../lib/socket')

const router = express.Router()

// Middleware: Verify Rider JWT
async function deliveryAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return res.status(401).json({ error: 'Delivery authentication token required.' })
  }

  const payload = verifyToken(token)
  if (!payload || (payload.role !== 'delivery' && payload.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Valid delivery credentials required.' })
  }

  const rider = await getRiderByPhone(payload.phone) || await getRiderById(payload.sub) || payload
  req.rider = {
    id: rider.id || payload.sub,
    name: rider.name || payload.name,
    phone: rider.phone || payload.phone,
    vehicle: rider.vehicle || payload.vehicle || 'Bike',
    zone: rider.zone || 'Chennai Central',
    rating: rider.rating || 4.9,
    status: rider.status || 'online',
  }
  next()
}

// 1. GET /api/delivery/riders — Public list of demo rider accounts for instant sign in
router.get('/riders', async (req, res) => {
  const riders = await getAllRiders()
  const safeRiders = riders.map(({ passwordHash, ...safe }) => safe)
  res.json({ ok: true, riders: safeRiders })
})

// 2. POST /api/delivery/login — Rider login with phone + password
router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {}
  const rawPhone = String(phone || '').trim()
  const rawPassword = String(password || '').trim()

  if (!rawPhone || !rawPassword) {
    return res.status(400).json({ error: 'Phone number and password are required.' })
  }

  const rider = await getRiderByPhone(rawPhone)
  if (!rider) {
    return res.status(401).json({ error: 'No delivery partner account found with this mobile number.' })
  }

  const matches = await comparePassword(rawPassword, rider.passwordHash)
  // Also accept fallback demo password 'RIDER123' or 'rider123'
  if (!matches && rawPassword !== 'RIDER123' && rawPassword !== 'rider123') {
    return res.status(401).json({ error: 'Incorrect password for delivery partner account.' })
  }

  const token = signDeliveryToken(rider)
  const { passwordHash: _hash, ...safeRider } = rider
  res.json({ ok: true, token, rider: safeRider })
})

// 2b. POST /api/delivery/register — Register a new delivery partner
router.post('/register', async (req, res) => {
  const { name, phone, password, vehicle, zone } = req.body || {}
  const rawName = String(name || '').trim()
  const rawPhone = String(phone || '').trim().replace(/[\s\-()]/g, '')
  const rawPassword = String(password || '').trim()

  if (!rawName) {
    return res.status(400).json({ error: 'Rider full name is required.' })
  }
  if (!rawPhone || rawPhone.length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required.' })
  }
  if (!rawPassword || rawPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' })
  }

  try {
    const rider = await createRider({
      name: rawName,
      phone: rawPhone,
      password: rawPassword,
      vehicle: vehicle || 'Two Wheeler / Bike',
      zone: zone || 'Chennai',
    })
    const token = signDeliveryToken(rider)
    const { passwordHash: _hash, ...safeRider } = rider
    res.status(201).json({ ok: true, token, rider: safeRider })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not register delivery partner.' })
  }
})

// 3. GET /api/delivery/me — Get profile of currently logged-in delivery partner
router.get('/me', deliveryAuth, async (req, res) => {
  res.json({ ok: true, rider: req.rider })
})

// 4. PATCH /api/delivery/duty — Toggle Rider online / offline duty status
router.patch('/duty', deliveryAuth, async (req, res) => {
  const { status } = req.body || {}
  const nextStatus = status === 'offline' ? 'offline' : 'online'
  await updateRiderStatus(req.rider.id, nextStatus)
  req.rider.status = nextStatus
  res.json({ ok: true, status: nextStatus, rider: req.rider })
})

// 5. GET /api/delivery/orders — Live categorized deliveries for riders
router.get('/orders', deliveryAuth, async (req, res) => {
  const allOrders = await getAllOrders()
  const stores = await getAllStores()

  // Helper to attach store details to orders for easy navigation
  function enrichOrder(ord) {
    const store = stores.find((s) => s.id === ord.partnerId || s.storeName === ord.partnerStoreName) || {
      storeName: ord.partnerStoreName || 'Zippo Fulfillment Hub',
      address: 'Anna Nagar West, Chennai',
      phone: '9840199999',
    }
    return {
      ...ord,
      partnerStoreName: store.storeName,
      partnerAddress: store.address || 'Chennai Central Hub',
      partnerPhone: store.phone || '9840199999',
    }
  }

  const riderPhone = req.rider.phone
  const riderName = req.rider.name

  // Available for Pickup: Orders confirmed/preparing that haven't been claimed by another rider
  const available = allOrders
    .filter((o) => {
      const isNotDone = o.status !== 'delivered' && o.status !== 'cancelled'
      const isReadyOrPrep = o.status === 'confirmed' || o.status === 'preparing' || o.status === 'received'
      const isUnclaimed = !o.riderPhone || o.riderPhone === '' || o.riderPhone === riderPhone
      return isNotDone && isReadyOrPrep && isUnclaimed
    })
    .map(enrichOrder)

  // My Active Deliveries: Orders currently claimed by this rider and in progress
  const myActive = allOrders
    .filter((o) => {
      const isMyOrder = o.riderPhone === riderPhone || o.riderName === riderName
      const isInProgress = o.status === 'out_for_delivery' || o.status === 'preparing' || o.status === 'confirmed'
      return isMyOrder && isInProgress
    })
    .map(enrichOrder)

  // Completed Deliveries: Delivered by this rider
  const completed = allOrders
    .filter((o) => {
      const isMyOrder = o.riderPhone === riderPhone || o.riderName === riderName
      return isMyOrder && o.status === 'delivered'
    })
    .map(enrichOrder)

  res.json({
    ok: true,
    available,
    myActive,
    completed,
  })
})

// 6. PATCH /api/delivery/orders/:id/accept — Rider accepts / claims delivery
router.patch('/orders/:id/accept', deliveryAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const order = await getOrderById(orderId)

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' })
  }
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return res.status(400).json({ error: `Cannot accept this order. Current status is ${order.status}.` })
  }
  if (order.riderPhone && order.riderPhone !== req.rider.phone) {
    return res.status(409).json({ error: `This order is already claimed by ${order.riderName}.` })
  }

  const updated = await updateOrderFollowUp(orderId, {
    riderName: req.rider.name,
    riderPhone: req.rider.phone,
    followUpNotes: `Accepted by rider ${req.rider.name} (${req.rider.vehicle})`,
  })

  // Broadcast rider assignment in real time to customer, partner, and admin!
  emitRiderAssigned(orderId, {
    riderName: req.rider.name,
    riderPhone: req.rider.phone,
    vehicle: req.rider.vehicle,
    status: updated.status,
  })

  res.json({
    ok: true,
    message: `Delivery accepted! Heading to store for pickup.`,
    order: updated,
  })
})

// 7. PATCH /api/delivery/orders/:id/pickup — Rider picks up from store & heads to customer
router.patch('/orders/:id/pickup', deliveryAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const order = await getOrderById(orderId)

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  const updated = await updateOrderFollowUp(orderId, {
    status: 'out_for_delivery',
    riderName: req.rider.name,
    riderPhone: req.rider.phone,
    followUpNotes: `Picked up by ${req.rider.name}. In transit to customer.`,
  })

  // Broadcast status update in real time
  emitOrderStatusUpdate(orderId, 'out_for_delivery', {
    riderName: req.rider.name,
    riderPhone: req.rider.phone,
  })

  res.json({
    ok: true,
    message: 'Order picked up! Now Out for Delivery.',
    order: updated,
  })
})

// 8. PATCH /api/delivery/orders/:id/deliver — Rider successfully delivers order to customer
router.patch('/orders/:id/deliver', deliveryAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const order = await getOrderById(orderId)

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  const updated = await updateOrderFollowUp(orderId, {
    status: 'delivered',
    riderName: req.rider.name,
    riderPhone: req.rider.phone,
    followUpNotes: `Delivered safely by ${req.rider.name}. Completed.`,
  })

  // If COD, mark payment status as paid
  if (order.paymentMethod === 'cod') {
    await updateOrderPaymentStatus(orderId, 'paid', `CASH_COLLECTED_BY_${req.rider.name.toUpperCase()}`)
  }

  // Broadcast live completion to customer, partner, and admin
  emitOrderStatusUpdate(orderId, 'delivered', {
    riderName: req.rider.name,
    riderPhone: req.rider.phone,
  })

  res.json({
    ok: true,
    message: 'Order delivered successfully! Payout credited.',
    order: updated,
  })
})

// 9. GET /api/delivery/stats — Rider dashboard earnings and metrics
router.get('/stats', deliveryAuth, async (req, res) => {
  const allOrders = await getAllOrders()
  const riderOrders = allOrders.filter(
    (o) => o.riderPhone === req.rider.phone || o.riderName === req.rider.name
  )

  const delivered = riderOrders.filter((o) => o.status === 'delivered')
  const active = riderOrders.filter((o) => o.status === 'out_for_delivery' || o.status === 'preparing')

  const basePayoutPerDelivery = 45 // ₹45 per delivery completed
  const totalEarnings = delivered.length * basePayoutPerDelivery

  // Calculate COD cash in hand to deposit to hub
  const codCashCollected = delivered
    .filter((o) => o.paymentMethod === 'cod')
    .reduce((sum, o) => sum + (o.amount || 0), 0)

  res.json({
    ok: true,
    completedCount: delivered.length,
    activeCount: active.length,
    totalEarnings,
    codCashCollected,
    rating: req.rider.rating || 4.9,
    vehicle: req.rider.vehicle,
    zone: req.rider.zone,
    payoutRate: basePayoutPerDelivery,
  })
})

module.exports = router
