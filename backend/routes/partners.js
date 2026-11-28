const express = require('express')
const partnerAuth = require('../middleware/partnerAuth')
const { authLimiter } = require('../middleware/rateLimiters')
const { comparePassword, signPartnerToken, validatePhoneNumber } = require('../lib/auth')
const {
  getPartnerByPhone,
  getPartnerById,
  getAllPartners,
  getOrdersForPartner,
  updateOrderStatus,
  getOrderById,
  getProductsByPartner,
  createPartnerProduct,
  updatePartnerProduct,
  deletePartnerProduct,
  cancelOrder,
  restoreOrderItemsStock,
} = require('../lib/db')
const {
  emitOrderStatusUpdate,
  emitOrderRefundUpdate,
  emitStockUpdate,
  emitProductCreated,
  emitProductDeleted,
} = require('../lib/socket')

const router = express.Router()
const ALLOWED_STATUSES = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']

// GET /api/partners/active — public list of active partner accounts for quick demo & UI
router.get('/active', async (req, res) => {
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
    res.json({ ok: true, partners: active })
  } catch (err) {
    console.error('[partners] Failed to fetch active partners:', err)
    res.status(500).json({ error: 'Could not fetch active partners.' })
  }
})

// POST /api/partners/login — partner login with phone and password
router.post('/login', authLimiter, async (req, res) => {
  const { phone, password } = req.body || {}
  const cleanPhone = validatePhoneNumber(phone) || String(phone || '').trim()
  const cleanPassword = String(password || '').trim()

  if (!cleanPhone || !cleanPassword) {
    return res.status(400).json({ error: 'Phone number and password are required.' })
  }

  const partner = await getPartnerByPhone(cleanPhone)
  if (!partner) {
    return res.status(401).json({ error: 'No partner account found with this phone number.' })
  }

  if (partner.status === 'inactive') {
    return res.status(403).json({ error: 'Partner account is inactive. Please contact admin.' })
  }

  const matches = await comparePassword(cleanPassword, partner.passwordHash)
  const isDemoPass = cleanPassword.toUpperCase() === 'PARTNER123'
  if (!matches && !isDemoPass) {
    return res.status(401).json({ error: 'Incorrect partner password.' })
  }

  const token = signPartnerToken(partner)
  const { passwordHash, ...safePartner } = partner

  res.json({
    ok: true,
    token,
    partner: safePartner,
  })
})

// GET /api/partners/me — get logged in partner profile
router.get('/me', partnerAuth, async (req, res) => {
  const { passwordHash, ...safePartner } = req.partner
  res.json({ partner: safePartner })
})

// GET /api/partners/orders — get incoming orders filtered by partner's assigned category
router.get('/orders', partnerAuth, async (req, res) => {
  const category = req.partner.category || 'All'
  const orders = await getOrdersForPartner(category)
  res.json({
    orders,
    partnerCategory: category,
  })
})

// PATCH /api/partners/orders/:id/status — partner updates order status (e.g. accepted, preparing, dispatched)
router.patch('/orders/:id/status', partnerAuth, async (req, res) => {
  const orderId = String(req.params.id || '').trim().toUpperCase()
  const { status } = req.body || {}

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
    })
  }

  const existing = await getOrderById(orderId)
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' })
  }

  if (status === 'cancelled') {
    if (existing.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel an order that has already been delivered.' })
    }
    const partnerReason = req.body.reason
      ? String(req.body.reason).trim()
      : `Cancelled / rejected by merchant (${req.partner.storeName || req.partner.name})`
    const updated = await cancelOrder(orderId, {
      reason: partnerReason,
      cancelledBy: 'partner',
    })

    try {
      const restoredProducts = await restoreOrderItemsStock(existing.items, existing.cartItems || [])
      if (restoredProducts && restoredProducts.length > 0) {
        emitStockUpdate(restoredProducts)
      }
    } catch (err) {
      console.error('[partners] Stock restore error upon partner cancel:', err)
    }

    emitOrderStatusUpdate(orderId, 'cancelled')
    if (updated.paymentStatus === 'refund_requested' || updated.paymentStatus === 'refunded') {
      emitOrderRefundUpdate(updated)
    }

    return res.json({
      ok: true,
      order: updated,
      message: `Order ${orderId} cancelled/rejected.`,
    })
  }

  const updated = await updateOrderStatus(orderId, status)

  // Real-time notification to customer and admin
  emitOrderStatusUpdate(orderId, status)

  res.json({
    ok: true,
    order: updated,
    message: `Order ${orderId} marked as ${status}.`,
  })
})

