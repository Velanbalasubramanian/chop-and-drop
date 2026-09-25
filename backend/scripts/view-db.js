const {
  isUsingMongo,
  getAllUsers,
  getAllOrders,
  getAllSupportTickets,
  getVisitsSummary,
  mongoose,
} = require('../lib/db')

const target = process.argv[2] ? process.argv[2].toLowerCase() : 'all'

async function run() {
  // Give MongoDB connection a moment to establish
  await new Promise((r) => setTimeout(r, 600))

  const usingMongo = isUsingMongo()
  const activeEngine = usingMongo ? 'MongoDB (Mongoose)' : 'SQLite (Local Engine & Fallback)'
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chop_and_drop'

  console.log('\n======================================================')
  console.log('   CHOP & DROP — DATABASE VIEWER')
  console.log(`   Active Engine: ${activeEngine}`)
  if (usingMongo) {
    console.log(`   MongoDB URI:   ${mongoUri}`)
  } else {
    console.log('   SQLite File:   backend/data/chop_and_drop.db')
  }
  console.log('======================================================\n')

  if (target === 'all' || target === 'users') {
    const users = await getAllUsers()
    console.log(`\n👥 USERS COLLECTION / TABLE (${users.length} records)`)
    console.log('------------------------------------------------------')
    if (users.length === 0) {
      console.log('No users registered yet.')
    } else {
      console.table(
        users.map((u) => ({
          ID: u.id,
          Name: u.name,
          Phone: u.phone,
          Email: u.email || '—',
          Role: u.role,
          'Created At': new Date(u.createdAt).toLocaleString(),
        }))
      )
    }
  }

  if (target === 'all' || target === 'orders') {
    const orders = await getAllOrders()
    console.log(`\n📦 ORDERS COLLECTION / TABLE (${orders.length} records)`)
    console.log('------------------------------------------------------')
    if (orders.length === 0) {
      console.log('No orders placed yet.')
    } else {
      console.table(
        orders.map((o) => ({
          'Order ID': o.id,
          Customer: o.name,
          Phone: o.phone,
          Amount: `₹${o.amount || 0}`,
          Payment: o.paymentMethod === 'online' ? 'Online (Paid)' : 'COD (Pending)',
          Status: o.status,
          Slot: o.deliverySlot,
          'Date & Time': new Date(o.receivedAt).toLocaleString(),
        }))
      )
    }
  }

  if (target === 'all' || target === 'tickets') {
    const tickets = await getAllSupportTickets()
    console.log(`\n🎫 SUPPORT TICKETS COLLECTION / TABLE (${tickets.length} records)`)
    console.log('------------------------------------------------------')
    if (tickets.length === 0) {
      console.log('No support tickets raised yet.')
    } else {
      console.table(
        tickets.map((t) => ({
          'Ticket ID': t.id,
          Customer: t.name,
          Phone: t.phone,
          'Order ID': t.orderId || '—',
          Category: t.issueType,
          Status: t.status,
          Message: t.message.length > 30 ? t.message.slice(0, 30) + '…' : t.message,
        }))
      )
    }
  }

  if (target === 'all' || target === 'visits') {
    const visits = await getVisitsSummary()
    console.log(`\n👁️ SITE VISITS COLLECTION / TABLE (Total: ${visits.total} | Today: ${visits.today})`)
    console.log('------------------------------------------------------')
    if (visits.recent.length === 0) {
      console.log('No site visits logged yet.')
    } else {
      console.table(
        visits.recent.slice(0, 10).map((v) => ({
          'Page Path': v.path,
          'Visited At': new Date(v.visitedAt).toLocaleString(),
        }))
      )
    }
  }

  console.log('\n======================================================')
  console.log('💡 HOW TO VIEW MONGODB:')
  console.log('• CLI Command: npm run db:view')
  console.log('• MongoDB Compass GUI: Connect to mongodb://127.0.0.1:27017 or your Atlas URI')
  console.log('• Set MongoDB Atlas URI in backend/.env as MONGODB_URI=mongodb+srv://...')
  console.log('======================================================\n')

  try {
    await mongoose.disconnect()
  } catch (e) {}
  process.exit(0)
}

run().catch((err) => {
  console.error('Error viewing database:', err)
  process.exit(1)
})
