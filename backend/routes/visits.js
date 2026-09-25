const express = require('express')
const adminAuth = require('../middleware/adminAuth')
const { recordVisit, getVisitsSummary } = require('../lib/db')
const { emitNewVisit } = require('../lib/socket')

const router = express.Router()

// POST /api/visits — record lightweight visit
router.post('/', async (req, res) => {
  const { path: pagePath } = req.body || {}
  const visit = await recordVisit(pagePath)

  // Real-time broadcast to admin dashboard
  emitNewVisit(visit)

  res.status(204).end()
})

// GET /api/visits/summary — visits analytics for admin dashboard
router.get('/summary', adminAuth, async (req, res) => {
  const summary = await getVisitsSummary()
  res.json(summary)
})

module.exports = router