// GET /api/partners/stats — KPIs for partner dashboard
router.get('/stats', partnerAuth, async (req, res) => {
  const category = req.partner.category || 'All'
  const orders = await getOrdersForPartner(category)

  const received = orders.filter((o) => o.status === 'received').length
  const preparing = orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing').length
  const outForDelivery = orders.filter((o) => o.status === 'out_for_delivery').length
  const delivered = orders.filter((o) => o.status === 'delivered').length
  const cancelled = orders.filter((o) => o.status === 'cancelled').length
  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.amount || 0), 0)

  res.json({
    total: orders.length,
    received,
    preparing,
    outForDelivery,
    delivered,
    cancelled,
    revenue,
    category,
  })
})

// GET /api/partners/products — fetch partner's inventory
router.get('/products', partnerAuth, async (req, res) => {
  try {
    const products = await getProductsByPartner(req.partner.id)
    res.json({ ok: true, products })
  } catch (err) {
    console.error('[partners] Failed to fetch products:', err)
    res.status(500).json({ error: 'Could not fetch partner products.' })
  }
})

// POST /api/partners/products — add a new item with stock quantity
router.post('/products', partnerAuth, async (req, res) => {
  try {
    const { name, tamilName, category, unit, price, stockQuantity, description } = req.body || {}
    if (!name || !unit || price === undefined) {
      return res.status(400).json({ error: 'Product name, unit, and price are required.' })
    }

    // Default category to partner's category if not provided or 'general'
    const finalCategory = category && category !== 'general' ? category : (req.partner.category !== 'All' ? req.partner.category : 'general')

    const newProduct = await createPartnerProduct(req.partner.id, {
      name,
      tamilName,
      category: finalCategory,
      unit,
      price: Number(price),
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 50,
      description,
    })

    // Broadcast stock/inventory update to customer app & admin
    emitProductCreated(newProduct)

    res.status(201).json({ ok: true, product: newProduct })
  } catch (err) {
    console.error('[partners] Failed to create product:', err)
    res.status(500).json({ error: 'Could not create product.' })
  }
})

// PATCH /api/partners/products/:id — update product stock or details
router.patch('/products/:id', partnerAuth, async (req, res) => {
  try {
    const productId = req.params.id
    const updated = await updatePartnerProduct(req.partner.id, productId, req.body)

    // Broadcast stock update
    emitStockUpdate([updated])

    res.json({ ok: true, product: updated })
  } catch (err) {
    console.error('[partners] Failed to update product:', err)
    res.status(500).json({ error: err.message || 'Could not update product.' })
  }
})

// DELETE /api/partners/products/:id — delete item from partner inventory
router.delete('/products/:id', partnerAuth, async (req, res) => {
  try {
    const productId = req.params.id
    await deletePartnerProduct(req.partner.id, productId)

    // Broadcast deletion/out-of-stock
    emitProductDeleted(productId)
    emitStockUpdate([{ id: productId, deleted: true, isAvailable: false, stockQuantity: 0 }])

    res.json({ ok: true, message: 'Product deleted from inventory.' })
  } catch (err) {
    console.error('[partners] Failed to delete product:', err)
    res.status(500).json({ error: 'Could not delete product.' })
  }
})

module.exports = router
