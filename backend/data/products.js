// Same catalogue as the frontend's src/data/products.ts.
// In a real deployment, keep this in a database and have both
// sides read from the same source of truth.
const products = [
  { id: 'onion-tomato-mix', name: 'Onion & Tomato Chop Mix', unit: '500 g pack', price: 45 },
  { id: 'sambar-mix', name: 'Sambar Vegetable Mix', unit: '750 g pack', price: 79 },
  { id: 'salad-mix', name: 'Everyday Salad Mix', unit: '400 g pack', price: 55 },
  { id: 'greens-mix', name: 'Cleaned Greens Bundle', unit: '300 g pack', price: 39 },
  { id: 'poriyal-mix', name: 'Poriyal Vegetable Mix', unit: '600 g pack', price: 65 },
  { id: 'bulk-hotel-mix', name: 'Bulk Kitchen Pack', unit: '5 kg pack', price: 420 },
]

module.exports = products
