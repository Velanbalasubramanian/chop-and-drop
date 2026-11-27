import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, products, updateQuantity, removeItem, totalPrice, totalCount, stockAlert, clearStockAlert } = useCart()
  const navigate = useNavigate()

  const lines = items
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((l) => l.product)

  if (lines.length === 0) {
    return (
      <section className="section page-section">
        <p className="page-eyebrow">Your cart</p>
        <h1>Your cart is empty</h1>
        <p className="page-intro">
          Browse our <Link to="/products">packs</Link> and add what your kitchen needs.
        </p>
      </section>
    )
  }

  function handleProceedToOrder() {
    for (const item of items) {
      const p = products.find((prod) => prod.id === item.productId)
      if (p && p.stockQuantity !== undefined) {
        if (p.stockQuantity <= 0 || p.isAvailable === false) {
          window.alert(`"${p.name}" is currently out of stock. Please remove it from your cart to proceed.`)
          return
        }
        if (item.quantity > p.stockQuantity) {
          window.alert(`"${p.name}" exceeds available stock (Only ${p.stockQuantity} available). Please adjust quantity.`)
          return
        }
      }
    }
    navigate('/order')
  }

  return (
    <section className="section page-section cart-section">
      <p className="page-eyebrow">Your cart</p>
      <h1>{totalCount} item{totalCount === 1 ? '' : 's'} in your cart</h1>

      {stockAlert && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700, fontSize: '0.9rem' }}>
          <span>⚠️ {stockAlert}</span>
          <button type="button" onClick={clearStockAlert} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#dc2626' }}>✕</button>
        </div>
      )}

      <div className="cart-list">
        {lines.map(({ item, product }) => {
          const isMaxReached = product!.stockQuantity !== undefined && item.quantity >= product!.stockQuantity
          return (
            <div className="cart-line" key={item.productId}>
              <div className="cart-line-info">
                <h3>{product!.name}</h3>
                <p className="admin-subtext">{product!.unit} · ₹{product!.price} each</p>
                {product!.stockQuantity !== undefined && (
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: isMaxReached ? '#dc2626' : '#16a34a', margin: '3px 0 0' }}>
                    {isMaxReached
                      ? `⚠️ Not Available: Only ${product!.stockQuantity} item(s) available in stock for "${product!.name}".`
                      : `● ${product!.stockQuantity} available in stock`}
                  </p>
                )}
              </div>
              <div className="qty-stepper">
                <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} aria-label="Decrease quantity">
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isMaxReached) {
                      window.alert(`Not Available: Only ${product!.stockQuantity} item(s) available in stock for "${product!.name}".`)
                      return
                    }
                    updateQuantity(item.productId, item.quantity + 1)
                  }}
                  aria-label="Increase quantity"
                  style={isMaxReached ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  +
                </button>
              </div>
              <div className="cart-line-price">₹{product!.price * item.quantity}</div>
              <button type="button" className="cart-remove" onClick={() => removeItem(item.productId)}>
                Remove
              </button>
            </div>
          )
        })}
      </div>

      <div className="cart-summary">
        <div>
          <span>Total</span>
          {totalPrice < 199 && (
            <p style={{ fontSize: '0.8rem', color: '#fc8019', margin: '4px 0 0 0' }}>
              Add ₹{199 - totalPrice} more for free delivery
            </p>
          )}
        </div>
        <span className="cart-total-price">₹{totalPrice}</span>
      </div>

      <div className="cart-actions">
        <Link to="/products" className="btn btn-ghost">
          Add more items
        </Link>
        <button type="button" className="btn btn-primary" onClick={handleProceedToOrder}>
          Proceed to order
        </button>
      </div>
    </section>
  )
}
