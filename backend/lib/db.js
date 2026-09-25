const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')

// Import Mongoose Models
const User = require('../models/User')
const Order = require('../models/Order')
const SupportTicket = require('../models/SupportTicket')
const Visit = require('../models/Visit')

// ==========================================
// 1. SQLITE ENGINE (Persistent local engine & fallback)
// ==========================================
const DB_PATH = path.join(__dirname, '..', 'data', 'chop_and_drop.db')
const sqlite = new DatabaseSync(DB_PATH)

sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    password_hash TEXT,
    role TEXT DEFAULT 'customer',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    address TEXT NOT NULL,
    delivery_slot TEXT NOT NULL,
    items TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'received',
    payment_method TEXT DEFAULT 'cod',
    payment_status TEXT DEFAULT 'pending',
    amount REAL DEFAULT 0,
    transaction_id TEXT DEFAULT '',
    received_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    order_id TEXT DEFAULT '',
    issue_type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    visited_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
`)

// Safe schema migration for SQLite
try { sqlite.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cod';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN amount REAL DEFAULT 0;") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN transaction_id TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN refund_id TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN refund_reason TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN refund_amount REAL DEFAULT 0;") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN refund_requested_at TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN refund_processed_at TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN refund_upi TEXT DEFAULT '';") } catch (e) {}

// SQLite Queries
const sqliteQueries = {
  findUserById: sqlite.prepare('SELECT * FROM users WHERE id = ?'),
  findUserByPhone: sqlite.prepare('SELECT * FROM users WHERE phone = ?'),
  insertUser: sqlite.prepare(`
    INSERT INTO users (id, name, phone, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  allUsers: sqlite.prepare('SELECT * FROM users ORDER BY created_at DESC'),

  allOrders: sqlite.prepare('SELECT * FROM orders ORDER BY received_at DESC'),
  findOrderById: sqlite.prepare('SELECT * FROM orders WHERE id = ?'),
  findOrdersByUserId: sqlite.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY received_at DESC'),
  findOrderByTrack: sqlite.prepare('SELECT * FROM orders WHERE id = ? AND phone = ?'),
  insertOrder: sqlite.prepare(`
    INSERT INTO orders (id, user_id, name, phone, email, address, delivery_slot, items, notes, status, payment_method, payment_status, amount, transaction_id, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateOrderStatus: sqlite.prepare('UPDATE orders SET status = ? WHERE id = ?'),
  updatePaymentStatus: sqlite.prepare('UPDATE orders SET payment_status = ? WHERE id = ?'),
  requestRefund: sqlite.prepare(`
    UPDATE orders
    SET payment_status = 'refund_requested', refund_reason = ?, refund_amount = ?, refund_upi = ?, refund_requested_at = ?
    WHERE id = ?
  `),
  approveRefund: sqlite.prepare(`
    UPDATE orders
    SET payment_status = 'refunded', status = 'cancelled', refund_id = ?, refund_processed_at = ?
    WHERE id = ?
  `),
  rejectRefund: sqlite.prepare(`
    UPDATE orders
    SET payment_status = ?, refund_reason = ?
    WHERE id = ?
  `),

  insertTicket: sqlite.prepare(`
    INSERT INTO support_tickets (id, name, phone, email, order_id, issue_type, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  allTickets: sqlite.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC'),
  findTicketById: sqlite.prepare('SELECT * FROM support_tickets WHERE id = ?'),

  insertVisit: sqlite.prepare('INSERT INTO visits (path, visited_at) VALUES (?, ?)'),
  countVisitsTotal: sqlite.prepare('SELECT COUNT(*) as count FROM visits'),
  countVisitsSince: sqlite.prepare('SELECT COUNT(*) as count FROM visits WHERE visited_at >= ?'),
  recentVisits: sqlite.prepare('SELECT path, visited_at FROM visits ORDER BY id DESC LIMIT ?'),
}

function formatSqliteUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role || 'customer',
    createdAt: row.created_at,
  }
}

function formatSqliteOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    deliverySlot: row.delivery_slot,
    items: row.items,
    notes: row.notes,
    status: row.status,
    paymentMethod: row.payment_method || 'cod',
    paymentStatus: row.payment_status || 'pending',
    amount: Number(row.amount || 0),
    transactionId: row.transaction_id || '',
    refundId: row.refund_id || '',
    refundReason: row.refund_reason || '',
    refundAmount: Number(row.refund_amount || 0),
    refundRequestedAt: row.refund_requested_at || '',
    refundProcessedAt: row.refund_processed_at || '',
    refundUpi: row.refund_upi || '',
    receivedAt: row.received_at,
  }
}

