const express = require('express')
const products = require('../data/products')

const router = express.Router()

router.get('/', (req, res) => {
  res.json(products)
})

module.exports = router
