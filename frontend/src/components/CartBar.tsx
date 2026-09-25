import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

// A floating bottom bar (Swiggy-style "View Cart" strip) that appears
// persistently on any page once the cart has items, except the cart page itself.
export default function CartBar() {
  const { totalCount, totalPrice } = useCart()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (totalCount > 0 && location.pathname !== '/cart') {
      document.body.classList.add('has-cart-bar')
    } else {
      document.body.classList.remove('has-cart-bar')
    }
    return () => {
      document.body.classList.remove('has-cart-bar')
    }
  }, [totalCount, location.pathname])

  if (totalCount === 0) return null
  if (location.pathname === '/cart') return null

  return (
    <button type="button" className="cart-bar" onClick={() => navigate('/cart')}>
      <span className="cart-bar-count">
        {totalCount} item{totalCount === 1 ? '' : 's'} · ₹{totalPrice}
      </span>
      <span className="cart-bar-cta">
        View Cart <span aria-hidden="true">→</span>
      </span>
    </button>
  )
}