function formatSqliteTicket(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    orderId: row.order_id,
    issueType: row.issue_type,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }
}

// ==========================================
// 2. MONGODB CONNECTION
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chop_and_drop'
let isMongoConnected = false

async function initMongoDB() {
  try {
    mongoose.set('strictQuery', false)
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: true,
    })
    isMongoConnected = true
    console.log(`[Database] Connected successfully to MongoDB at: ${MONGODB_URI}`)

    // Auto-migrate data from SQLite/JSON to MongoDB if MongoDB is empty
    await migrateToMongo()
  } catch (err) {
    isMongoConnected = false
    console.log(`[Database] MongoDB not reachable at ${MONGODB_URI}.`)
    console.log(`[Database] Active SQLite database running at: backend/data/chop_and_drop.db`)
    console.log(`[Database] (To connect to MongoDB Atlas, set MONGODB_URI in backend/.env)`)
  }
}

initMongoDB()

async function migrateToMongo() {
  if (!isMongoConnected) return
  try {
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const sqliteUsers = sqliteQueries.allUsers.all().map(formatSqliteUser)
      if (sqliteUsers.length > 0) {
        await User.insertMany(sqliteUsers)
        console.log(`[Database Migration] Migrated ${sqliteUsers.length} users to MongoDB.`)
      }
    }

    const orderCount = await Order.countDocuments()
    if (orderCount === 0) {
      const sqliteOrders = sqliteQueries.allOrders.all().map(formatSqliteOrder)
      if (sqliteOrders.length > 0) {
        await Order.insertMany(sqliteOrders)
        console.log(`[Database Migration] Migrated ${sqliteOrders.length} orders to MongoDB.`)
      }
    }
  } catch (e) {
    console.warn('[Database Migration] Error during MongoDB sync:', e.message)
  }
}

function isUsingMongo() {
  return isMongoConnected && mongoose.connection.readyState === 1
}

// ==========================================
// 3. UNIFIED ASYNC DATABASE API
// ==========================================

// --- USERS ---
async function getUserById(id) {
  if (isUsingMongo()) {
    const doc = await User.findOne({ id }).lean()
    return doc || null
  }
  return formatSqliteUser(sqliteQueries.findUserById.get(id))
}

async function getUserByPhone(phone) {
  const cleanPhone = String(phone).trim()
  if (isUsingMongo()) {
    const doc = await User.findOne({ phone: cleanPhone }).lean()
    return doc || null
  }
  return formatSqliteUser(sqliteQueries.findUserByPhone.get(cleanPhone))
}

