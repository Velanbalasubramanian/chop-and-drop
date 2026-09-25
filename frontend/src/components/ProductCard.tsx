import { useState } from 'react'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'

export default function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart()
  const inCart = items.find((i) => i.productId === product.id)

  const [justAdded, setJustAdded] = useState(false)

  function handleFirstAdd() {
    addItem(product.id, 1)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 900)
  }

  return (
    <article className="product-card">
      <div className="product-card-top">
        <span className="veg-mark" aria-label="Vegetarian" title="Vegetarian" />
        <span className="product-unit">{product.unit}</span>
      </div>
      <span className="product-tamil">{product.tamilName}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="product-card-bottom">
        <div className="product-price">₹{product.price}</div>

        {inCart ? (
          <div className="qty-stepper qty-stepper-add">
            <button
              type="button"
              onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span>{inCart.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
              aria-label="Increase quantity"
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
    </article>
  )
}
