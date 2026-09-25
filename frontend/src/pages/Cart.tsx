import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { products } from '../data/products'

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice, totalCount } = useCart()
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

  return (
    <section className="section page-section cart-section">
      <p className="page-eyebrow">Your cart</p>
      <h1>{totalCount} item{totalCount === 1 ? '' : 's'} in your cart</h1>

      <div className="cart-list">
        {lines.map(({ item, product }) => (
          <div className="cart-line" key={item.productId}>
            <div className="cart-line-info">
              <h3>{product!.name}</h3>
              <p className="admin-subtext">{product!.unit} · ₹{product!.price} each</p>
            </div>
            <div className="qty-stepper">
              <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} aria-label="Decrease quantity">
                −
              </button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} aria-label="Increase quantity">
                +
              </button>
            </div>
            <div className="cart-line-price">₹{product!.price * item.quantity}</div>
            <button type="button" className="cart-remove" onClick={() => removeItem(item.productId)}>
              Remove
            </button>
          </div>
        ))}
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
        <button type="button" className="btn btn-primary" onClick={() => navigate('/order')}>
          Proceed to order
        </button>
      </div>
    </section>
  )
}
