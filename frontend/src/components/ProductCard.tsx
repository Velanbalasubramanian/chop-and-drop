import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }: { product: Product }) {
  const { items, products, addItem, updateQuantity, notifyStockLimit } = useCart()

  // Always use the latest live product state from CartContext for real-time stock sync
  const liveProduct = products.find((p) => p.id === product.id) || product
  const stock = liveProduct.stockQuantity

  const inCart = items.find((i) => i.productId === liveProduct.id)
  const isOutOfStock = stock !== undefined && (stock <= 0 || liveProduct.isAvailable === false)
  const isLowStock = stock !== undefined && stock > 0 && stock <= 5
  const isMaxReached = stock !== undefined && inCart !== undefined && inCart.quantity >= stock

  const [justAdded, setJustAdded] = useState(false)

  function handleFirstAdd() {
    if (isOutOfStock) return
    addItem(liveProduct.id, 1)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 900)
  }

  return (
    <article className="product-card">
      <div className="product-card-top">
        <span className="veg-mark" aria-label="Vegetarian" title="Vegetarian" />
        <span className="product-unit">{liveProduct.unit}</span>
      </div>
      {stock !== undefined && (
        <div style={{ margin: '4px 0', fontSize: '0.75rem', fontWeight: 600 }}>
          {isOutOfStock ? (
            <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span style={{ color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
              Only {stock} left
            </span>
          ) : (
            <span style={{ color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
              {stock} in stock
            </span>
          )}
        </div>
      )}
      <span className="product-tamil">{liveProduct.tamilName}</span>
      <h3>{liveProduct.name}</h3>
      {liveProduct.storeName && (
        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, margin: '2px 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🏪</span>
          {liveProduct.partnerId ? (
            <Link to={`/store/${liveProduct.partnerId}`} style={{ color: '#059669', textDecoration: 'none' }} title="Visit store">
              {liveProduct.storeName}
            </Link>
          ) : (
            <span>{liveProduct.storeName}</span>
          )}
          {liveProduct.storeRating ? (
            <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '1px 5px', borderRadius: '4px' }}>
              ★ {liveProduct.storeRating}
            </span>
          ) : null}
        </div>
      )}
      <p>{liveProduct.description}</p>
      <div className="product-card-bottom">
        <div className="product-price">₹{liveProduct.price}</div>

        {isOutOfStock ? (
          <button
            type="button"
            className="add-button"
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed', background: '#e2e8f0', color: '#64748b' }}
          >
            Sold Out
          </button>
        ) : inCart ? (
          <div className="qty-stepper qty-stepper-add">
            <button
              type="button"
              onClick={() => updateQuantity(liveProduct.id, inCart.quantity - 1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span>{inCart.quantity}</span>
            <button
              type="button"
              onClick={() => {
                if (isMaxReached) {
                  notifyStockLimit(liveProduct.name, stock ?? 0)
                  return
                }
                updateQuantity(liveProduct.id, inCart.quantity + 1)
              }}
              disabled={isMaxReached}
              aria-label="Increase quantity"
              style={isMaxReached ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`add-button ${justAdded ? 'added' : ''}`}
            onClick={handleFirstAdd}
          >
            {justAdded ? '✓ Added' : 'ADD'}
          </button>
        )}
      </div>

      {isMaxReached && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '6px 10px',
          margin: '8px 0 4px',
          color: '#dc2626',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span>⚠️</span>
          <span>Not Available: Only {stock} item(s) available in stock for "{liveProduct.name}".</span>
        </div>
      )}
    </article>
  )
}
