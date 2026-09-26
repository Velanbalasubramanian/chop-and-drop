import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyOrders, fetchMyTransactions, requestOrderRefund } from '../api'
import { getSocket } from '../socket'
import AuthCard from '../components/AuthCard'
import type { AdminOrder, Transaction } from '../types'

const STATUS_LABELS: Record<string, string> = {
  received: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Being washed & chopped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled / Refunded',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  received: { bg: '#fff4eb', color: '#fc8019' },
  confirmed: { bg: '#e8f0fe', color: '#1a73e8' },
  preparing: { bg: '#fef7e0', color: '#b06000' },
  out_for_delivery: { bg: '#e6f4ea', color: '#137333' },
  delivered: { bg: '#e6f4ea', color: '#0f8a3d' },
  cancelled: { bg: '#fce8e6', color: '#c5221f' },
}

export default function MyOrders() {
  const { user, token, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'orders' | 'transactions'>('orders')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<AdminOrder | null>(null)

  // Refund modal states
  const [refundTargetOrder, setRefundTargetOrder] = useState<AdminOrder | null>(null)
  const [refundReason, setRefundReason] = useState('Damaged / Spoiled Vegetables')
  const [refundCustomNotes, setRefundCustomNotes] = useState('')
  const [refundUpi, setRefundUpi] = useState('')
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundMsg, setRefundMsg] = useState('')
  const [refundErr, setRefundErr] = useState('')

  useEffect(() => {
    if (!token) return

    setLoading(true)
    Promise.all([fetchMyOrders(token), fetchMyTransactions(token)])
      .then(([ordersData, txnsData]) => {
        setOrders(ordersData)
        setTransactions(txnsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load order history.'))
      .finally(() => setLoading(false))

    // Real-time socket: update order status live
    const socket = getSocket()
    function handleStatusUpdate({ orderId, status }: { orderId: string; status: any }) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    }

    function handleRefundUpdate(updatedOrder: AdminOrder) {
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)))
      setTransactions((prev) =>
        prev.map((t) =>
          t.orderId === updatedOrder.id
            ? {
                ...t,
                paymentStatus: updatedOrder.paymentStatus || t.paymentStatus,
                refundId: updatedOrder.refundId,
                refundReason: updatedOrder.refundReason,
                refundAmount: updatedOrder.refundAmount,
                refundRequestedAt: updatedOrder.refundRequestedAt,
                refundProcessedAt: updatedOrder.refundProcessedAt,
              }
            : t
        )
      )
      if (selectedReceipt && selectedReceipt.id === updatedOrder.id) {
        setSelectedReceipt(updatedOrder)
      }
    }

    socket.on('order_status_updated', handleStatusUpdate)
    socket.on('order_refund_updated', handleRefundUpdate)

    return () => {
      socket.off('order_status_updated', handleStatusUpdate)
      socket.off('order_refund_updated', handleRefundUpdate)
    }
  }, [token, selectedReceipt])

  async function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!refundTargetOrder) return
    setRefundLoading(true)
    setRefundErr('')
    setRefundMsg('')

    try {
      const fullReason = refundCustomNotes.trim()
        ? `${refundReason} — ${refundCustomNotes.trim()}`
        : refundReason

      const result = await requestOrderRefund(
        refundTargetOrder.id,
        refundTargetOrder.phone,
        fullReason,
        refundTargetOrder.amount,
        refundUpi.trim(),
        token
      )

      setRefundMsg(result.message || 'Refund request submitted successfully!')
      setOrders((prev) => prev.map((o) => (o.id === refundTargetOrder.id ? { ...o, ...result.order } : o)))

      setTimeout(() => {
        setRefundTargetOrder(null)
        setRefundMsg('')
        setRefundCustomNotes('')
        setRefundUpi('')
      }, 2000)
    } catch (err) {
      setRefundErr(err instanceof Error ? err.message : 'Could not submit refund request.')
    } finally {
      setRefundLoading(false)
    }
  }

  if (authLoading) {
    return (
      <section className="section page-section">
        <p className="page-intro" style={{ textAlign: 'center', padding: '3rem' }}>
          Loading your account...
        </p>
      </section>
    )
  }

  // Not logged in -> Show AuthCard
  if (!user) {
    return (
      <section className="section page-section">
        <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto 1.5rem' }}>
          <p className="page-eyebrow">Customer Account</p>
          <h1>Previous Orders &amp; Transactions</h1>
          <p className="page-intro">
            Please log in with your phone number or OTP to view your previous orders, digital receipts, and
            transaction history.
          </p>
        </div>

        <AuthCard
          title="Sign In to View Orders &amp; Transactions"
          subtitle="Access your full purchase history, live order tracking, and payment receipts."
        />
      </section>
    )
  }

  // Analytics summary for transactions
  const totalSpent = orders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const onlineCount = orders.filter((o) => o.paymentMethod === 'online').length
  const codCount = orders.filter((o) => o.paymentMethod === 'cod').length

  return (
    <section className="section page-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="page-eyebrow">Account History</p>
          <h1>Welcome, {user.name}</h1>
          <p className="page-intro" style={{ margin: 0 }}>
            Track your previous orders and view complete payment transaction details.
          </p>
        </div>

        <Link to="/order" className="btn btn-primary">
          + Place New Order
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#f5f5f7',
          borderRadius: '12px',
          padding: '6px',
          maxWidth: '460px',
          margin: '0 0 2rem 0',
          gap: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: 'none',
            borderRadius: '10px',
            background: activeTab === 'orders' ? '#ffffff' : 'transparent',
            color: activeTab === 'orders' ? '#fc8019' : '#686b78',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'orders' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>📦 Previous Orders</span>
          <span
            style={{
              background: activeTab === 'orders' ? '#fff4eb' : '#e0e0e0',
              color: activeTab === 'orders' ? '#fc8019' : '#686b78',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: 'none',
            borderRadius: '10px',
            background: activeTab === 'transactions' ? '#ffffff' : 'transparent',
            color: activeTab === 'transactions' ? '#fc8019' : '#686b78',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'transactions' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>💳 Transaction History</span>
          <span
            style={{
              background: activeTab === 'transactions' ? '#fff4eb' : '#e0e0e0',
              color: activeTab === 'transactions' ? '#fc8019' : '#686b78',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {transactions.length}
          </span>
        </button>
      </div>

      {loading && <p className="page-intro">Loading your records...</p>}
      {error && <p className="form-status form-status-error">{error}</p>}

      {/* TAB 1: PREVIOUS ORDERS */}
      {activeTab === 'orders' && !loading && (
        <div>
          {orders.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
                border: '1px solid #ececee',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥗</div>
              <h2>No previous orders yet</h2>
              <p style={{ color: '#686b78', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                You haven't placed any chopped-vegetable orders yet. Browse our freshly curated packs and get cooking!
              </p>
              <Link to="/products" className="btn btn-primary">
                Browse Fresh Packs ➔
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((order) => {
                const statusTheme = STATUS_COLORS[order.status] || { bg: '#f5f5f7', color: '#3d4152' }
                return (
                  <article
                    key={order.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      boxShadow: 'var(--shadow-card)',
                      border: '1px solid #ececee',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {/* Order Top Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        borderBottom: '1px solid #f5f5f7',
                        paddingBottom: '1rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#294a2c' }}>
                            Order {order.id}
                          </span>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontWeight: 600,
                              background: statusTheme.bg,
                              color: statusTheme.color,
                            }}
                          >
                            • {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#686b78', marginTop: '2px' }}>
                          Placed on {new Date(order.receivedAt).toLocaleDateString()} at{' '}
                          {new Date(order.receivedAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#294a2c' }}>
                          ₹{order.amount || 0}
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
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
                            ? `Refunded ₹${order.refundAmount || order.amount} ✓`
                            : order.paymentStatus === 'refund_requested'
                              ? 'Refund In Review ⏳'
                              : order.paymentMethod === 'online'
                                ? 'Online Paid ✓'
                                : 'Cash on Delivery (Pending)'}
                        </span>
                      </div>
                    </div>

                    {/* Order Content */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#686b78', fontWeight: 600, letterSpacing: '0.5px' }}>
                          Vegetables &amp; Packs
                        </span>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 500, color: '#3d4152', lineHeight: '1.5' }}>
                          {order.items}
                        </p>
                        {order.notes && (
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#686b78', fontStyle: 'italic' }}>
                            Note: "{order.notes}"
                          </p>
                        )}
                      </div>

                      <div>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#686b78', fontWeight: 600, letterSpacing: '0.5px' }}>
                          Delivery Address &amp; Slot
                        </span>
                        <p style={{ margin: '4px 0 0 0', color: '#3d4152', fontSize: '0.88rem' }}>
                          {order.address}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#fc8019', fontWeight: 600 }}>
                          ⏰ Slot: {order.deliverySlot}
                        </p>
                      </div>

                      {order.transactionId && (
                        <div>
                          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#686b78', fontWeight: 600, letterSpacing: '0.5px' }}>
                            Transaction Info
                          </span>
                          <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace', fontWeight: 600, color: '#3d4152', fontSize: '0.85rem' }}>
                            {order.transactionId}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: '#137333' }}>Verified Gateway Payment</span>
                        </div>
                      )}
                    </div>

                    {/* Refund status banner if requested or refunded */}
                    {order.paymentStatus === 'refunded' && (
                      <div
                        style={{
                          background: '#faf5ff',
                          border: '1px solid #e9d5ff',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#6b21a8' }}>💸 Refund Completed: </strong>
                          <span style={{ color: '#4c1d95' }}>
                            ₹{order.refundAmount || order.amount} has been successfully refunded.
                          </span>
                          {order.refundReason && (
                            <div style={{ color: '#6b21a8', fontSize: '0.8rem', marginTop: '2px' }}>
                              Reason: {order.refundReason}
                            </div>
                          )}
                        </div>
                        {order.refundId && (
                          <span
                            style={{
                              background: '#f3e8fd',
                              color: '#6b21a8',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '0.82rem',
                            }}
                          >
                            {order.refundId}
                          </span>
                        )}
                      </div>
                    )}

                    {order.paymentStatus === 'refund_requested' && (
                      <div
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          marginBottom: '1rem',
                          fontSize: '0.85rem',
                        }}
                      >
                        <strong style={{ color: '#b45309' }}>⏳ Refund Request Under Review: </strong>
                        <span style={{ color: '#92400e' }}>
                          Our team is verifying your request ({order.refundReason || 'Order issue'}). Refund of ₹{order.refundAmount || order.amount} will be processed shortly.
                        </span>
                      </div>
                    )}

                    {/* Order Footer Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        borderTop: '1px solid #f5f5f7',
                        paddingTop: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Link
                          to={`/track?orderId=${order.id}&phone=${order.phone}`}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          Track Live Delivery ➔
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(order)}
                          className="btn btn-ghost"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          📄 View Receipt / Bill
                        </button>

                        {/* Request Refund button for eligible orders */}
                        {order.paymentStatus !== 'refunded' && order.paymentStatus !== 'refund_requested' && order.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundTargetOrder(order)
                              setRefundErr('')
                              setRefundMsg('')
                              setRefundUpi(user?.phone ? `${user.phone}@upi` : '')
                            }}
                            className="btn btn-ghost"
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.85rem',
                              color: '#c2410c',
                              borderColor: '#ffedd5',
                              background: '#fffaf5',
                            }}
                          >
                            ↩ Request Refund
                          </button>
                        )}
                      </div>

                      <div>
                        <Link
                          to={`/help`}
                          style={{ fontSize: '0.85rem', color: '#686b78', textDecoration: 'none' }}
                        >
                          Need help with this order? <span style={{ color: '#fc8019', fontWeight: 600 }}>Support ➔</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSACTION HISTORY */}
      {activeTab === 'transactions' && !loading && (
        <div>
          {/* Summary Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #ececee', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ color: '#686b78', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Purchases</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#294a2c', marginTop: '4px' }}>₹{totalSpent}</div>
              <div style={{ fontSize: '0.78rem', color: '#137333', marginTop: '2px' }}>Across {orders.length} orders</div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #ececee', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ color: '#686b78', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>Online Payments</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a73e8', marginTop: '4px' }}>{onlineCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#686b78', marginTop: '2px' }}>Instant UPI / Cards</div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #ececee', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ color: '#686b78', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>Cash On Delivery</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#e35c00', marginTop: '4px' }}>{codCount}</div>
              <div style={{ fontSize: '0.78rem', color: '#686b78', marginTop: '2px' }}>Doorstep settlements</div>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          {transactions.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
                border: '1px solid #ececee',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
              <h2>No transactions recorded yet</h2>
              <p style={{ color: '#686b78', margin: '0 0 1.5rem 0' }}>
                Your payment receipts and transaction records will appear here automatically.
              </p>
              <Link to="/products" className="btn btn-primary">
                Start Shopping ➔
              </Link>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #ececee', overflowX: 'auto', boxShadow: 'var(--shadow-card)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f9f9fb', borderBottom: '1px solid #ececee' }}>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Transaction ID</th>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Order ID</th>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Date &amp; Time</th>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Payment Method</th>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '1rem', color: '#686b78', fontWeight: 600 }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const matchedOrder = orders.find((o) => o.id === txn.orderId)
                    return (
                      <tr key={txn.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600, color: '#3d4152' }}>
                          {txn.id}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <Link to={`/track?orderId=${txn.orderId}&phone=${user.phone}`} style={{ color: '#fc8019', fontWeight: 600 }}>
                            {txn.orderId}
                          </Link>
                        </td>
                        <td style={{ padding: '1rem', color: '#686b78', fontSize: '0.85rem' }}>
                          {new Date(txn.date).toLocaleDateString()} · {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {txn.paymentMethod === 'online' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              💳 UPI / Online
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              💵 Cash on Delivery
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: '#294a2c' }}>
                          <div>₹{txn.amount}</div>
                          {txn.paymentStatus === 'refunded' && (
                            <div style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 600 }}>
                              -₹{txn.refundAmount || txn.amount} reversed
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                display: 'inline-block',
                                width: 'fit-content',
                                background:
                                  txn.paymentStatus === 'refunded'
                                    ? '#f3e8fd'
                                    : txn.paymentStatus === 'refund_requested'
                                      ? '#fef7e0'
                                      : txn.paymentStatus === 'paid'
                                        ? '#e6f4ea'
                                        : '#fff4eb',
                                color:
                                  txn.paymentStatus === 'refunded'
                                    ? '#6b21a8'
                                    : txn.paymentStatus === 'refund_requested'
                                      ? '#b06000'
                                      : txn.paymentStatus === 'paid'
                                        ? '#137333'
                                        : '#e35c00',
                              }}
                            >
                              {txn.paymentStatus === 'refunded'
                                ? 'REFUNDED ✓'
                                : txn.paymentStatus === 'refund_requested'
                                  ? 'REFUND IN REVIEW ⏳'
                                  : txn.paymentStatus === 'paid'
                                    ? 'PAID ✓'
                                    : 'PENDING'}
                            </span>
                            {txn.refundId && (
                              <span style={{ fontSize: '0.72rem', color: '#6b21a8', fontFamily: 'monospace', fontWeight: 600 }}>
                                {txn.refundId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {matchedOrder && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(matchedOrder)}
                              style={{
                                background: '#f5f5f7',
                                border: '1px solid #dcdce0',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#3d4152',
                              }}
                            >
                              View Bill
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #294a2c, #1f3821)',
                color: '#fff',
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
                  Easy Foods · Official Receipt
                </div>
                <h2 style={{ color: '#fff', margin: '4px 0 0 0', fontSize: '1.4rem' }}>
                  {selectedReceipt.id}
                </h2>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                  {new Date(selectedReceipt.receivedAt).toLocaleDateString()} at{' '}
                  {new Date(selectedReceipt.receivedAt).toLocaleTimeString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#686b78', fontWeight: 600, textTransform: 'uppercase' }}>
                  Customer Details
                </span>
                <div style={{ fontWeight: 600, color: '#294a2c' }}>{selectedReceipt.name}</div>
                <div style={{ fontSize: '0.88rem', color: '#686b78' }}>{selectedReceipt.phone}</div>
                <div style={{ fontSize: '0.85rem', color: '#686b78' }}>{selectedReceipt.address}</div>
              </div>

              <div style={{ borderTop: '1px solid #ececee', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#686b78', fontWeight: 600, textTransform: 'uppercase' }}>
                  Ordered Items
                </span>
                <p style={{ margin: '4px 0', fontSize: '0.92rem', color: '#3d4152' }}>
                  {selectedReceipt.items}
                </p>
                <div style={{ fontSize: '0.82rem', color: '#fc8019' }}>
                  Preferred Slot: {selectedReceipt.deliverySlot}
                </div>
              </div>

              <div style={{ background: '#f9f9fb', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem', color: '#686b78' }}>
                  <span>Payment Method:</span>
                  <strong style={{ color: '#3d4152' }}>
                    {selectedReceipt.paymentMethod === 'online' ? 'Online Payment (Instant)' : 'Cash on Delivery'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem', color: '#686b78' }}>
                  <span>Payment Status:</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        selectedReceipt.paymentStatus === 'refunded'
                          ? '#6b21a8'
                          : selectedReceipt.paymentStatus === 'refund_requested'
                            ? '#b06000'
                            : selectedReceipt.paymentStatus === 'paid'
                              ? '#137333'
                              : '#e35c00',
                    }}
                  >
                    {selectedReceipt.paymentStatus === 'refunded'
                      ? 'REFUNDED ✓'
                      : selectedReceipt.paymentStatus === 'refund_requested'
                        ? 'REFUND REQUESTED ⏳'
                        : selectedReceipt.paymentStatus === 'paid'
                          ? 'PAID ✓'
                          : 'PENDING'}
                  </span>
                </div>

                {selectedReceipt.transactionId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#686b78' }}>
                    <span>Transaction ID:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedReceipt.transactionId}</span>
                  </div>
                )}

                {/* Refund information if applicable */}
                {selectedReceipt.paymentStatus === 'refunded' && (
                  <div style={{ borderTop: '1px dashed #d8b4fe', paddingTop: '0.5rem', marginTop: '0.5rem', background: '#faf5ff', padding: '0.5rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b21a8' }}>
                      <strong>Refund Reference ID:</strong>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedReceipt.refundId || 'REF-PROCESSED'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#7e22ce', marginTop: '2px' }}>
                      <span>Refund Amount:</span>
                      <strong>₹{selectedReceipt.refundAmount || selectedReceipt.amount}</strong>
                    </div>
                    {selectedReceipt.refundReason && (
                      <div style={{ fontSize: '0.78rem', color: '#6b21a8', marginTop: '2px' }}>
                        Reason: {selectedReceipt.refundReason}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #ececee',
                    paddingTop: '0.5rem',
                    marginTop: '0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#294a2c',
                  }}
                >
                  <span>Total Amount:</span>
                  <span>₹{selectedReceipt.amount || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                >
                  🖨️ï¸ Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const activeId = selectedReceipt.id
                    setSelectedReceipt(null)
                    navigate(`/track?orderId=${activeId}&phone=${selectedReceipt.phone}`)
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                >
                  Track Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Refund Request Modal */}
      {refundTargetOrder && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #c2410c, #9a3412)',
                color: '#fff',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
                  Refund / Cancellation Request
                </div>
                <h3 style={{ color: '#fff', margin: '2px 0 0 0', fontSize: '1.25rem' }}>
                  Order {refundTargetOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundTargetOrder(null)}
                disabled={refundLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRefundSubmit} style={{ padding: '1.5rem' }}>
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>Eligible Refund Amount</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#c2410c' }}>
                    ₹{refundTargetOrder.amount || 0}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    background: refundTargetOrder.paymentMethod === 'online' ? '#e6f4ea' : '#f5f5f7',
                    color: refundTargetOrder.paymentMethod === 'online' ? '#137333' : '#3d4152',
                  }}
                >
                  {refundTargetOrder.paymentMethod === 'online' ? 'Online Paid ✓' : 'Cash on Delivery'}
                </span>
              </div>

              {refundMsg && (
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
                  ✓ {refundMsg}
                </div>
              )}

              {refundErr && (
                <div
                  style={{
                    background: '#fce8e6',
                    color: '#c5221f',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontWeight: 500,
                    border: '1px solid #fad2cf',
                  }}
                >
                  {refundErr}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                  Reason for Refund
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      border: '1.5px solid #ececee',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="Damaged / Spoiled Vegetables">Damaged / Spoiled Vegetables (à®•à®¾à®¯à¯à®•à®±à®¿à®•à®³à¯ à®ªà®´à¯à®¤à®Ÿà¯ˆà®¨à¯à®¤à¯à®³à¯à®³à®¤à¯)</option>
                    <option value="Delivery Delayed beyond slot">Delivery Delayed beyond slot (à®Ÿà¯†à®²à®¿à®µà®°à®¿ à®¤à®¾à®®à®¤à®®à¯)</option>
                    <option value="Missing or Wrong Item">Missing or Wrong Item (à®¤à®µà®±à®¾à®© à®ªà¯Šà®°à¯à®³à¯)</option>
                    <option value="Order Cancelled by Customer">Order Cancelled by Customer (à®†à®°à¯à®Ÿà®°à¯ à®°à®¤à¯à®¤à¯)</option>
                    <option value="Quality Concern">Quality / Hygiene Concern (à®¤à®° à®•à¯à®±à¯ˆà®ªà®¾à®Ÿà¯)</option>
                    <option value="Other">Other Reason (à®®à®±à¯à®±à®µà¯ˆ)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                  Refund UPI ID / Reversal Phone
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210@upi or yourname@okaxis"
                    value={refundUpi}
                    onChange={(e) => setRefundUpi(e.target.value)}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      border: '1.5px solid #ececee',
                      fontSize: '0.9rem',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#686b78', fontWeight: 400 }}>
                    We will send the refund directly to this UPI address upon approval.
                  </span>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                  Additional Notes (Optional)
                  <textarea
                    rows={2}
                    placeholder="Details about damaged items, delay time, or special instructions..."
                    value={refundCustomNotes}
                    onChange={(e) => setRefundCustomNotes(e.target.value)}
                    style={{
                      padding: '0.7rem',
                      borderRadius: '8px',
                      border: '1.5px solid #ececee',
                      fontSize: '0.9rem',
                    }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRefundTargetOrder(null)}
                  disabled={refundLoading}
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading || Boolean(refundMsg)}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: '#c2410c',
                    borderColor: '#c2410c',
                  }}
                >
                  {refundLoading ? 'Submitting...' : `Submit Refund (₹${refundTargetOrder.amount || 0})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

