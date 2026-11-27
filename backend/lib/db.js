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
const DB_PATH = path.join(__dirname, '..', 'data', 'zippo.db')
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

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tamil_name TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    unit TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'All',
    store_name TEXT DEFAULT '',
    address TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
  CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone);
  CREATE INDEX IF NOT EXISTS idx_partners_category ON partners(category);
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

// Products partner inventory & live stock columns
try { sqlite.exec("ALTER TABLE products ADD COLUMN partner_id TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE products ADD COLUMN stock_quantity REAL DEFAULT 50;") } catch (e) {}
try { sqlite.exec("ALTER TABLE products ADD COLUMN is_available INTEGER DEFAULT 1;") } catch (e) {}

// Partners Store details columns
try { sqlite.exec("ALTER TABLE partners ADD COLUMN rating REAL DEFAULT 4.8;") } catch (e) {}
try { sqlite.exec("ALTER TABLE partners ADD COLUMN delivery_time TEXT DEFAULT '20-30 mins';") } catch (e) {}
try { sqlite.exec("ALTER TABLE partners ADD COLUMN banner_image TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE partners ADD COLUMN description TEXT DEFAULT '';") } catch (e) {}

// Order Partner & Follow-up tracking columns
try { sqlite.exec("ALTER TABLE orders ADD COLUMN partner_id TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN partner_store_name TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN follow_up_notes TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN rider_name TEXT DEFAULT '';") } catch (e) {}
try { sqlite.exec("ALTER TABLE orders ADD COLUMN rider_phone TEXT DEFAULT '';") } catch (e) {}

// One-time data sync: ensure Nila Bakery is properly named and linked
try {
  sqlite.exec(`
    UPDATE partners SET store_name = 'Nila Bakery', address = 'Anna Nagar, Chennai', description = 'Artisan freshly baked molten brownies, celebration cakes & pastries', rating = 4.9, delivery_time = '20-25 mins' WHERE id = 'PRT-4400FA';
    UPDATE products SET partner_id = 'PRT-4400FA' WHERE (category = 'cakes' OR id LIKE '%brownie%') AND (partner_id = '' OR partner_id IS NULL OR partner_id = 'PRT-CAKE01');
  `)
} catch (e) {}

