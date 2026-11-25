const express = require('express')
const { getAllProducts, getProductById } = require('../lib/db')

const router = express.Router()

// GET /api/products — live product catalogue from database
router.get('/', async (req, res) => {
  try {
    const products = await getAllProducts()
    res.json(products)
  } catch (err) {
    console.error('[products] Failed to fetch products:', err)
    res.status(500).json({ error: 'Could not fetch products catalogue.' })
  }
})

// GET /api/products/:id — fetch single product details
router.get('/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' })
    }
    res.json(product)
  } catch (err) {
    console.error('[products] Failed to fetch product:', err)
    res.status(500).json({ error: 'Could not fetch product details.' })
  }
})

module.exports = router