async function createUser(user) {
  const cleanUser = {
    id: user.id || ('usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    name: user.name,
    phone: String(user.phone).trim(),
    email: user.email || '',
    passwordHash: user.passwordHash || null,
    role: user.role || 'customer',
    createdAt: user.createdAt || new Date().toISOString(),
  }

  // Also sync with SQLite for offline durability
  try {
    sqliteQueries.insertUser.run(
      cleanUser.id,
      cleanUser.name,
      cleanUser.phone,
      cleanUser.email,
      cleanUser.passwordHash,
      cleanUser.role,
      cleanUser.createdAt
    )
  } catch (e) {}

  if (isUsingMongo()) {
    const doc = await User.create(cleanUser)
    return doc.toObject()
  }
  return formatSqliteUser(sqliteQueries.findUserById.get(cleanUser.id))
}

async function getAllUsers() {
  if (isUsingMongo()) {
    return User.find().sort({ createdAt: -1 }).lean()
  }
  return sqliteQueries.allUsers.all().map(formatSqliteUser)
}

// --- ORDERS ---
async function getAllOrders() {
  if (isUsingMongo()) {
    return Order.find().sort({ receivedAt: -1 }).lean()
  }
  return sqliteQueries.allOrders.all().map(formatSqliteOrder)
}

async function getOrderById(id) {
  const normalizedId = String(id).trim().toUpperCase()
  if (isUsingMongo()) {
    return Order.findOne({ id: normalizedId }).lean()
  }
  return formatSqliteOrder(sqliteQueries.findOrderById.get(normalizedId))
}

async function getOrdersByUserId(userId) {
  if (isUsingMongo()) {
    return Order.find({ userId }).sort({ receivedAt: -1 }).lean()
  }
  return sqliteQueries.findOrdersByUserId.all(userId).map(formatSqliteOrder)
}

async function getOrderByTrack(orderId, phone) {
  const normId = String(orderId).trim().toUpperCase()
  const cleanPhone = String(phone).trim()
  if (isUsingMongo()) {
    return Order.findOne({ id: normId, phone: cleanPhone }).lean()
  }
  return formatSqliteOrder(sqliteQueries.findOrderByTrack.get(normId, cleanPhone))
}

async function createOrder(order) {
  const cleanOrder = {
    id: order.id || ('CND-' + Date.now().toString(36).toUpperCase().slice(-6)),
    userId: order.userId || null,
    name: order.name,
    phone: order.phone,
    email: order.email || '',
    address: order.address,
    deliverySlot: order.deliverySlot || 'Not specified',
    items: order.items,
    notes: order.notes || '',
    status: order.status || 'received',
    paymentMethod: order.paymentMethod || 'cod',
    paymentStatus: order.paymentStatus || 'pending',
    amount: Number(order.amount || 0),
    transactionId: order.transactionId || '',
    receivedAt: order.receivedAt || new Date().toISOString(),
  }

  // Also record to SQLite
  try {
    sqliteQueries.insertOrder.run(
      cleanOrder.id,
      cleanOrder.userId,
      cleanOrder.name,
      cleanOrder.phone,
      cleanOrder.email,
      cleanOrder.address,
      cleanOrder.deliverySlot,
      cleanOrder.items,
      cleanOrder.notes,
      cleanOrder.status,
      cleanOrder.paymentMethod,
      cleanOrder.paymentStatus,
      cleanOrder.amount,
      cleanOrder.transactionId,
      cleanOrder.receivedAt
    )
  } catch (e) {}

  if (isUsingMongo()) {
    const doc = await Order.create(cleanOrder)
    return doc.toObject()
  }
  return getOrderById(cleanOrder.id)
}

async function updateOrderStatus(id, status) {
  const normalizedId = String(id).trim().toUpperCase()
  try {
    sqliteQueries.updateOrderStatus.run(status, normalizedId)
  } catch (e) {}

  if (isUsingMongo()) {
    await Order.updateOne({ id: normalizedId }, { $set: { status } })
    return getOrderById(normalizedId)
  }
  return getOrderById(normalizedId)
}

async function updateOrderPaymentStatus(id, paymentStatus) {
  const normalizedId = String(id).trim().toUpperCase()
  try {
    sqliteQueries.updatePaymentStatus.run(paymentStatus, normalizedId)
  } catch (e) {}

  if (isUsingMongo()) {
    await Order.updateOne({ id: normalizedId }, { $set: { paymentStatus } })
    return getOrderById(normalizedId)
  }
  return getOrderById(normalizedId)
}

async function requestOrderRefund(id, { reason, amount, upi }) {
  const normId = String(id).trim().toUpperCase()
  const refundRequestedAt = new Date().toISOString()
  const cleanReason = String(reason || '').trim()
  const cleanAmount = Number(amount || 0)
  const cleanUpi = String(upi || '').trim()

  try {
    sqliteQueries.requestRefund.run(cleanReason, cleanAmount, cleanUpi, refundRequestedAt, normId)
  } catch (e) {}

  if (isUsingMongo()) {
    await Order.updateOne(
      { id: normId },
      {
        $set: {
          paymentStatus: 'refund_requested',
          refundReason: cleanReason,
          refundAmount: cleanAmount,
          refundUpi: cleanUpi,
          refundRequestedAt,
        },
      }
    )
  }
  return getOrderById(normId)
}

async function approveOrderRefund(id, { refundId }) {
  const normId = String(id).trim().toUpperCase()
  const refundProcessedAt = new Date().toISOString()
  const cleanRefundId = String(refundId || '').trim()

  try {
    sqliteQueries.approveRefund.run(cleanRefundId, refundProcessedAt, normId)
  } catch (e) {}

  if (isUsingMongo()) {
    await Order.updateOne(
      { id: normId },
      {
        $set: {
          paymentStatus: 'refunded',
          status: 'cancelled',
          refundId: cleanRefundId,
          refundProcessedAt,
        },
      }
    )
  }
  return getOrderById(normId)
}

async function rejectOrderRefund(id, { rejectionReason, previousPaymentStatus = 'paid' }) {
  const normId = String(id).trim().toUpperCase()
  const reasonText = rejectionReason ? `Rejected: ${rejectionReason}` : 'Refund Request Rejected'

  try {
    sqliteQueries.rejectRefund.run(previousPaymentStatus, reasonText, normId)
  } catch (e) {}

  if (isUsingMongo()) {
    await Order.updateOne(
      { id: normId },
      {
        $set: {
          paymentStatus: previousPaymentStatus,
          refundReason: reasonText,
        },
      }
    )
  }
  return getOrderById(normId)
}

async function getRefundOrders() {
  if (isUsingMongo()) {
    return Order.find({
      $or: [
        { paymentStatus: { $in: ['refund_requested', 'refunded'] } },
        { refundReason: { $ne: '' } },
      ],
    }).sort({ receivedAt: -1 }).lean()
  }
  const all = sqliteQueries.allOrders.all().map(formatSqliteOrder)
  return all.filter((o) => o.paymentStatus === 'refund_requested' || o.paymentStatus === 'refunded' || o.refundReason)
}

// --- SUPPORT TICKETS ---
async function createSupportTicket(ticket) {
  const cleanTicket = {
    id: ticket.id || ('TCK-' + Date.now().toString(36).toUpperCase().slice(-6)),
    name: ticket.name,
    phone: ticket.phone,
    email: ticket.email || '',
    orderId: ticket.orderId || '',
    issueType: ticket.issueType,
    message: ticket.message,
    status: ticket.status || 'open',
    createdAt: ticket.createdAt || new Date().toISOString(),
  }

  try {
    sqliteQueries.insertTicket.run(
      cleanTicket.id,
      cleanTicket.name,
      cleanTicket.phone,
      cleanTicket.email,
      cleanTicket.orderId,
      cleanTicket.issueType,
      cleanTicket.message,
      cleanTicket.status,
      cleanTicket.createdAt
    )
  } catch (e) {}

  if (isUsingMongo()) {
    const doc = await SupportTicket.create(cleanTicket)
    return doc.toObject()
  }
  return formatSqliteTicket(sqliteQueries.findTicketById.get(cleanTicket.id))
}

async function getAllSupportTickets() {
  if (isUsingMongo()) {
    return SupportTicket.find().sort({ createdAt: -1 }).lean()
  }
  return sqliteQueries.allTickets.all().map(formatSqliteTicket)
}

async function updateSupportTicketStatus(id, status) {
  const normId = String(id).trim().toUpperCase()
  try {
    sqlite.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status, normId)
  } catch (e) {}

  if (isUsingMongo()) {
    await SupportTicket.updateOne({ id: normId }, { $set: { status } })
  }
  return { id: normId, status }
}