// SQLite Queries
const sqliteQueries = {
  findUserById: sqlite.prepare('SELECT * FROM users WHERE id = ?'),
  findUserByPhone: sqlite.prepare('SELECT * FROM users WHERE phone = ?'),
  insertUser: sqlite.prepare(`
    INSERT INTO users (id, name, phone, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  updateUser: sqlite.prepare(`
    UPDATE users
    SET name = ?, email = ?, password_hash = ?
    WHERE id = ?
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
  updateOrderFollowUp: sqlite.prepare(`
    UPDATE orders
    SET status = ?, follow_up_notes = ?, rider_name = ?, rider_phone = ?, partner_store_name = ?
    WHERE id = ?
  `),
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

  allProducts: sqlite.prepare(`
    SELECT products.*, 
           partners.store_name, 
           partners.name as partner_name, 
           partners.rating as partner_rating, 
           partners.delivery_time as partner_delivery_time, 
           partners.address as partner_address,
           partners.category as partner_category
    FROM products
    LEFT JOIN partners ON products.partner_id = partners.id
    ORDER BY products.rowid ASC
  `),
  productById: sqlite.prepare(`
    SELECT products.*, 
           partners.store_name, 
           partners.name as partner_name, 
           partners.rating as partner_rating, 
           partners.delivery_time as partner_delivery_time, 
           partners.address as partner_address,
           partners.category as partner_category
    FROM products
    LEFT JOIN partners ON products.partner_id = partners.id
    WHERE products.id = ?
  `),
  upsertProduct: sqlite.prepare(`
    INSERT INTO products (id, name, tamil_name, category, unit, price, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      tamil_name=excluded.tamil_name,
      category=excluded.category,
      unit=excluded.unit,
      price=excluded.price,
      description=excluded.description
  `),
  countProducts: sqlite.prepare('SELECT COUNT(*) as count FROM products'),

  findPartnerById: sqlite.prepare('SELECT * FROM partners WHERE id = ?'),
  findPartnerByPhone: sqlite.prepare('SELECT * FROM partners WHERE phone = ?'),
  allPartners: sqlite.prepare('SELECT * FROM partners ORDER BY created_at DESC'),
  insertPartner: sqlite.prepare(`
    INSERT INTO partners (id, name, phone, email, password_hash, category, store_name, address, status, rating, delivery_time, banner_image, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updatePartner: sqlite.prepare(`
    UPDATE partners
    SET name = ?, phone = ?, email = ?, category = ?, store_name = ?, address = ?, status = ?, rating = ?, delivery_time = ?, banner_image = ?, description = ?
    WHERE id = ?
  `),
  updatePartnerPassword: sqlite.prepare('UPDATE partners SET password_hash = ? WHERE id = ?'),
  deletePartner: sqlite.prepare('DELETE FROM partners WHERE id = ?'),
  countPartners: sqlite.prepare('SELECT COUNT(*) as count FROM partners'),

  productsByPartner: sqlite.prepare(`
    SELECT products.*, 
           partners.store_name, 
           partners.name as partner_name, 
           partners.rating as partner_rating, 
           partners.delivery_time as partner_delivery_time, 
           partners.address as partner_address,
           partners.category as partner_category
    FROM products
    LEFT JOIN partners ON products.partner_id = partners.id
    WHERE products.partner_id = ?
    ORDER BY products.rowid DESC
  `),
  insertPartnerProduct: sqlite.prepare(`
    INSERT INTO products (id, name, tamil_name, category, unit, price, description, partner_id, stock_quantity, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updatePartnerProduct: sqlite.prepare(`
    UPDATE products
    SET name = ?, tamil_name = ?, category = ?, unit = ?, price = ?, description = ?, stock_quantity = ?, is_available = ?
    WHERE id = ? AND partner_id = ?
  `),
  updateProductStock: sqlite.prepare(`
    UPDATE products
    SET stock_quantity = ?, is_available = ?
    WHERE id = ?
  `),
  deletePartnerProduct: sqlite.prepare('DELETE FROM products WHERE id = ? AND partner_id = ?'),
}

// Auto-seed initial demo partners if empty
try {
  const partCount = sqliteQueries.countPartners.get().count
  if (partCount === 0) {
    const bcrypt = require('bcryptjs')
    const defaultHash = bcrypt.hashSync('partner123', 10)
    const initialPartners = [
      { id: 'PRT-ALL001', name: 'Zippo Central Super Partner', phone: '9876543213', email: 'central@zippo.in', category: 'All', storeName: 'Zippo Super Hub', address: 'T. Nagar, Chennai' },
      { id: 'PRT-CAKE01', name: 'Velvet Oven Bakes', phone: '9876543210', email: 'bakery@zippo.in', category: 'cakes', storeName: 'Velvet Oven Artisan Bakery', address: 'Anna Nagar, Chennai' },
      { id: 'PRT-GROC01', name: 'City Grocers Direct', phone: '9876543211', email: 'groceries@zippo.in', category: 'grocery', storeName: 'City Mart Essentials', address: 'Adyar, Chennai' },
      { id: 'PRT-VEG001', name: 'Farm Fresh Cuts & Veg', phone: '9876543212', email: 'veggies@zippo.in', category: 'cut_veggies', storeName: 'Green Farm Depot', address: 'Koyambedu, Chennai' },
    ]
    const nowIso = new Date().toISOString()
    for (const part of initialPartners) {
      sqliteQueries.insertPartner.run(
        part.id,
        part.name,
        part.phone,
        part.email,
        defaultHash,
        part.category,
        part.storeName,
        part.address,
        'active',
        nowIso
      )
    }
    console.log(`[Database] Seeded ${initialPartners.length} default partners into partners table.`)
  }
} catch (e) {
  console.log('[Database] Partner seed note:', e.message)
}

// Auto-seed products into SQLite if empty
try {
  const pCount = sqliteQueries.countProducts.get().count
  if (pCount === 0) {
    const defaultProducts = require('../data/products')
    for (const p of defaultProducts) {
      sqliteQueries.upsertProduct.run(
        p.id,
        p.name,
        p.tamilName || '',
        p.category || 'general',
        p.unit,
        p.price,
        p.description || ''
      )
    }
    console.log(`[Database] Seeded ${defaultProducts.length} products into SQLite products table.`)
  }
} catch (e) {
  console.log('[Database] Products seed note:', e.message)
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

function resolvePartnerForItems(itemsText) {
  const text = String(itemsText || '').toLowerCase()
  if (text.includes('cake') || text.includes('pastry') || text.includes('brownie') || text.includes('truffle') || text.includes('forest') || text.includes('velvet') || text.includes('croissant') || text.includes('muffin')) {
    return { storeName: 'Nila Bakery', partnerId: 'PRT-4400FA', phone: '9750740587', partnerName: 'Velan', category: 'cakes' }
  }
  if (text.includes('grocery') || text.includes('rice') || text.includes('oil') || text.includes('dal') || text.includes('atta') || text.includes('sugar') || text.includes('salt') || text.includes('ghee')) {
    return { storeName: 'City Mart Essentials', partnerId: 'PRT-GROC01', phone: '9876543211', partnerName: 'City Grocers Direct', category: 'grocery' }
  }
  if (text.includes('mix') || text.includes('sambar') || text.includes('poriyal') || text.includes('veggie') || text.includes('vegetable') || text.includes('salad')) {
    return { storeName: 'Green Farm Depot', partnerId: 'PRT-VEG001', phone: '9876543212', partnerName: 'Farm Fresh Cuts & Veg', category: 'cut_veggies' }
  }
  if (text.includes('water') || text.includes('bisleri') || text.includes('20l')) {
    return { storeName: 'Bisleri Pure Springs', partnerId: 'PRT-ALL001', phone: '9876543213', partnerName: 'Zippo Water Hub', category: 'water' }
  }
  if (text.includes('flower') || text.includes('pooja') || text.includes('jasmine')) {
    return { storeName: 'Madurai Jasmine Depot', partnerId: 'PRT-ALL001', phone: '9876543213', partnerName: 'Pooja Depot', category: 'flowers' }
  }
  if (text.includes('bulb') || text.includes('switch') || text.includes('wire') || text.includes('plug') || text.includes('led')) {
    return { storeName: 'City Hardware Hub', partnerId: 'PRT-ALL001', phone: '9876543213', partnerName: 'Hardware Partner', category: 'electricals' }
  }
  return { storeName: 'Nila Bakery', partnerId: 'PRT-4400FA', phone: '9750740587', partnerName: 'Velan', category: 'All' }
}

function attachPartnerInfoToOrder(order) {
  if (!order) return null
  const partnerInfo = resolvePartnerForItems(order.items)
  return {
    ...order,
    partnerId: order.partnerId || order.partner_id || partnerInfo.partnerId,
    partnerStoreName: order.partnerStoreName || order.partner_store_name || partnerInfo.storeName,
    partnerPhone: order.partnerPhone || partnerInfo.phone,
    partnerName: order.partnerName || partnerInfo.partnerName,
    partnerCategory: order.partnerCategory || partnerInfo.category,
    followUpNotes: order.followUpNotes || order.follow_up_notes || '',
    riderName: order.riderName || order.rider_name || '',
    riderPhone: order.riderPhone || order.rider_phone || '',
  }
}

function formatSqliteOrder(row) {
  if (!row) return null
  return attachPartnerInfoToOrder({
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
    partner_id: row.partner_id,
    partner_store_name: row.partner_store_name,
    follow_up_notes: row.follow_up_notes,
    rider_name: row.rider_name,
    rider_phone: row.rider_phone,
  })
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

function formatSqliteProduct(row) {
  if (!row) return null
  const stock = Number(row.stock_quantity !== undefined && row.stock_quantity !== null ? row.stock_quantity : 50)
  const isAvail = row.is_available === 0 ? false : stock > 0

  let defaultStore = 'Zippo Super Hub'
  let defaultRating = 4.8
  let defaultTime = '20-30 mins'
  let defaultAddress = 'Chennai Central'
  if (row.category === 'cakes' || (row.id && row.id.includes('cake')) || (row.id && row.id.includes('brownie')) || (row.name && row.name.toLowerCase().includes('brownie'))) {
    defaultStore = 'Nila Bakery'
    defaultRating = 4.9
    defaultTime = '20-25 mins'
    defaultAddress = 'Anna Nagar, Chennai'
  } else if (row.category === 'grocery') {
    defaultStore = 'City Mart Essentials'
    defaultRating = 4.7
    defaultTime = '25-35 mins'
    defaultAddress = 'T. Nagar, Chennai'
  } else if (row.category === 'cut_veggies') {
    defaultStore = 'Farm Fresh Cuts & Veg'
    defaultRating = 4.8
    defaultTime = '15-25 mins'
    defaultAddress = 'Koyambedu, Chennai'
  } else if (row.category === 'water') {
    defaultStore = 'Bisleri Pure Springs'
    defaultRating = 4.9
    defaultTime = '20-30 mins'
    defaultAddress = 'Vadapalani, Chennai'
  } else if (row.category === 'flowers') {
    defaultStore = 'Madurai Jasmine Depot'
    defaultRating = 4.8
    defaultTime = '20-25 mins'
    defaultAddress = 'Mylapore, Chennai'
  } else if (row.category === 'electricals') {
    defaultStore = 'City Hardware Hub'
    defaultRating = 4.6
    defaultTime = '30-40 mins'
    defaultAddress = 'Triplicane, Chennai'
  }

  const storeName = row.store_name || defaultStore
  const storeRating = row.partner_rating ? Number(row.partner_rating) : defaultRating
  const storeDeliveryTime = row.partner_delivery_time || defaultTime
  const storeAddress = row.partner_address || defaultAddress

  return {
    id: row.id,
    name: row.name,
    tamilName: row.tamil_name || '',
    category: row.category || 'general',
    unit: row.unit,
    price: Number(row.price || 0),
    description: row.description || '',
    partnerId: row.partner_id || '',
    storeName,
    storeRating,
    storeDeliveryTime,
    storeAddress,
    stockQuantity: stock,
    isAvailable: isAvail,
  }
}

async function getAllProducts() {
  try {
    const rows = sqliteQueries.allProducts.all()
    return rows.map(formatSqliteProduct)
  } catch (err) {
    const defaultProducts = require('../data/products')
    return defaultProducts
  }
}

async function getProductById(id) {
  try {
    const row = sqliteQueries.productById.get(id)
    return formatSqliteProduct(row)
  } catch (err) {
    const defaultProducts = require('../data/products')
    return defaultProducts.find((p) => p.id === id) || null
  }
}

async function getProductsByPartner(partnerId) {
  try {
    const rows = sqliteQueries.productsByPartner.all(partnerId)
    return rows.map(formatSqliteProduct)
  } catch (err) {
    return []
  }
}

async function createPartnerProduct(partnerId, { name, tamilName = '', category = 'general', unit = '1 pc', price, stockQuantity = 50, description = '' }) {
  const crypto = require('crypto')
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)
  const id = `${slug}-${crypto.randomBytes(2).toString('hex')}`
  const initialStock = Number(stockQuantity) >= 0 ? Number(stockQuantity) : 50
  const isAvail = initialStock > 0 ? 1 : 0

  sqliteQueries.insertPartnerProduct.run(
    id,
    name.trim(),
    (tamilName || '').trim(),
    category.trim(),
    unit.trim(),
    Number(price) || 0,
    (description || '').trim(),
    partnerId,
    initialStock,
    isAvail
  )

  return getProductById(id)
}

async function updatePartnerProduct(partnerId, productId, updates = {}) {
  const current = await getProductById(productId)
  if (!current) throw new Error('Product not found.')

  const name = updates.name !== undefined ? updates.name : current.name
  const tamilName = updates.tamilName !== undefined ? updates.tamilName : current.tamilName
  const category = updates.category !== undefined ? updates.category : current.category
  const unit = updates.unit !== undefined ? updates.unit : current.unit
  const price = updates.price !== undefined ? Number(updates.price) : current.price
  const description = updates.description !== undefined ? updates.description : current.description
  const stockQuantity = updates.stockQuantity !== undefined ? Number(updates.stockQuantity) : current.stockQuantity
  const isAvailable = updates.isAvailable !== undefined ? (updates.isAvailable ? 1 : 0) : (stockQuantity > 0 ? 1 : 0)

  sqliteQueries.updatePartnerProduct.run(
    name,
    tamilName,
    category,
    unit,
    price,
    description,
    stockQuantity,
    isAvailable,
    productId,
    partnerId
  )

  return getProductById(productId)
}

async function deletePartnerProduct(partnerId, productId) {
  sqliteQueries.deletePartnerProduct.run(productId, partnerId)
  return { ok: true }
}

async function reduceProductStock(productId, quantityToDeduct) {
  const current = await getProductById(productId)
  if (!current) return null
  const deduction = Math.max(0, Number(quantityToDeduct) || 1)
  const newStock = Math.max(0, Number(current.stockQuantity) - deduction)
  const isAvail = newStock > 0 ? 1 : 0

  sqliteQueries.updateProductStock.run(newStock, isAvail, productId)
  console.log(`[Stock Reduced] Product "${current.name}" (${productId}): ${current.stockQuantity} -> ${newStock} (deducted: ${deduction})`)
  return getProductById(productId)
}

async function reduceOrderItemsStock(itemsText = '', cartItems = []) {
  const reducedProducts = []

  // 1. If structured cartItems provided: [{ productId, quantity }]
  if (Array.isArray(cartItems) && cartItems.length > 0) {
    for (const item of cartItems) {
      if (item.productId) {
        const updated = await reduceProductStock(item.productId, item.quantity || 1)
        if (updated) reducedProducts.push(updated)
      }
    }
    return reducedProducts
  }

  // 2. Parse text items e.g. "2x Sambar Vegetable Mix, 1x Ponni Boiled Rice"
  const allProds = await getAllProducts()
  const segments = String(itemsText).split(',').map((s) => s.trim()).filter(Boolean)

  for (const segment of segments) {
    const match = segment.match(/^(\d+(?:\.\d+)?)\s*x\s*(.+)$/i)
    const qty = match ? parseFloat(match[1]) : 1
    const itemName = match ? match[2].trim().toLowerCase() : segment.toLowerCase()

    const matchedProd = allProds.find(
      (p) => p.name.toLowerCase().trim() === itemName || p.id.toLowerCase().trim() === itemName || itemName.includes(p.name.toLowerCase())
    )

    if (matchedProd) {
      const updated = await reduceProductStock(matchedProd.id, qty)
      if (updated) reducedProducts.push(updated)
    }
  }

  return reducedProducts
}

async function upsertProduct(product) {
  sqliteQueries.upsertProduct.run(
    product.id,
    product.name,
    product.tamilName || '',
    product.category || 'general',
    product.unit,
    product.price,
    product.description || ''
  )
  return getProductById(product.id)
}

// ==========================================
// 2. MONGODB CONNECTION
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zippo'
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
    console.log(`[Database] Active SQLite database running at: backend/data/zippo.db`)
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

async function updateUser(id, updates = {}) {
  const current = await getUserById(id)
  if (!current) throw new Error('User not found.')

  const name = updates.name !== undefined ? String(updates.name).trim() : current.name
  const email = updates.email !== undefined ? String(updates.email).trim() : current.email
  const passwordHash = updates.passwordHash !== undefined ? updates.passwordHash : current.passwordHash

  try {
    sqliteQueries.updateUser.run(name, email, passwordHash, id)
  } catch (e) {
    console.error('[db] Error updating user in SQLite:', e)
  }

  if (isUsingMongo()) {
    try {
      await User.updateOne({ id }, { $set: { name, email, passwordHash } })
    } catch (e) {
      console.error('[db] Error updating user in MongoDB:', e)
    }
  }

  return getUserById(id)
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
    const docs = await Order.find().sort({ receivedAt: -1 }).lean()
    return docs.map(attachPartnerInfoToOrder)
  }
  return sqliteQueries.allOrders.all().map(formatSqliteOrder)
}

async function getOrderById(id) {
  const normalizedId = String(id).trim().toUpperCase()
  if (isUsingMongo()) {
    const doc = await Order.findOne({ id: normalizedId }).lean()
    return attachPartnerInfoToOrder(doc)
  }
  return formatSqliteOrder(sqliteQueries.findOrderById.get(normalizedId))
}

async function getOrdersByUserId(userId) {
  if (isUsingMongo()) {
    const docs = await Order.find({ userId }).sort({ receivedAt: -1 }).lean()
    return docs.map(attachPartnerInfoToOrder)
  }
  return sqliteQueries.findOrdersByUserId.all(userId).map(formatSqliteOrder)
}

async function getOrderByTrack(orderId, phone) {
  const normId = String(orderId).trim().toUpperCase()
  const cleanPhone = String(phone).trim()
  if (isUsingMongo()) {
    const doc = await Order.findOne({ id: normId, phone: cleanPhone }).lean()
    return attachPartnerInfoToOrder(doc)
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

async function updateOrderFollowUp(id, { status, followUpNotes, riderName, riderPhone, partnerStoreName } = {}) {
  const normalizedId = String(id).trim().toUpperCase()
  const existing = await getOrderById(normalizedId)
  if (!existing) return null

  const newStatus = status || existing.status
  const newNotes = followUpNotes !== undefined ? String(followUpNotes || '').trim() : (existing.followUpNotes || '')
  const newRiderName = riderName !== undefined ? String(riderName || '').trim() : (existing.riderName || '')
  const newRiderPhone = riderPhone !== undefined ? String(riderPhone || '').trim() : (existing.riderPhone || '')
  const newStoreName = partnerStoreName || existing.partnerStoreName || 'Nila Bakery'

  try {
    sqliteQueries.updateOrderFollowUp.run(newStatus, newNotes, newRiderName, newRiderPhone, newStoreName, normalizedId)
  } catch (e) {}

  if (isUsingMongo()) {
    await Order.updateOne(
      { id: normalizedId },
      {
        $set: {
          status: newStatus,
          followUpNotes: newNotes,
          riderName: newRiderName,
          riderPhone: newRiderPhone,
          partnerStoreName: newStoreName,
        },
      }
    )
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

async function requestOrderRefund(id, { reason, amount, upi } = {}) {
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

async function approveOrderRefund(id, { refundId } = {}) {
  const normId = String(id).trim().toUpperCase()
  const refundProcessedAt = new Date().toISOString()
  const cleanRefundId = String(refundId || 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase()).trim()

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

function formatSqlitePartner(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    passwordHash: row.password_hash,
    category: row.category || 'All',
    storeName: row.store_name || row.name,
    address: row.address || 'Chennai',
    status: row.status || 'active',
    rating: row.rating ? Number(row.rating) : 4.8,
    deliveryTime: row.delivery_time || '20-30 mins',
    bannerImage: row.banner_image || '',
    description: row.description || '',
    createdAt: row.created_at,
  }
}

async function createPartner({
  name,
  phone,
  password,
  category = 'All',
  storeName = '',
  address = '',
  email = '',
  rating = 4.8,
  deliveryTime = '20-30 mins',
  description = '',
}) {
  const existing = sqliteQueries.findPartnerByPhone.get(phone)
  if (existing) {
    throw new Error('A partner with this phone number already exists.')
  }
  const crypto = require('crypto')
  const { hashPassword } = require('./auth')
  const id = 'PRT-' + crypto.randomBytes(3).toString('hex').toUpperCase()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()
  const finalStoreName = (storeName || name).trim()

  sqliteQueries.insertPartner.run(
    id,
    name.trim(),
    phone.trim(),
    (email || '').trim().toLowerCase(),
    passwordHash,
    category.trim(),
    finalStoreName,
    (address || 'Chennai').trim(),
    'active',
    Number(rating) || 4.8,
    (deliveryTime || '20-30 mins').trim(),
    '',
    (description || '').trim(),
    now
  )

  return formatSqlitePartner(sqliteQueries.findPartnerById.get(id))
}

async function getAllPartners() {
  const rows = sqliteQueries.allPartners.all()
  return rows.map(formatSqlitePartner)
}

async function getPartnerById(id) {
  const row = sqliteQueries.findPartnerById.get(id)
  return formatSqlitePartner(row)
}

async function getPartnerByPhone(phone) {
  const row = sqliteQueries.findPartnerByPhone.get(phone)
  return formatSqlitePartner(row)
}

async function updatePartner(id, updates = {}) {
  const current = sqliteQueries.findPartnerById.get(id)
  if (!current) throw new Error('Partner not found.')

  const name = updates.name !== undefined ? updates.name : current.name
  const phone = updates.phone !== undefined ? updates.phone : current.phone
  const email = updates.email !== undefined ? updates.email : current.email
  const category = updates.category !== undefined ? updates.category : current.category
  const storeName = updates.storeName !== undefined ? updates.storeName : current.store_name
  const address = updates.address !== undefined ? updates.address : current.address
  const status = updates.status !== undefined ? updates.status : current.status
  const rating = updates.rating !== undefined ? Number(updates.rating) : (current.rating || 4.8)
  const deliveryTime = updates.deliveryTime !== undefined ? updates.deliveryTime : (current.delivery_time || '20-30 mins')
  const bannerImage = updates.bannerImage !== undefined ? updates.bannerImage : (current.banner_image || '')
  const description = updates.description !== undefined ? updates.description : (current.description || '')

  sqliteQueries.updatePartner.run(
    name,
    phone,
    email,
    category,
    storeName,
    address,
    status,
    rating,
    deliveryTime,
    bannerImage,
    description,
    id
  )

  if (updates.password) {
    const { hashPassword } = require('./auth')
    const passwordHash = await hashPassword(updates.password)
    sqliteQueries.updatePartnerPassword.run(passwordHash, id)
  }

  return formatSqlitePartner(sqliteQueries.findPartnerById.get(id))
}

async function getAllStores() {
  const partners = await getAllPartners()
  const activePartners = partners.filter((p) => p.status === 'active')
  const allProds = await getAllProducts()

  return activePartners.map((p) => {
    const prods = allProds.filter(
      (prod) => prod.partnerId === p.id || (!prod.partnerId && prod.category === p.category)
    )
    return {
      id: p.id,
      storeName: p.storeName || p.name,
      ownerName: p.name,
      phone: p.phone,
      category: p.category,
      address: p.address || 'Chennai',
      rating: p.rating || 4.8,
      deliveryTime: p.deliveryTime || '20-30 mins',
      description: p.description || (p.category === 'cakes' ? 'Freshly baked artisan brownies, custom celebration cakes & pastries' : `${p.storeName} quick delivery essentials`),
      bannerImage: p.bannerImage || '',
      itemCount: prods.length,
      sampleItems: prods.slice(0, 4).map((pr) => pr.name),
    }
  })
}

async function getStoreById(storeId) {
  const partner = await getPartnerById(storeId)
  if (!partner) return null
  const allProds = await getAllProducts()
  const prods = allProds.filter(
    (prod) => prod.partnerId === partner.id || (!prod.partnerId && prod.category === partner.category)
  )

  return {
    id: partner.id,
    storeName: partner.storeName || partner.name,
    ownerName: partner.name,
    phone: partner.phone,
    category: partner.category,
    address: partner.address || 'Chennai',
    rating: partner.rating || 4.8,
    deliveryTime: partner.deliveryTime || '20-30 mins',
    description: partner.description || (partner.category === 'cakes' ? 'Freshly baked artisan brownies, custom celebration cakes & pastries' : `${partner.storeName} quick delivery essentials`),
    bannerImage: partner.bannerImage || '',
    products: prods,
  }
}

async function deletePartner(id) {
  sqliteQueries.deletePartner.run(id)
  return { ok: true }
}

async function getOrdersForPartner(partnerCategory) {
  const orders = await getAllOrders()
  const normalizedCategory = String(partnerCategory || 'All').trim()

  if (normalizedCategory === 'All' || normalizedCategory === 'all') {
    return orders.map((o) => ({ ...o, isPartnerCategory: true }))
  }

  const products = await getAllProducts()
  // Map product names and IDs to their category
  const productCategoryMap = new Map()
  for (const p of products) {
    const cat = p.category || 'general'
    productCategoryMap.set(p.name.toLowerCase().trim(), cat)
    productCategoryMap.set(p.id.toLowerCase().trim(), cat)
  }

  const filtered = []
  for (const order of orders) {
    const itemsText = String(order.items || '').toLowerCase()
    let hasMatchingCategory = false
    const matchingItemsList = []

    // Parse comma-separated items e.g. "2x Dutch Chocolate Truffle, 1x Bisleri 20L"
    const itemSegments = itemsText.split(',').map((s) => s.trim()).filter(Boolean)
    for (const segment of itemSegments) {
      for (const [prodKey, cat] of productCategoryMap.entries()) {
        if (segment.includes(prodKey)) {
          if (cat === normalizedCategory) {
            hasMatchingCategory = true
            matchingItemsList.push(segment)
          }
          break
        }
      }
    }

    // Fallback keyword check if direct match didn't catch
    if (!hasMatchingCategory) {
      if (normalizedCategory === 'cakes' && (itemsText.includes('cake') || itemsText.includes('pastry') || itemsText.includes('brownie') || itemsText.includes('muffin') || itemsText.includes('forest') || itemsText.includes('truffle') || itemsText.includes('velvet') || itemsText.includes('croissant'))) {
        hasMatchingCategory = true
      } else if (normalizedCategory === 'water' && (itemsText.includes('water') || itemsText.includes('bisleri') || itemsText.includes('20l') || itemsText.includes('can'))) {
        hasMatchingCategory = true
      } else if (normalizedCategory === 'cut_veggies' && (itemsText.includes('mix') || itemsText.includes('sambar') || itemsText.includes('poriyal') || itemsText.includes('veggie') || itemsText.includes('vegetable') || itemsText.includes('salad'))) {
        hasMatchingCategory = true
      } else if (normalizedCategory === 'grocery' && (itemsText.includes('grocery') || itemsText.includes('rice') || itemsText.includes('oil') || itemsText.includes('dal') || itemsText.includes('sugar') || itemsText.includes('salt') || itemsText.includes('atta') || itemsText.includes('ghee') || itemsText.includes('tea') || itemsText.includes('coffee') || itemsText.includes('soap'))) {
        hasMatchingCategory = true
      } else if (normalizedCategory === 'flowers' && (itemsText.includes('flower') || itemsText.includes('pooja') || itemsText.includes('jasmine') || itemsText.includes('mullai') || itemsText.includes('garland') || itemsText.includes('rose') || itemsText.includes('marigold'))) {
        hasMatchingCategory = true
      } else if (normalizedCategory === 'electricals' && (itemsText.includes('bulb') || itemsText.includes('switch') || itemsText.includes('plug') || itemsText.includes('tape') || itemsText.includes('socket') || itemsText.includes('led') || itemsText.includes('wire') || itemsText.includes('fuse'))) {
        hasMatchingCategory = true
      }
    }

    if (hasMatchingCategory) {
      filtered.push({
        ...order,
        isPartnerCategory: true,
        matchingItems: matchingItemsList.length > 0 ? matchingItemsList : undefined,
      })
    }
  }

  return filtered
}

module.exports = {
  db: sqlite,
  mongoose,
  isUsingMongo,
  getUserById,
  getUserByPhone,
  createUser,
  updateUser,
  getAllUsers,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrderByTrack,
  createOrder,
  updateOrderStatus,
  updateOrderFollowUp,
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
  getAllProducts,
  getProductById,
  upsertProduct,
  createPartner,
  getAllPartners,
  getPartnerById,
  getPartnerByPhone,
  updatePartner,
  deletePartner,
  getOrdersForPartner,
  createPartnerProduct,
  getProductsByPartner,
  updatePartnerProduct,
  deletePartnerProduct,
  reduceProductStock,
  reduceOrderItemsStock,
  getAllStores,
  getStoreById,
}
