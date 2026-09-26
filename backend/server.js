const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const http = require('http')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const { initSocket } = require('./lib/socket')
const { apiLimiter } = require('./middleware/rateLimiters')
require('./lib/db')


const productsRouter = require('./routes/products')
const ordersRouter = require('./routes/orders')
const adminRouter = require('./routes/admin')
const visitsRouter = require('./routes/visits')
const authRouter = require('./routes/auth')
const supportRouter = require('./routes/support')

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 4000

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible integration with dev tools / proxies
    crossOriginEmbedderPolicy: false,
  })
)

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true)
      } else {
        callback(null, true) // Allow during local development
      }
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '100kb' })) // Body limit to prevent large payload attacks

// Rate Limiter for general endpoints
app.use('/api', apiLimiter)

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'easy-foods-backend', timestamp: new Date().toISOString() })
})

// Route Mounting
app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/visits', visitsRouter)
app.use('/api/auth', authRouter)
app.use('/api/support', supportRouter)

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' })
})

// Production Static Assets & SPA Routing
const adminDist = path.join(__dirname, '..', 'admin', 'dist')
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist))
  app.get(['/admin', '/admin/*'], (req, res) => {
    res.sendFile(path.join(adminDist, 'index.html'))
  })
}

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// Initialize Socket.IO
initSocket(server, allowedOrigins)

server.listen(PORT, () => {
  console.log(`[Server] Easy Foods backend running on http://localhost:${PORT}`)
  console.log(`[Server] Real-time WebSockets (Socket.IO) enabled`)

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'changeme') {
    console.log('[Security Note] ADMIN_PASSWORD is set to default "changeme". Please update backend/.env for production.')
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('replace-with')) {
    console.log('[Security Note] JWT_SECRET not configured. Please set a strong random secret in backend/.env.')
  }
})

