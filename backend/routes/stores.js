const express = require('express')
const { getAllStores, getStoreById, getProductsByPartner } = require('../lib/db')

const router = express.Router()

// GET /api/stores — list all active stores, bakeries, and merchant outlets
router.get('/', async (req, res) => {
  try {
    const stores = await getAllStores()
    res.json({ ok: true, stores })
  } catch (err) {
    console.error('[stores] Failed to fetch stores:', err)
    res.status(500).json({ error: 'Could not fetch stores list.' })
  }
})

// GET /api/stores/:id — get single store profile and its products catalogue
router.get('/:id', async (req, res) => {
  try {
    const store = await getStoreById(req.params.id)
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' })
    }
    res.json({ ok: true, store })
  } catch (err) {
    console.error('[stores] Failed to fetch store details:', err)
    res.status(500).json({ error: 'Could not fetch store details.' })
  }
})

module.exports = router
