import { FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { trackOrder } from '../api'
import { getSocket } from '../socket'
import type { OrderStatus, TrackedOrder } from '../types'

const STATUS_LABELS: Record<string, string> = {
  received: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Being washed & chopped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled / Refunded',
}

export default function TrackOrder() {
  const [params] = useSearchParams()
  const [orderId, setOrderId] = useState(params.get('orderId') || '')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveNotification, setLiveNotification] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)
    setLiveNotification('')
    try {
      const result = await trackOrder(orderId.trim(), phone.trim())
      setOrder(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // Socket.IO: listen for real-time status changes to this specific order
  useEffect(() => {
    if (!order?.id) return

    const socket = getSocket()
    const activeOrderId = order.id

    socket.emit('join_order', activeOrderId)

    function handleUpdate(data: { orderId: string; status: OrderStatus }) {
      if (data.orderId === activeOrderId) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : null))
        setLiveNotification(`🟢 Real-time update: Status changed to "${STATUS_LABELS[data.status] || data.status}"`)
        setTimeout(() => setLiveNotification(''), 8000)
      }
    }

    function handleRefundUpdate(data: TrackedOrder) {
      if (data.id === activeOrderId) {
        setOrder((prev) => (prev ? { ...prev, ...data } : null))
        const msg =
          data.paymentStatus === 'refunded'
            ? `💸 Refund Approved: Reference ${data.refundId || ''} (₹${data.refundAmount || data.amount})`
            : `⏳ Refund update: Request is currently in review.`
        setLiveNotification(msg)
        setTimeout(() => setLiveNotification(''), 8000)
      }
    }

    socket.on('order_status_updated', handleUpdate)
    socket.on('order_refund_updated', handleRefundUpdate)

    return () => {
      socket.emit('leave_order', activeOrderId)
      socket.off('order_status_updated', handleUpdate)
      socket.off('order_refund_updated', handleRefundUpdate)
    }
  }, [order?.id])

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
                <span className="milestone-icon">🔪</span>
                <span className="milestone-label">Fresh Chopped</span>
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

            <div className="road-status-pill">
              <span className="live-radar-dot" />
              <span>
                Live Status: <strong>{STATUS_LABELS[order.status] || order.status}</strong>
              </span>
            </div>
          </div>

          <ol className="tracking-steps">
            {order.steps.map((step, index) => (
              <li
                key={step}
                className={
                  index < currentStepIndex
                    ? 'tracking-step done'
                    : index === currentStepIndex
                      ? 'tracking-step current'
                      : 'tracking-step'
                }
              >
                {STATUS_LABELS[step] || step}
              </li>
            ))}
          </ol>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#686b78' }}>
            Need help with this order?{' '}
            <Link to="/help" style={{ color: '#fc8019', fontWeight: 600 }}>
              Contact Help &amp; Support ➔
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
