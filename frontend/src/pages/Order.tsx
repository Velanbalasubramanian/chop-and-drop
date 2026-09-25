import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { submitOrder } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { products } from '../data/products'
import AuthCard from '../components/AuthCard'
import PaymentModal from '../components/PaymentModal'
import type { OrderPayload, PaymentMethod } from '../types'

const slots = ['6:00 – 7:00 AM', '7:00 – 8:00 AM', '5:00 – 6:00 PM']

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function Order() {
  const { user, token, loading: authLoading } = useAuth()
  const { items: cartItems, formatForOrder, totalPrice, clearCart, updateQuantity, removeItem } = useCart()

  const [form, setForm] = useState<OrderPayload>({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    deliverySlot: slots[0],
    items: '',
    notes: '',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    amount: 0,
    transactionId: '',
  })

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [placedOrder, setPlacedOrder] = useState<any>(null)

  // Sync user details when user logs in
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
      }))
    }
  }, [user])

  // Sync cart items text
  useEffect(() => {
    if (cartItems.length > 0) {
      setForm((prev) => ({ ...prev, items: formatForOrder() }))
    }
  }, [cartItems, formatForOrder])

  // Calculate pricing breakdown
  const detailedCartItems = cartItems
    .map((item) => {
      const prod = products.find((p) => p.id === item.productId)
      return { item, prod }
    })
    .filter((entry) => Boolean(entry.prod))

  const subtotal = totalPrice
  const deliveryFee = subtotal >= 199 || subtotal === 0 ? 0 : 30
  const packagingFee = subtotal > 0 ? 10 : 0
  const grandTotal = subtotal + deliveryFee + packagingFee

  function update<K extends keyof OrderPayload>(key: K, value: OrderPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleOrderExecution(chosenPaymentMethod: PaymentMethod, txnId?: string) {
    setStatus('submitting')
    setErrorMessage('')

    const payload: OrderPayload = {
      ...form,
      items: form.items || formatForOrder() || 'Custom Order',
      paymentMethod: chosenPaymentMethod,
      paymentStatus: chosenPaymentMethod === 'online' ? 'paid' : 'pending',
      amount: grandTotal,
      transactionId: txnId || '',
    }

    try {
      const result = await submitOrder(payload, token)
      setPlacedOrder({
        ...result,
        amount: grandTotal,
        paymentMethod: chosenPaymentMethod,
        transactionId: txnId || '',
      })
      setStatus('success')
      clearCart()
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Could not place order. Please try again.')
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()

    if (!form.address.trim()) {
      setErrorMessage('Please provide a delivery address.')
      return
    }

    if (paymentMethod === 'online') {
      setShowPaymentModal(true)
    } else {
      handleOrderExecution('cod')
    }
  }

  // 1. Guard check: If auth is still loading
  if (authLoading) {
    return (
      <section className="section page-section">
        <p className="page-intro" style={{ textAlign: 'center', padding: '3rem' }}>
          Checking authentication session…
        </p>
      </section>
    )
  }

  // 2. Guard check: "login panna mattum thn page varanum ilana vara kudathu authcard add pannuga"
  if (!user) {
    return (
      <section className="section page-section order-section">
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          <p className="page-eyebrow">Customer Checkout</p>
          <h1>Complete Your Order</h1>
          <p className="page-intro">
            To ensure secure order tracking and accurate vegetable deliveries, please log in with your account or OTP.
          </p>
        </div>

        {/* AuthCard displayed when not logged in */}
        <AuthCard
          title="Sign in to Continue Order"
          subtitle="Your cart items are safely saved. Log in or create a quick account below to complete your checkout."
        />
      </section>
    )
  }

  // 3. Success state
  if (status === 'success' && placedOrder) {
    return (
      <section className="section page-section order-section">
        <div className="order-success">
          <div
            className="success-check-pulse"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#e6f4ea',
              color: '#137333',
              fontSize: '2.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            ✓
          </div>
          <p className="page-eyebrow">Order Placed Successfully!</p>
          <h1>Order ID: {placedOrder.orderId}</h1>
          <p className="page-intro">
            Thank you, {user.name}! Your freshly washed &amp; cut vegetables are queued for preparation.
          </p>

          <div
            style={{
              background: '#f9f9fb',
              borderRadius: '12px',
              padding: '1.25rem',
              maxWidth: '460px',
              margin: '1.5rem auto',
              textAlign: 'left',
              border: '1px solid #ececee',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#686b78' }}>Payment Method:</span>
              <strong>{placedOrder.paymentMethod === 'online' ? 'Online Payment (Instant)' : 'Cash on Delivery'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#686b78' }}>Payment Status:</span>
              <span
                style={{
                  fontWeight: 600,
                  color: placedOrder.paymentStatus === 'paid' ? '#137333' : '#e35c00',
                  background: placedOrder.paymentStatus === 'paid' ? '#e6f4ea' : '#fff4eb',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {placedOrder.paymentStatus === 'paid' ? 'PAID ✓' : 'PENDING (Pay on Delivery)'}
              </span>
            </div>
            {placedOrder.transactionId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#686b78' }}>Transaction ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{placedOrder.transactionId}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
              <span style={{ color: '#686b78' }}>Total Amount:</span>
              <strong style={{ fontSize: '1.1rem', color: '#294a2c' }}>₹{placedOrder.amount}</strong>
            </div>
          </div>

          <div className="order-success-actions">
            <Link to={`/track?orderId=${placedOrder.orderId}&phone=${user.phone}`} className="btn btn-primary">
              Track Live Order ➔
            </Link>
            <Link to="/my-orders" className="btn btn-ghost">
              View Order History
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // 4. Main Order & Cart View page
  return (
    <section className="section page-section order-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="page-eyebrow">Checkout &amp; Delivery</p>
        <h1>Confirm your Order</h1>
        <p className="page-intro" style={{ margin: 0 }}>
          Review your cart items, select your preferred delivery time, and choose your payment method.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Form Details */}
        <div>
          <form className="order-form" onSubmit={handleFormSubmit}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#294a2c' }}>1. Delivery Information</h2>

            <div className="form-row">
              <label>
                Your name
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Priya Ramesh"
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </label>
            </div>

            <label>
              Email (optional, for invoice &amp; notifications)
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Complete Delivery Address
              <textarea
                required
                rows={3}
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Flat / Door no., building name, street, landmark, pincode"
              />
            </label>

            <label>
              Preferred Delivery Slot
              <select value={form.deliverySlot} onChange={(e) => update('deliverySlot', e.target.value)}>
                {slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cooking / Delivery Instructions (Optional)
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="e.g. Cut onions finely, leave at door, don't ring bell"
              />
            </label>

            {/* Payment Method Selection */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ececee', paddingTop: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#294a2c' }}>2. Payment Method</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Cash On Delivery */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: paymentMethod === 'cod' ? '2px solid #fc8019' : '1px solid #ececee',
                    background: paymentMethod === 'cod' ? '#fffaf5' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    style={{ width: '18px', height: '18px', accentColor: '#fc8019' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#3d4152', fontSize: '0.95rem' }}>
                      💵 Cash on Delivery (COD)
                    </div>
                    <div style={{ color: '#686b78', fontSize: '0.82rem' }}>
                      Pay using cash or any UPI app upon delivery at your doorstep
                    </div>
                  </div>
                </label>

                {/* Online Payment */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: paymentMethod === 'online' ? '2px solid #fc8019' : '1px solid #ececee',
                    background: paymentMethod === 'online' ? '#fffaf5' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    style={{ width: '18px', height: '18px', accentColor: '#fc8019' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: '#3d4152', fontSize: '0.95rem' }}>
                      💳 Online Payment (Instant UPI / Cards)
                    </div>
                    <div style={{ color: '#686b78', fontSize: '0.82rem' }}>
                      Pay securely with Google Pay, PhonePe, Paytm, QR, or Credit/Debit Card
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {errorMessage && (
              <p className="form-status form-status-error" style={{ marginTop: '1rem' }}>
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'submitting' || detailedCartItems.length === 0}
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem', padding: '1rem', fontSize: '1.05rem' }}
            >
              {status === 'submitting'
                ? 'Processing Order…'
                : paymentMethod === 'online'
                  ? `Pay ₹${grandTotal} & Place Order`
                  : `Confirm Order (₹${grandTotal} COD)`}
            </button>
          </form>
        </div>

        {/* Right Column: View Cart Items & Price Breakdown */}
        <div>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid #ececee',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#294a2c' }}>Cart Items ({cartItems.length})</h2>
              <Link to="/products" style={{ color: '#fc8019', fontSize: '0.85rem', fontWeight: 600 }}>
                + Add more
              </Link>
            </div>

            {detailedCartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <p style={{ color: '#686b78', margin: '0 0 1rem 0' }}>Your cart is empty.</p>
                <Link to="/products" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                  Browse Vegetable Packs
                </Link>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
                  {detailedCartItems.map(({ item, prod }) => (
                    <div
                      key={item.productId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0',
                        borderBottom: '1px solid #f5f5f7',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#3d4152' }}>
                          {prod!.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#686b78' }}>
                          {prod!.tamilName} · {prod!.unit} · ₹{prod!.price}
                        </div>
                      </div>

                      <div className="qty-stepper" style={{ transform: 'scale(0.9)' }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>

                      <div style={{ fontWeight: 600, minWidth: '48px', textAlign: 'right', fontSize: '0.92rem' }}>
                        ₹{prod!.price * item.quantity}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        style={{ background: 'transparent', border: 'none', color: '#c5221f', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div style={{ borderTop: '1.5px solid #ececee', marginTop: '1.25rem', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#686b78' }}>
                    <span>Items Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#686b78' }}>
                    <span>Delivery Fee</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span style={{ color: '#0f8a3d', fontWeight: 600 }}>FREE</span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#686b78' }}>
                    <span>Hygienic Vacuum Pack Fee</span>
                    <span>₹{packagingFee}</span>
                  </div>

                  {subtotal < 199 && subtotal > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#fc8019', margin: '0.5rem 0', background: '#fff9f4', padding: '6px 10px', borderRadius: '6px' }}>
                      💡 Add ₹{199 - subtotal} more items to get <strong>FREE delivery</strong>!
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #ececee',
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#294a2c',
                    }}
                  >
                    <span>To Pay</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Online Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          amount={grandTotal}
          customerName={user.name}
          onSuccess={(txnId) => {
            setShowPaymentModal(false)
            handleOrderExecution('online', txnId)
          }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}
    </section>
  )
}
