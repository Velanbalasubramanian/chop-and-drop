import { FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { trackOrder, cancelOrder } from '../api'
import { getSocket } from '../socket'
import type { OrderStatus, TrackedOrder } from '../types'

const STATUS_LABELS: Record<string, string> = {
  received: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Packing & Quality Check',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled / Refunded',
}

const CANCEL_REASONS = [
  'Changed my mind',
  'Delivery time is too long',
  'Ordered wrong items / address',
  'Placed duplicate order',
  'Found better price elsewhere',
  'Other reason',
]

const cleanOrderId = (id: string) => String(id || '').replace(/^#/, '').trim().toUpperCase()

export default function TrackOrder() {
  const [params] = useSearchParams()
  const [orderId, setOrderId] = useState(params.get('orderId') || '')
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveNotification, setLiveNotification] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('Changed my mind')
  const [customReason, setCustomReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')

  async function handleConfirmCancel() {
    if (!order) return
    const reason = cancelReason === 'Other reason'
      ? (customReason.trim() || 'Other reason')
      : cancelReason

    setCancelLoading(true)
    try {
      const res = await cancelOrder(order.id, phone.trim(), reason)
      setOrder(res.order)
      setShowCancelModal(false)
      setCustomReason('')
      setCancelSuccessMsg('Your order has been cancelled successfully.')
      setLiveNotification(`Order #${order.id} was cancelled.`)
      setTimeout(() => setCancelSuccessMsg(''), 8000)
    } catch (err: any) {
      alert(err.message || 'Could not cancel order. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

  async function executeSearch(targetOrderId = orderId, targetPhone = phone) {
    const cleanId = cleanOrderId(targetOrderId)
    if (!cleanId) return

    setLoading(true)
    setError('')
    setLiveNotification('')
    try {
      const result = await trackOrder(cleanId, targetPhone.trim())
      setOrder(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that order.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    executeSearch(orderId, phone)
  }

  // Auto-search on mount if params are in URL
  useEffect(() => {
    const qOrderId = params.get('orderId')
    if (qOrderId) {
      executeSearch(qOrderId, params.get('phone') || phone)
    }
  }, [])

  // Socket.IO: listen for real-time status changes to this specific order
  useEffect(() => {
    if (!order?.id) return

    const socket = getSocket()
    const activeOrderId = cleanOrderId(order.id)

    socket.emit('join_order', activeOrderId)

    function handleUpdate(data: { orderId: string; status: OrderStatus }) {
      if (cleanOrderId(data.orderId) === activeOrderId) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : null))
        setLiveNotification(`🟢 Real-time update: Status changed to "${STATUS_LABELS[data.status] || data.status}"`)
        setTimeout(() => setLiveNotification(''), 8000)
      }
    }

    function handleRefundUpdate(data: TrackedOrder) {
      if (cleanOrderId(data.id) === activeOrderId) {
        setOrder((prev) => (prev ? { ...prev, ...data } : null))
        const msg =
          data.paymentStatus === 'refunded'
            ? `💸 Refund Approved: Reference ${data.refundId || ''} (₹${data.refundAmount || data.amount})`
            : `⏳ Refund update: Request is currently in review.`
        setLiveNotification(msg)
        setTimeout(() => setLiveNotification(''), 8000)
      }
    }

    function onSocketConnect() {
      socket.emit('join_order', activeOrderId)
      trackOrder(activeOrderId, phone.trim()).then(setOrder).catch(() => {})
    }

    socket.on('connect', onSocketConnect)
    socket.on('order_status_updated', handleUpdate)
    socket.on('order_refund_updated', handleRefundUpdate)

    return () => {
      socket.emit('leave_order', activeOrderId)
      socket.off('connect', onSocketConnect)
      socket.off('order_status_updated', handleUpdate)
      socket.off('order_refund_updated', handleRefundUpdate)
    }
  }, [order?.id])

  // Periodic background auto-refresh fallback (every 3 seconds) until order is delivered
  useEffect(() => {
    if (!order?.id || order.status === 'delivered' || order.status === 'cancelled') return

    const activeId = cleanOrderId(order.id)
    const targetPhone = phone.trim()

    const interval = setInterval(async () => {
      try {
        const fresh = await trackOrder(activeId, targetPhone)
        if (fresh && fresh.status) {
          setOrder((prev) => {
            if (!prev) return fresh
            if (prev.status !== fresh.status) {
              setLiveNotification(`🟢 Real-time update: Status changed to "${STATUS_LABELS[fresh.status] || fresh.status}"`)
              setTimeout(() => setLiveNotification(''), 8000)
            }
            return { ...prev, ...fresh }
          })
        }
      } catch {}
    }, 3000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackOrder(activeId, targetPhone).then(setOrder).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [order?.id, order?.status, phone])

  const currentStepIndex = order ? order.steps.indexOf(order.status) : -1
  const totalSteps = order?.steps?.length || 5
  const progressPercent =
    currentStepIndex >= 0
      ? Math.min(100, Math.max(8, (currentStepIndex / (totalSteps - 1)) * 100))
      : 8

  return (
    <section className="section page-section track-section">
      <p className="page-eyebrow">Track your order</p>
      <h1>Where's my delivery?</h1>
      <p className="page-intro">Enter your order ID and the phone number you ordered with.</p>

      <form className="order-form track-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Order ID
            <input
              required
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="CD-8K3F2A"
            />
          </label>
          <label>
            Phone number
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
            />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Checking…' : 'Track order'}
        </button>
        {error && <p className="form-status form-status-error">{error}</p>}
      </form>

      {order && (
        <div className="tracking-result">
          {liveNotification && (
            <div
              style={{
                background: '#e6f4ea',
                color: '#137333',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontWeight: 600,
                border: '1px solid #ceead6',
              }}
            >
              {liveNotification}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2>Order {order.id}</h2>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '3px 10px',
                borderRadius: '12px',
                background: '#e6f4ea',
                color: '#137333',
                fontWeight: 600,
              }}
            >
              🟢 Live Real-Time Tracking
            </span>
          </div>

          <p className="page-intro">
            {order.items} · Delivery slot: {order.deliverySlot}
          </p>

          {/* Live Delivery Partner Card */}
          {order.riderName && order.status !== 'cancelled' && (
            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                margin: '1rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  }}
                >
                  🛵
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1d4ed8', fontWeight: 700 }}>
                    Zippo Delivery Partner Assigned
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {order.riderName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {order.status === 'out_for_delivery'
                      ? '⚡ On the way to your door with fresh package!'
                      : order.status === 'delivered'
                        ? '✓ Delivered your package safely!'
                        : 'Heading to store for pickup.'}
                  </div>
                </div>
              </div>
              {order.riderPhone && (
                <a
                  href={`tel:${order.riderPhone}`}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                  }}
                >
                  📞 Call Partner ({order.riderPhone})
                </a>
              )}
            </div>
          )}

          <div
            style={{
              background: '#f9f9fb',
              border: '1px solid #ececee',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              margin: '1rem 0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
              alignItems: 'center',
              fontSize: '0.88rem',
            }}
          >
            <div>
              <span style={{ color: '#686b78' }}>Payment: </span>
              <strong>
                {order.paymentMethod === 'online' ? '💳 Online Payment' : '💵 Cash on Delivery'}
              </strong>{' '}
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  background:
                    order.paymentStatus === 'refunded'
                      ? '#f3e8fd'
                      : order.paymentStatus === 'refund_requested'
                        ? '#fef7e0'
                        : order.paymentStatus === 'paid'
                          ? '#e6f4ea'
                          : '#fff4eb',
                  color:
                    order.paymentStatus === 'refunded'
                      ? '#6b21a8'
                      : order.paymentStatus === 'refund_requested'
                        ? '#b06000'
                        : order.paymentStatus === 'paid'
                          ? '#137333'
                          : '#e35c00',
                }}
              >
                {order.paymentStatus === 'refunded'
                  ? `REFUNDED ₹${order.refundAmount || order.amount} ✓`
                  : order.paymentStatus === 'refund_requested'
                    ? 'REFUND IN REVIEW ⏳'
                    : order.paymentStatus === 'paid'
                      ? 'PAID ✓'
                      : 'COLLECT ON DELIVERY'}
              </span>
            </div>

            {order.amount ? (
              <div>
                <span style={{ color: '#686b78' }}>Amount: </span>
                <strong>₹{order.amount}</strong>
              </div>
            ) : null}

            {order.transactionId && (
              <div>
                <span style={{ color: '#686b78' }}>Txn ID: </span>
                <span style={{ fontFamily: 'monospace' }}>{order.transactionId}</span>
              </div>
            )}
          </div>

          {/* Refund Notice Banner */}
          {order.paymentStatus === 'refunded' && (
            <div
              style={{
                background: '#faf5ff',
                border: '1.5px solid #d8b4fe',
                borderRadius: '10px',
                padding: '1rem',
                margin: '1rem 0',
                color: '#6b21a8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1rem' }}>💸 Refund Successfully Processed</strong>
                {order.refundId && (
                  <span style={{ background: '#f3e8fd', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {order.refundId}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', marginTop: '4px', color: '#4c1d95' }}>
                Amount of ₹{order.refundAmount || order.amount} has been reversed to your original payment method / UPI account.
              </div>
              {order.refundReason && (
                <div style={{ fontSize: '0.8rem', color: '#7e22ce', marginTop: '2px' }}>
                  Reason: {order.refundReason}
                </div>
              )}
            </div>
          )}

          {order.paymentStatus === 'refund_requested' && (
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '10px',
                padding: '1rem',
                margin: '1rem 0',
                color: '#92400e',
              }}
            >
              <strong style={{ fontSize: '0.95rem' }}>⏳ Refund Request Under Review</strong>
              <div style={{ fontSize: '0.88rem', marginTop: '4px' }}>
                We have received your refund request for ₹{order.refundAmount || order.amount}. Our team is verifying the request and will credit your account shortly.
              </div>
              {order.refundReason && (
                <div style={{ fontSize: '0.8rem', marginTop: '2px', color: '#b45309' }}>
                  Reason: {order.refundReason}
                </div>
              )}
            </div>
          )}

          {/* Animated Delivery Road Tracker */}
          <div className="live-delivery-road">
            <div className="road-milestones">
              <div className="milestone milestone-start">
                <span className="milestone-icon">🌱</span>
                <span className="milestone-label">Farm Hub</span>
              </div>
              <div className="milestone milestone-mid">
                <span className="milestone-icon">📦</span>
                <span className="milestone-label">Packed &amp; Checked</span>
              </div>
              <div className="milestone milestone-mid">
                <span className="milestone-icon">🛵</span>
                <span className="milestone-label">On the Road</span>
              </div>
              <div className="milestone milestone-end">
                <span className="milestone-icon">🏠</span>
                <span className="milestone-label">Your Door</span>
              </div>
            </div>

            <div className="road-strip">
              <div className="road-line" />
              <div className="road-progress-fill" style={{ width: `${progressPercent}%` }} />
              <div
                className="road-vehicle"
                style={{
                  left: `${progressPercent}%`,
                }}
              >
                <div className="vehicle-pulse-ring" />
                <span className="vehicle-emoji" role="img" aria-label="Delivery Scooter">
                  🛵
                </span>
              </div>
            </div>

            <div
              className="road-status-pill"
              style={
                order.status === 'delivered'
                  ? { backgroundColor: '#e6f4ea', color: '#137333', borderColor: '#ceead6' }
                  : undefined
              }
            >
              <span
                className="live-radar-dot"
                style={order.status === 'delivered' ? { backgroundColor: '#137333' } : undefined}
              />
              <span>
                Live Status:{' '}
                <strong>
                  {order.status === 'delivered' ? 'Delivered ✓' : STATUS_LABELS[order.status] || order.status}
                </strong>
              </span>
            </div>
          </div>

          <ol className="tracking-steps">
            {order.steps.map((step, index) => {
              const isDelivered = order.status === 'delivered'
              const isStepDone = index < currentStepIndex || (isDelivered && step === 'delivered')
              return (
                <li
                  key={step}
                  className={
                    isStepDone
                      ? 'tracking-step done'
                      : index === currentStepIndex
                        ? 'tracking-step current'
                        : 'tracking-step'
                  }
                >
                  {STATUS_LABELS[step] || step} {isDelivered && step === 'delivered' ? '✓' : ''}
                </li>
              )
            })}
          </ol>

          {/* Cancellation Info Banner (if cancelled) */}
          {order.status === 'cancelled' && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '10px',
                padding: '1rem',
                margin: '1.5rem 0',
                color: '#991b1b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem' }}>
                <span>✕ Order Cancelled</span>
              </div>
              <div style={{ fontSize: '0.88rem', marginTop: '4px', color: '#7f1d1d' }}>
                {order.cancelReason ? `Reason: ${order.cancelReason}` : 'This order has been cancelled.'}
              </div>
              {order.paymentMethod === 'online' && (
                <div style={{ fontSize: '0.82rem', marginTop: '6px', color: '#b91c1c', fontWeight: 600 }}>
                  Online payment refund requested. The amount will be reversed to your account.
                </div>
              )}
            </div>
          )}

          {cancelSuccessMsg && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#065f46',
                fontWeight: 600,
                fontSize: '0.9rem',
                margin: '1rem 0',
              }}
            >
              ✓ {cancelSuccessMsg}
            </div>
          )}

          {/* Cancel Order Action Button (if active) */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                style={{
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1.5px solid #fca5a5',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => setShowCancelModal(true)}
              >
                ✕ Cancel This Order
              </button>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#686b78' }}>
            Need help with this order?{' '}
            <Link to="/help" style={{ color: '#fc8019', fontWeight: 600 }}>
              Contact Help &amp; Support ➔
            </Link>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
                Cancel Order #{order?.id}
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to cancel? Any items reserved from store stock will be immediately restored.
            </p>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Select reason for cancellation:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {CANCEL_REASONS.map((r) => {
                const isSelected = cancelReason === r
                return (
                  <label
                    key={r}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '1.5px solid #fc8019' : '1px solid #e2e8f0',
                      background: isSelected ? '#fff7ed' : '#f8fafc',
                      color: isSelected ? '#c2410c' : '#334155',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={r}
                      checked={isSelected}
                      onChange={() => setCancelReason(r)}
                    />
                    {r}
                  </label>
                )
              })}
            </div>

            {cancelReason === 'Other reason' && (
              <textarea
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                placeholder="Please describe why you are cancelling..."
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                }}
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
