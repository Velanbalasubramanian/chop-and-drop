const { Server } = require('socket.io')
const { verifyToken } = require('./auth')

let io = null

function initSocket(server, corsOrigin) {
  io = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    // Customer tracking: join a specific order room to receive real-time updates
    socket.on('join_order', (orderId) => {
      if (orderId && typeof orderId === 'string') {
        const room = `order:${orderId.trim().toUpperCase()}`
        socket.join(room)
      }
    })

    socket.on('leave_order', (orderId) => {
      if (orderId && typeof orderId === 'string') {
        const room = `order:${orderId.trim().toUpperCase()}`
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
}

function emitOrderStatusUpdate(orderId, status) {
  if (!io) return
  const normalizedId = String(orderId).trim().toUpperCase()
  const payload = { orderId: normalizedId, status }

  // Send to customers listening to this specific order
  io.to(`order:${normalizedId}`).emit('order_status_updated', payload)

  // Also send to all admins on dashboard
  io.to('admin_room').emit('order_status_updated', payload)
}

function emitOrderRefundUpdate(order) {
  if (!io || !order) return
  const normalizedId = String(order.id).trim().toUpperCase()
  // Broadcast to customer listening to this order
  io.to(`order:${normalizedId}`).emit('order_refund_updated', order)
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

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitOrderRefundUpdate,
  emitNewVisit,
  emitNewTicket,
}