// --- SITE VISITS ---
async function recordVisit(pagePath) {
  const visitedAt = new Date().toISOString()
  const cleanPath = pagePath || '/'

  try {
    sqliteQueries.insertVisit.run(cleanPath, visitedAt)
  } catch (e) {}

  if (isUsingMongo()) {
    await Visit.create({ path: cleanPath, visitedAt })
  }
  return { path: cleanPath, visitedAt }
}

async function getVisitsSummary() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTodayIso = startOfToday.toISOString()

  if (isUsingMongo()) {
    const total = await Visit.countDocuments()
    const today = await Visit.countDocuments({ visitedAt: { $gte: startOfTodayIso } })
    const recentDocs = await Visit.find().sort({ visitedAt: -1 }).limit(20).lean()
    const recent = recentDocs.map((r) => ({ path: r.path, visitedAt: r.visitedAt }))
    return { total, today, recent }
  }

  const total = sqliteQueries.countVisitsTotal.get().count
  const today = sqliteQueries.countVisitsSince.get(startOfTodayIso).count
  const recentRows = sqliteQueries.recentVisits.all(20)
  const recent = recentRows.map((r) => ({ path: r.path, visitedAt: r.visited_at }))

  return { total, today, recent }
}

module.exports = {
  db: sqlite,
  mongoose,
  isUsingMongo,
  getUserById,
  getUserByPhone,
  createUser,
  getAllUsers,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrderByTrack,
  createOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  requestOrderRefund,
  approveOrderRefund,
  rejectOrderRefund,
  getRefundOrders,
  createSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
  recordVisit,
  getVisitsSummary,
}
