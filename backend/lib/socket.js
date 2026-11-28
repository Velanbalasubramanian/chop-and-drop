const { Server } = require('socket.io')
const { verifyToken } = require('./auth')

let io = null

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    // Customer tracking: join a specific order room to receive real-time updates
    socket.on('join_order', (orderId) => {
      if (orderId && typeof orderId === 'string') {
        const clean = orderId.replace(/^#/, '').trim().toUpperCase()
        const room = `order:${clean}`
        socket.join(room)
      }
    })

    socket.on('leave_order', (orderId) => {
      if (orderId && typeof orderId === 'string') {
        const clean = orderId.replace(/^#/, '').trim().toUpperCase()
        const room = `order:${clean}`
        socket.leave(room)
      }
    })

    // Staff/Admin room: join if authenticated with Admin JWT or admin password
    socket.on('join_admin', (data) => {
      const token = typeof data === 'string' ? data : data?.token
      const password = data?.password

      let isAuthed = false

      if (token) {
        const payload = verifyToken(token)
        if (payload && payload.role === 'admin') {
          isAuthed = true
        }
      }

      if (!isAuthed && password) {
        const expected = process.env.ADMIN_PASSWORD || 'changeme'
        if (password === expected) {
          isAuthed = true
        }
      }

      if (isAuthed) {
        socket.join('admin_room')
        socket.emit('admin_joined', { ok: true })
      } else {
        socket.emit('admin_error', { error: 'Authentication failed for admin room.' })
      }
    })

    // Partner room: join if authenticated with Partner JWT
    socket.on('join_partner', (data) => {
      const token = typeof data === 'string' ? data : data?.token
      if (!token) return
      const payload = verifyToken(token)
      if (payload && (payload.role === 'partner' || payload.role === 'admin')) {
        socket.join('partners_room')
        if (payload.category) {
          socket.join(`partner_cat:${payload.category}`)
        }
        socket.emit('partner_joined', { ok: true, category: payload.category })
      }
    })

    // Delivery Partner / Rider room: join if authenticated with Delivery JWT
    socket.on('join_delivery', (data) => {
      const token = typeof data === 'string' ? data : data?.token
      if (!token) return
      const payload = verifyToken(token)
      if (payload && (payload.role === 'delivery' || payload.role === 'admin')) {
        socket.join('riders_room')
        socket.emit('delivery_joined', { ok: true, riderId: payload.sub, name: payload.name })
      }
    })

    socket.on('disconnect', () => {
      // Clean disconnect
    })
  })

  return io
}

function getIO() {
  return io
}

function emitNewOrder(order) {
  if (!io) return
  // Broadcast to all authenticated admin sockets
  io.to('admin_room').emit('new_order', order)
  // Broadcast to partner rooms
  io.to('partners_room').emit('new_order', order)
  // Broadcast to delivery riders
  io.to('riders_room').emit('new_order', order)
}

function emitOrderStatusUpdate(orderId, status, extra = {}) {
  if (!io) return
  const normalizedId = String(orderId).replace(/^#/, '').trim().toUpperCase()
  const payload = { orderId: normalizedId, status, ...extra }

  // Send to customers listening to this specific order room
  io.to(`order:${normalizedId}`).emit('order_status_updated', payload)

  // Broadcast globally so any customer tracking screen updates instantly
  io.emit('order_status_updated', payload)

  // Also send to all admins on dashboard
  io.to('admin_room').emit('order_status_updated', payload)

  // Send to partner rooms
  io.to('partners_room').emit('order_status_updated', payload)

  // Send to delivery riders room
  io.to('riders_room').emit('order_status_updated', payload)
}

function emitRiderAssigned(orderId, riderInfo = {}) {
  if (!io) return
  const normalizedId = String(orderId).replace(/^#/, '').trim().toUpperCase()
  const payload = { orderId: normalizedId, ...riderInfo }
  io.to(`order:${normalizedId}`).emit('rider_assigned', payload)
  io.emit('rider_assigned', payload)
  io.to('admin_room').emit('rider_assigned', payload)
  io.to('partners_room').emit('rider_assigned', payload)
  io.to('riders_room').emit('rider_assigned', payload)
}

function emitOrderRefundUpdate(order) {
  if (!io || !order) return
  const normalizedId = String(order.id).replace(/^#/, '').trim().toUpperCase()
  // Broadcast to customer listening to this order
  io.to(`order:${normalizedId}`).emit('order_refund_updated', order)
  io.emit('order_refund_updated', order)
  // Broadcast to admin dashboard
  io.to('admin_room').emit('order_refund_updated', order)
}

function emitNewVisit(visit) {
  if (!io) return
  // Send live visit activity to admin dashboard
  io.to('admin_room').emit('new_visit', visit)
}

function emitNewTicket(ticket) {
  if (!io) return
  // Send new support ticket notification to admin
  io.to('admin_room').emit('new_ticket', ticket)
}

function emitStockUpdate(products) {
  if (!io || !products) return
  // Broadcast live stock updates to all connected clients (customers, admin, partners)
  io.emit('stock_updated', products)
}

function emitProductCreated(product) {
  if (!io || !product) return
  io.emit('product_created', product)
  io.emit('stock_updated', [product])
}

function emitProductDeleted(productId) {
  if (!io || !productId) return
  io.emit('product_deleted', { productId })
}

function emitPartnerCreated(partner) {
  if (!io || !partner) return
  io.emit('partner_created', partner)
}

function emitPartnerUpdated(partner) {
  if (!io || !partner) return
  io.emit('partner_updated', partner)
}

function emitPartnerDeleted(partnerId) {
  if (!io || !partnerId) return
  io.emit('partner_deleted', { partnerId })
}

function emitPartnersListUpdated(partners) {
  if (!io || !partners) return
  io.emit('partners_updated', partners)
}

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitRiderAssigned,
  emitOrderRefundUpdate,
  emitNewVisit,
  emitNewTicket,
  emitStockUpdate,
  emitProductCreated,
  emitProductDeleted,
  emitPartnerCreated,
  emitPartnerUpdated,
  emitPartnerDeleted,
  emitPartnersListUpdated,
}
