import { FormEvent, useCallback, useEffect, useState } from 'react'
import {
  adminLogin,
  approveOrderRefund,
  createAdminPartner,
  deleteAdminPartner,
  fetchAdminOrders,
  fetchAdminPartners,
  fetchAdminUsers,
  fetchSupportTickets,
  fetchVisitsSummary,
  rejectOrderRefund,
  updateAdminPartner,
  updateOrderStatus,
  updateOrderFollowUp,
  updateTicketStatus,
} from './api'
import { getSocket } from './socket'
import type { AdminOrder, OrderStatus, Partner, SupportTicket, User, VisitsSummary } from './types'
import PasswordInput from './components/PasswordInput'
import { ShieldIcon } from './components/Icons'

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const PARTNER_CATEGORIES = [
  { id: 'All', label: 'All Categories (Super Partner)', icon: '⚡' },
  { id: 'cut_veggies', label: 'Fresh Cut Veggies', icon: '🍏' },
  { id: 'grocery', label: 'Groceries', icon: '🛒' },
  { id: 'cakes', label: 'Cakes & Bakery', icon: '🎂' },
  { id: 'water', label: '20L Water Cans', icon: '💧' },
  { id: 'flowers', label: 'Pooja Flowers', icon: '🌼' },
  { id: 'electricals', label: 'Electricals', icon: '⚡' },
]

const BACKUP_POLL_INTERVAL_MS = 60000

export default function App() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem('zippo_admin_token') || '')
  const [authed, setAuthed] = useState(() => Boolean(sessionStorage.getItem('zippo_admin_token')))
  const [loginError, setLoginError] = useState('')
  const [notification, setNotification] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)

  // Active dashboard tab: 'partners' | 'orders' | 'refunds' | 'tickets' | 'users' | 'traffic'
  const [activeTab, setActiveTab] = useState<'partners' | 'orders' | 'refunds' | 'tickets' | 'users' | 'traffic'>('partners')

  // Data states
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [statuses, setStatuses] = useState<OrderStatus[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [visits, setVisits] = useState<VisitsSummary | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])

  // Partner creation modal state
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false)
  const [newPartnerForm, setNewPartnerForm] = useState({
    name: '',
    phone: '',
    password: '',
    category: 'cakes',
    storeName: '',
    address: 'Anna Nagar, Chennai',
    deliveryTime: '20-25 mins',
    description: '',
    email: '',
  })
  const [partnerSubmitting, setPartnerSubmitting] = useState(false)
  const [partnerActionMsg, setPartnerActionMsg] = useState('')
  const [showPartnerPassword, setShowPartnerPassword] = useState(false)

  // Filters & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [orderStoreFilter, setOrderStoreFilter] = useState<string>('all')
  const [orderSearch, setOrderSearch] = useState<string>('')
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all')
  const [refundFilter, setRefundFilter] = useState<'all' | 'pending' | 'settled'>('all')

  // Order Tracking & Follow-up Modal states
  const [trackingOrder, setTrackingOrder] = useState<AdminOrder | null>(null)
  const [followUpNotesInput, setFollowUpNotesInput] = useState('')
  const [riderNameInput, setRiderNameInput] = useState('')
  const [riderPhoneInput, setRiderPhoneInput] = useState('')
  const [followUpSaving, setFollowUpSaving] = useState(false)

  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadAll = useCallback(
    async (authToken: string, showSpinner = false) => {
      if (showSpinner) setLoading(true)
      try {
        const [ordersData, visitsData, ticketsData, usersData, partnersData] = await Promise.all([
          fetchAdminOrders(authToken).catch(() => ({ orders: [], statuses: [] })),
          fetchVisitsSummary(authToken).catch(() => null),
          fetchSupportTickets(authToken).catch(() => ({ tickets: [] })),
          fetchAdminUsers(authToken).catch(() => ({ users: [] })),
          fetchAdminPartners(authToken).catch(() => ({ partners: [] })),
        ])

        setOrders(ordersData.orders || [])
        setStatuses(ordersData.statuses || [])
        setVisits(visitsData)
        setTickets(ticketsData.tickets || [])
        setUsers(usersData.users || [])
        setPartners(partnersData.partners || [])
        setLastUpdated(new Date())
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : 'Could not load the dashboard.')
        setAuthed(false)
        setToken('')
        sessionStorage.removeItem('zippo_admin_token')
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [],
  )

  // Initial load
  useEffect(() => {
    if (token) {
      loadAll(token, true)
    }
  }, [token, loadAll])

  // Setup Real-time WebSockets via Socket.IO
  useEffect(() => {
    if (!authed || !token) return

    const socket = getSocket()

    function handleConnect() {
      setSocketConnected(true)
      socket.emit('join_admin', { token })
    }

    if (socket.connected) {
      handleConnect()
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', () => setSocketConnected(false))

    // Real-time: customer placed a new order
    socket.on('new_order', (newOrder: AdminOrder) => {
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)])
      setNotification(`🟢 New Order Placed: ${newOrder.id} from ${newOrder.name} (₹${newOrder.amount || 0})`)
      setLastUpdated(new Date())
      setTimeout(() => setNotification(''), 8000)
    })

    // Real-time: order status changed
    socket.on('order_status_updated', ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
      setLastUpdated(new Date())
    })

    // Real-time: customer raised a support ticket
    socket.on('new_ticket', (ticket: SupportTicket) => {
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)])
      setNotification(`🎫 New Support Ticket: ${ticket.id} from ${ticket.name} (${ticket.issueType})`)
      setLastUpdated(new Date())
      setTimeout(() => setNotification(''), 8000)
    })

    // Real-time: refund requested or processed
    socket.on('order_refund_updated', (updatedOrder: AdminOrder) => {
      setOrders((prev) => [updatedOrder, ...prev.filter((o) => o.id !== updatedOrder.id)])
      const msg =
        updatedOrder.paymentStatus === 'refunded'
          ? `💸 Refund Approved: Order ${updatedOrder.id} (${updatedOrder.refundId})`
          : `⏳ Refund Request Received: Order ${updatedOrder.id} from ${updatedOrder.name}`
      setNotification(msg)
      setLastUpdated(new Date())
      setTimeout(() => setNotification(''), 8000)
    })

    // Real-time: new visitor activity
    socket.on('new_visit', (visit: { path: string; visitedAt: string }) => {
      setVisits((prev) => {
        if (!prev) return prev
        return {
          total: prev.total + 1,
          today: prev.today + 1,
          recent: [visit, ...prev.recent.slice(0, 19)],
        }
      })
    })

    // Real-time: partner updates
    socket.on('partners_updated', (updatedPartners: any[]) => {
      if (Array.isArray(updatedPartners)) {
        setPartners(updatedPartners)
      }
    })
    socket.on('partner_deleted', ({ partnerId }: { partnerId: string }) => {
      setPartners((prev) => prev.filter((p) => p.id !== partnerId))
    })

    // Gentle fallback periodic sync
    const interval = setInterval(() => loadAll(token), BACKUP_POLL_INTERVAL_MS)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('new_order')
      socket.off('order_status_updated')
      socket.off('order_refund_updated')
      socket.off('new_ticket')
      socket.off('new_visit')
      socket.off('partners_updated')
      socket.off('partner_deleted')
      clearInterval(interval)
    }
  }, [authed, token, loadAll])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    setLoading(true)

    const result = await adminLogin(password)
    setLoading(false)

    if (!result.ok || !result.token) {
      setLoginError(result.error || 'Incorrect admin password.')
      return
    }

    sessionStorage.setItem('zippo_admin_token', result.token)
    setToken(result.token)
    setAuthed(true)
    setPassword('')
    await loadAll(result.token, true)
  }

  function handleLogout() {
    sessionStorage.removeItem('zippo_admin_token')
    setToken('')
    setAuthed(false)
    setOrders([])
    setTickets([])
    setUsers([])
    setVisits(null)
    setPartners([])
  }

  async function handleCreatePartner(e: FormEvent) {
    e.preventDefault()
    setPartnerSubmitting(true)
    setPartnerActionMsg('')
    try {
      const res = await createAdminPartner(token, newPartnerForm)
      setPartners((prev) => [res.partner, ...prev])
      setShowAddPartnerModal(false)
      setNewPartnerForm({
        name: '',
        phone: '',
        password: '',
        category: 'cakes',
        storeName: '',
        address: 'Anna Nagar, Chennai',
        deliveryTime: '20-25 mins',
        description: '',
        email: '',
      })
      setPartnerActionMsg(`✅ Partner "${res.partner.name}" created successfully!`)
      setTimeout(() => setPartnerActionMsg(''), 6000)
    } catch (err: any) {
      alert(err.message || 'Could not create partner.')
    } finally {
      setPartnerSubmitting(false)
    }
  }

  async function handleTogglePartnerStatus(partnerId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await updateAdminPartner(token, partnerId, { status: nextStatus as any })
      setPartners((prev) => prev.map((p) => (p.id === partnerId ? { ...p, status: nextStatus as any } : p)))
    } catch (err: any) {
      alert(err.message || 'Failed to update partner.')
    }
  }

  async function handleDeletePartner(partnerId: string, partnerName: string) {
    if (!confirm(`Are you sure you want to remove partner "${partnerName}"?`)) return
    try {
      await deleteAdminPartner(token, partnerId)
      setPartners((prev) => prev.filter((p) => p.id !== partnerId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete partner.')
    }
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(token, orderId, status)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    } catch {
      alert('Failed to update status. Please try again.')
    }
  }

  async function handleApproveRefund(orderId: string) {
    if (!confirm(`Are you sure you want to approve the refund for Order ${orderId}? This will generate an official Refund ID (REF-XXXX), update payment status to 'refunded', and push live update to the customer.`)) {
      return
    }
    try {
      const res = await approveOrderRefund(token, orderId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...res.order } : o)))
      setNotification(`✓ Refund approved successfully for ${orderId}: ${res.order.refundId || ''}`)
      setTimeout(() => setNotification(''), 8000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not approve refund.')
    }
  }

  async function handleRejectRefund(orderId: string) {
    const reason = prompt('Please enter the reason for rejecting this refund request:', 'Items were delivered fresh and verified by courier')
    if (!reason) return
    try {
      const res = await rejectOrderRefund(token, orderId, reason)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...res.order } : o)))
      setNotification(`✕ Refund request rejected for ${orderId}`)
      setTimeout(() => setNotification(''), 8000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not reject refund.')
    }
  }

  async function handleToggleTicketStatus(ticketId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'resolved' ? 'open' : 'resolved'
    try {
      await updateTicketStatus(token, ticketId, nextStatus)
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t)))
    } catch {
      alert('Failed to update ticket status.')
    }
  }

  function handleOpenTracking(ord: AdminOrder) {
    setTrackingOrder(ord)
    setFollowUpNotesInput(ord.followUpNotes || '')
    setRiderNameInput(ord.riderName || '')
    setRiderPhoneInput(ord.riderPhone || '')
  }

  async function handleSaveFollowUp(nextStatus?: OrderStatus) {
    if (!trackingOrder) return
    setFollowUpSaving(true)
    try {
      const res = await updateOrderFollowUp(token, trackingOrder.id, {
        status: nextStatus || trackingOrder.status,
        followUpNotes: followUpNotesInput,
        riderName: riderNameInput,
        riderPhone: riderPhoneInput,
        partnerStoreName: trackingOrder.partnerStoreName,
      })
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === trackingOrder.id ? res.order : o)))
        setTrackingOrder(res.order)
        setNotification(`✓ Follow-up updated for Order #${trackingOrder.id}!`)
        setTimeout(() => setNotification(''), 4000)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update follow-up')
    } finally {
      setFollowUpSaving(false)
    }
  }

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter = orderStatusFilter === 'all' || o.status === orderStatusFilter
    const matchesStore = orderStoreFilter === 'all' || (o.partnerStoreName && o.partnerStoreName.toLowerCase().includes(orderStoreFilter.toLowerCase()))
    const term = orderSearch.trim().toLowerCase()
    const matchesSearch =
      !term ||
      o.id.toLowerCase().includes(term) ||
      o.name.toLowerCase().includes(term) ||
      o.phone.includes(term) ||
      (o.partnerStoreName && o.partnerStoreName.toLowerCase().includes(term)) ||
      (o.items && o.items.toLowerCase().includes(term)) ||
      (o.transactionId && o.transactionId.toLowerCase().includes(term))
    return matchesFilter && matchesStore && matchesSearch
  })

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (ticketStatusFilter === 'all') return true
    return t.status === ticketStatusFilter
  })

  const openTicketsCount = tickets.filter((t) => t.status === 'open').length
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0)

  // Refund analytics & filtering
  const refundRequests = orders.filter(
    (o) => o.paymentStatus === 'refund_requested' || o.paymentStatus === 'refunded' || Boolean(o.refundReason)
  )
  const pendingRefundsCount = orders.filter((o) => o.paymentStatus === 'refund_requested').length
  const settledRefundsCount = orders.filter((o) => o.paymentStatus === 'refunded').length

  const filteredRefunds = refundRequests.filter((r) => {
    if (refundFilter === 'pending') return r.paymentStatus === 'refund_requested'
    if (refundFilter === 'settled') return r.paymentStatus === 'refunded'
    return true
  })

  // STANDALONE LOGIN SCREEN
  if (!authed) {
    return (
      <div className="admin-login-fullscreen">
        <div className="admin-login-card">
          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', color: '#294a2c' }}><ShieldIcon size={42} /></div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.3rem', color: '#1b4332' }}>Zippo</h1>
          <p style={{ fontWeight: 700, color: 'var(--carrot-dark)', margin: '0 0 0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Standalone Admin Portal
          </p>
          <p style={{ color: '#5f6368', fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
            Back-office operations for order fulfillment, customer support tickets, and system analytics.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>
              Admin Security Password
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </label>

            <div
              style={{
                fontSize: '0.8rem',
                color: '#5f6368',
                background: '#f8f9fa',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
              }}
            >
              🔑 <strong>Admin Password:</strong> <code>admin123</code> (defined in <code>backend/.env</code>)
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Admin Portal'}
            </button>

            {loginError && (
              <p style={{ color: '#c5221f', background: '#fce8e6', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
                {loginError}
              </p>
            )}
          </form>

          <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            <a href="http://localhost:5173" style={{ color: 'var(--leaf-deep)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
              🌐 Open Customer Storefront (port 5173) ➔
            </a>
          </div>
        </div>
      </div>
    )
  }

  // STANDALONE ADMIN PORTAL DASHBOARD
  return (
    <div className="admin-portal-app">
      {/* Standalone Admin Header */}
      <header className="admin-portal-header">
        <div className="admin-portal-header-inner">
          <div className="admin-portal-brand">
            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#1b4332' }}><ShieldIcon size={20} /></span>
            <span>Zippo</span>
            <span className="admin-portal-badge">Admin Portal</span>
          </div>

          <div className="admin-status-indicators">
            <span
              className={`admin-pill-badge ${socketConnected ? 'admin-pill-online' : 'admin-pill-connecting'}`}
              style={{ background: socketConnected ? '#2d6a4f' : '#b06000', color: '#ffffff', borderColor: 'transparent' }}
            >
              {socketConnected ? '🟢 Live Push Active' : '🟡 Socket Connecting...'}
            </span>
            <span
              className="admin-pill-badge"
              style={{ background: '#084298', color: '#cfe2ff', borderColor: 'transparent' }}
            >
              🍃 MongoDB Engine Connected
            </span>
          </div>

          <div className="admin-portal-nav-right">
            <a href="http://localhost:5173" className="admin-view-store-btn" title="Open customer website in new tab" target="_blank" rel="noopener noreferrer">
              🌐 View Storefront ↗
            </a>
            <button type="button" className="admin-portal-logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="admin-portal-body">
        {/* Real-time Notification Banner */}
        {notification && (
          <div
            style={{
              background: '#e6f4ea',
              color: '#137333',
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontWeight: 600,
              border: '1px solid #ceead6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{notification}</span>
            <button
              onClick={() => setNotification('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#137333' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Top Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1b4332' }}>Operations Dashboard</h1>
            <p style={{ margin: '0.2rem 0 0', color: '#5f6368', fontSize: '0.9rem' }}>
              Real-time orders, customer support tickets, MongoDB customer accounts, and traffic monitoring.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastUpdated && (
              <span className="admin-subtext" style={{ fontSize: '0.82rem' }}>
                Synced: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <a
              href="http://localhost:5173/partner"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
              }}
            >
              🚀 Launch Partner Dashboard ↗
            </a>
            <button className="btn btn-ghost" onClick={() => loadAll(token, true)} disabled={loading} style={{ padding: '0.45rem 0.9rem', fontSize: '0.88rem' }}>
              {loading ? 'Refreshing...' : '↻ Refresh Data'}
            </button>
          </div>
        </div>

        {/* Key Metrics Overview Cards */}
        <div className="admin-metric-grid">
          <div className="admin-metric-card">
            <div className="admin-metric-num" style={{ color: '#ea580c' }}>{partners.length}</div>
            <div className="admin-metric-title">Category Partners</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num">{orders.length}</div>
            <div className="admin-metric-title">Total Orders</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num" style={{ color: '#0f5132' }}>₹{totalRevenue}</div>
            <div className="admin-metric-title">Revenue Generated</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num" style={{ color: pendingRefundsCount > 0 ? '#c2410c' : '#294a2c' }}>
              {pendingRefundsCount}
            </div>
            <div className="admin-metric-title">Refunds Pending</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num" style={{ color: openTicketsCount > 0 ? '#c2410c' : 'var(--leaf-deep)' }}>
              {openTicketsCount}
            </div>
            <div className="admin-metric-title">Open Tickets</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num">{users.length}</div>
            <div className="admin-metric-title">Customers</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num">{visits ? visits.today : 0}</div>
            <div className="admin-metric-title">Visits Today</div>
          </div>
        </div>

        {/* Tabs Switcher */}
        <div className="admin-tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'partners' ? 'active' : ''}`}
            onClick={() => setActiveTab('partners')}
          >
            <span>👨‍💼 Partners &amp; Vendors</span>
            <span className="admin-tab-count" style={{ background: '#ea580c', color: '#fff' }}>{partners.length}</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>📦 Orders (Oversight)</span>
            <span className="admin-tab-count">{orders.length}</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'refunds' ? 'active' : ''}`}
            onClick={() => setActiveTab('refunds')}
          >
            <span>💸 Refunds &amp; Returns</span>
            {pendingRefundsCount > 0 ? (
              <span className="admin-tab-count" style={{ background: '#c2410c', color: '#fff' }}>
                {pendingRefundsCount} pending
              </span>
            ) : (
              <span className="admin-tab-count">{refundRequests.length}</span>
            )}
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <span>🎫 Support Desk</span>
            {openTicketsCount > 0 ? (
              <span className="admin-tab-count" style={{ background: '#e35c00', color: '#fff' }}>
                {openTicketsCount} open
              </span>
            ) : (
              <span className="admin-tab-count">{tickets.length}</span>
            )}
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span>👥 Customer Accounts</span>
            <span className="admin-tab-count">{users.length}</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'traffic' ? 'active' : ''}`}
            onClick={() => setActiveTab('traffic')}
          >
            <span>📈 Traffic &amp; Analytics</span>
            {visits && <span className="admin-tab-count">{visits.today} today</span>}
          </button>
        </div>

        {/* TAB 0: PARTNERS & VENDORS */}
        {activeTab === 'partners' && (
          <div>
            {partnerActionMsg && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534', padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.25rem', fontWeight: 700 }}>
                {partnerActionMsg}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', color: '#0f172a' }}>
                  Category Partners &amp; Store Vendors
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  Admin creates partners by category. Each partner receives, prepares, and dispatches orders for their assigned category in their own dashboard.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href="http://localhost:5173/partner"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#fff7ed',
                    color: '#ea580c',
                    border: '1.5px solid #fed7aa',
                    padding: '0.55rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  🏪 Test Partner Portal ↗
                </a>

                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(true)}
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                  }}
                >
                  + Create New Partner
                </button>
              </div>
            </div>

            {/* Create Partner Modal Form */}
            {showAddPartnerModal && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '2px solid #ea580c', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 10px 25px rgba(234, 88, 12, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>➕ Onboard New Category Partner</h4>
                  <button onClick={() => setShowAddPartnerModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <form onSubmit={handleCreatePartner} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#0f172a' }}>
                      🏪 Store / Restaurant / Bakery Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nila Bakery (நிலா பேக்கரி) / Velvet Oven Bakes"
                      value={newPartnerForm.storeName}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, storeName: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1.5px solid #ea580c', fontSize: '0.95rem', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      👤 Partner / Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Karthik / Velan"
                      value={newPartnerForm.name}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, name: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      🏷️ Business Category *
                    </label>
                    <select
                      value={newPartnerForm.category}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, category: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#fff' }}
                    >
                      {PARTNER_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      📞 Mobile Phone (Partner Login ID) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={newPartnerForm.phone}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      🔒 Partner Password *
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPartnerPassword ? 'text' : 'password'}
                        required
                        placeholder="Password for partner dashboard login"
                        value={newPartnerForm.password}
                        onChange={(e) => setNewPartnerForm({ ...newPartnerForm, password: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPartnerPassword((prev) => !prev)}
                        title={showPartnerPassword ? 'Hide password' : 'Show password'}
                        aria-label={showPartnerPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px',
                        }}
                      >
                        {showPartnerPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      📍 Store Area &amp; Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anna Nagar, Chennai"
                      value={newPartnerForm.address}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, address: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      ⏱️ Estimated Delivery Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20-25 mins"
                      value={newPartnerForm.deliveryTime}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, deliveryTime: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                      📝 Store Tagline / Specialty Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Artisan molten brownies, custom celebration cakes &amp; pastries"
                      value={newPartnerForm.description}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, description: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddPartnerModal(false)}
                      style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={partnerSubmitting}
                      style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', backgroundColor: '#ea580c', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {partnerSubmitting ? 'Onboarding Store…' : 'Save & Onboard Store'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Partners Table */}
            {partners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <p style={{ margin: 0, color: '#64748b' }}>No partners onboarded yet. Click "+ Create New Partner" above.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Partner Name &amp; Store</th>
                      <th>Login Phone</th>
                      <th>Assigned Category</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p) => {
                      const catInfo = PARTNER_CATEGORIES.find((c) => c.id === p.category) || { label: p.category, icon: '📦' }
                      const isActive = p.status === 'active'

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>🏪 {p.storeName || p.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>👤 Owner: {p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {p.id} • ⭐ {p.rating || 4.8} • ⏱️ {p.deliveryTime || '20-25 mins'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>📞 {p.phone}</div>
                            <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Password: partner123</div>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '999px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                            }}>
                              <span>{catInfo.icon}</span>
                              <span>{catInfo.label}</span>
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>{p.address || 'Chennai Central'}</div>
                          </td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
                              color: isActive ? '#15803d' : '#b91c1c',
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                onClick={() => handleTogglePartnerStatus(p.id, p.status)}
                                style={{
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#fff',
                                }}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeletePartner(p.id, p.name)}
                                style={{
                                  padding: '0.3rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fff1f2',
                                  color: '#b91c1c',
                                }}
                              >
                                Delete
                              </button>
                            </div>
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

        {/* TAB 1: ORDERS (OVERSIGHT) */}
        {activeTab === 'orders' && (
          <div>
            {/* Partner Notice Banner */}
            <div style={{
              backgroundColor: '#fff7ed',
              border: '1.5px solid #fed7aa',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div>
                <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '0.95rem' }}>
                  ℹ️ Order Receiving &amp; Fulfillment Module is managed by Partners!
                </div>
                <div style={{ fontSize: '0.85rem', color: '#c2410c', marginTop: '0.2rem' }}>
                  Category Partners receive customer orders directly and manage preparation, packing, and dispatch from their dedicated Partner Dashboard.
                </div>
              </div>
              <a
                href="http://localhost:5175"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.2)',
                }}
              >
                Open Dedicated Partner Dashboard (5175) ↗
              </a>
            </div>

            <div className="admin-filter-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div className="admin-filter-group">
                  {['all', 'received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
                    <button
                      key={s}
                      className={`admin-filter-chip ${orderStatusFilter === s ? 'active' : ''}`}
                      onClick={() => setOrderStatusFilter(s)}
                    >
                      {s === 'all' ? 'All Orders' : STATUS_LABELS[s] || s}
                      {s === 'all'
                        ? ` (${orders.length})`
                        : ` (${orders.filter((o) => o.status === s).length})`}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search by ID, customer, phone, store, txn..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  style={{ minWidth: '240px' }}
                />
              </div>

              {/* Partner Store Quick Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginRight: '4px' }}>
                  🏪 Outlet Filter:
                </span>
                {['all', 'Nila Bakery', 'City Mart Essentials', 'Green Farm Depot', 'Bisleri Pure Springs'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStoreFilter(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: orderStoreFilter === st ? '#059669' : '#cbd5e1',
                      background: orderStoreFilter === st ? '#059669' : '#ffffff',
                      color: orderStoreFilter === st ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {st === 'all' ? 'All Stores' : st === 'Nila Bakery' ? '🎂 Nila Bakery (Velan)' : st === 'City Mart Essentials' ? '🛒 City Mart' : st === 'Green Farm Depot' ? '🥗 Green Farm' : '💧 Bisleri Water'}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontWeight: 600, fontSize: '1rem' }}>No orders found matching this filter.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Details</th>
                      <th>Items Ordered</th>
                      <th>Fulfilling Store (Partner)</th>
                      <th>Slot &amp; Address</th>
                      <th>Payment &amp; Value</th>
                      <th>Status (Live)</th>
                      <th style={{ textAlign: 'center' }}>Live Tracking &amp; Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong style={{ color: 'var(--leaf-deep)', fontSize: '0.95rem' }}>{order.id}</strong>
                          <div className="admin-subtext">{new Date(order.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.name}</div>
                          <div className="admin-subtext">{order.phone}</div>
                          {order.email && <div className="admin-subtext">{order.email}</div>}
                        </td>
                        <td>
                          <div style={{ maxWidth: 220, whiteSpace: 'normal', fontSize: '0.88rem' }}>
                            {order.items}
                          </div>
                          {order.notes && (
                            <div style={{ fontSize: '0.78rem', color: '#c2410c', fontStyle: 'italic', marginTop: 4 }}>
                              Note: {order.notes}
                            </div>
                          )}
                          {order.refundReason && (
                            <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: 4, background: '#fff7ed', padding: '2px 6px', borderRadius: '4px' }}>
                              Refund Note: {order.refundReason}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#047857' }}>
                              🏪 {order.partnerStoreName || 'Nila Bakery'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                            👤 {order.partnerName || 'Velan'} • 📞 {order.partnerPhone || '9750740587'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.deliverySlot}</div>
                          <div className="admin-subtext" style={{ maxWidth: 180, whiteSpace: 'normal' }}>
                            {order.address}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                width: 'fit-content',
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
                                ? `Refunded (${order.refundId || 'REF'}) ✓`
                                : order.paymentStatus === 'refund_requested'
                                  ? 'Refund Requested ⏳'
                                  : order.paymentMethod === 'online'
                                    ? 'Online (Paid) ✓'
                                    : 'Cash on Delivery'}
                            </span>
                            {order.amount ? <strong style={{ fontSize: '0.95rem' }}>₹{order.amount}</strong> : null}
                            {order.transactionId && (
                              <span style={{ fontSize: '0.72rem', color: '#686b78', fontFamily: 'monospace' }}>
                                {order.transactionId}
                              </span>
                            )}
                            {order.paymentStatus === 'refund_requested' && (
                              <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveRefund(order.id)}
                                  style={{
                                    background: '#137333',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectRefund(order.id)}
                                  style={{
                                    background: '#c5221f',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            )}
                            {order.paymentStatus === 'paid' && order.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleApproveRefund(order.id)}
                                style={{
                                  background: '#fdf4ff',
                                  border: '1px solid #d8b4fe',
                                  color: '#6b21a8',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  width: 'fit-content',
                                  marginTop: '2px',
                                }}
                              >
                                💸 Issue Refund
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            style={{
                              fontWeight: 600,
                              color: 'var(--leaf-deep)',
                              borderColor: 'var(--leaf-deep)',
                            }}
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s] || s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenTracking(order)}
                            style={{
                              background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                              transition: 'transform 0.15s',
                            }}
                          >
                            🔍 Track &amp; Follow Up
                          </button>
                          {order.riderName && (
                            <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '4px', fontWeight: 600 }}>
                              🛵 Rider: {order.riderName}
                            </div>
                          )}
                          {order.followUpNotes && (
                            <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.followUpNotes}>
                              💬 "{order.followUpNotes}"
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: REFUNDS & CANCELLATIONS */}
        {activeTab === 'refunds' && (
          <div>
            <div className="admin-filter-bar">
              <div className="admin-filter-group">
                <button
                  className={`admin-filter-chip ${refundFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRefundFilter('all')}
                >
                  All ({refundRequests.length})
                </button>
                <button
                  className={`admin-filter-chip ${refundFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setRefundFilter('pending')}
                >
                  Pending Action ({pendingRefundsCount})
                </button>
                <button
                  className={`admin-filter-chip ${refundFilter === 'settled' ? 'active' : ''}`}
                  onClick={() => setRefundFilter('settled')}
                >
                  Settled / Refunded ({settledRefundsCount})
                </button>
              </div>
            </div>

            {filteredRefunds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontWeight: 600, fontSize: '1rem' }}>
                  No refund or cancellation requests in this filter.
                </p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID &amp; Time</th>
                      <th>Customer &amp; UPI Destination</th>
                      <th>Refund Reason</th>
                      <th>Items Ordered</th>
                      <th>Amount</th>
                      <th>Refund Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRefunds.map((refund) => (
                      <tr key={refund.id}>
                        <td>
                          <strong style={{ color: 'var(--leaf-deep)', fontSize: '0.95rem' }}>{refund.id}</strong>
                          <div className="admin-subtext">
                            {new Date(refund.receivedAt).toLocaleDateString()} Â·{' '}
                            {new Date(refund.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{refund.name}</div>
                          <div className="admin-subtext">{refund.phone}</div>
                          {refund.refundUpi && (
                            <div style={{ fontSize: '0.78rem', color: '#1a73e8', fontWeight: 600, marginTop: '2px' }}>
                              UPI: {refund.refundUpi}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ maxWidth: 240, whiteSpace: 'normal', fontSize: '0.88rem', color: '#9a3412', fontWeight: 500 }}>
                            {refund.refundReason || 'Customer requested return'}
                          </div>
                          {refund.refundRequestedAt && (
                            <div className="admin-subtext" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              Requested: {new Date(refund.refundRequestedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ maxWidth: 220, whiteSpace: 'normal', fontSize: '0.85rem' }}>
                            {refund.items}
                          </div>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1.05rem', color: '#c2410c' }}>
                            ₹{refund.refundAmount || refund.amount || 0}
                          </strong>
                          <div className="admin-subtext" style={{ fontSize: '0.75rem' }}>
                            Orig: ₹{refund.amount} ({refund.paymentMethod})
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'inline-block',
                                width: 'fit-content',
                                background: refund.paymentStatus === 'refunded' ? '#f3e8fd' : '#fef7e0',
                                color: refund.paymentStatus === 'refunded' ? '#6b21a8' : '#b06000',
                              }}
                            >
                              {refund.paymentStatus === 'refunded' ? 'SETTLED ✓' : 'PENDING REVIEW ⏳'}
                            </span>
                            {refund.refundId && (
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#6b21a8' }}>
                                {refund.refundId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {refund.paymentStatus === 'refund_requested' ? (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handleApproveRefund(refund.id)}
                                style={{
                                  background: '#137333',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ✓ Approve &amp; Issue REF-ID
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRefund(refund.id)}
                                style={{
                                  background: '#c5221f',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          ) : refund.paymentStatus === 'refunded' ? (
                            <span style={{ fontSize: '0.8rem', color: '#137333', fontWeight: 600 }}>
                              ✓ Completed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApproveRefund(refund.id)}
                              style={{
                                background: '#fdf4ff',
                                border: '1px solid #d8b4fe',
                                color: '#6b21a8',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              💸 Approve Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUPPORT DESK */}
        {activeTab === 'tickets' && (
          <div>
            <div className="admin-filter-bar">
              <div className="admin-filter-group">
                <button
                  className={`admin-filter-chip ${ticketStatusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTicketStatusFilter('all')}
                >
                  All Tickets ({tickets.length})
                </button>
                <button
                  className={`admin-filter-chip ${ticketStatusFilter === 'open' ? 'active' : ''}`}
                  onClick={() => setTicketStatusFilter('open')}
                >
                  Open ({tickets.filter((t) => t.status === 'open').length})
                </button>
                <button
                  className={`admin-filter-chip ${ticketStatusFilter === 'resolved' ? 'active' : ''}`}
                  onClick={() => setTicketStatusFilter('resolved')}
                >
                  Resolved ({tickets.filter((t) => t.status === 'resolved').length})
                </button>
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontWeight: 600 }}>No support tickets found.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Customer</th>
                      <th>Issue &amp; Order</th>
                      <th>Customer Message</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <strong style={{ color: 'var(--leaf-deep)' }}>{ticket.id}</strong>
                          <div className="admin-subtext">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ticket.name}</div>
                          <div className="admin-subtext">{ticket.phone}</div>
                          {ticket.email && <div className="admin-subtext">{ticket.email}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--carrot-dark)' }}>{ticket.issueType}</div>
                          {ticket.orderId ? (
                            <div className="admin-subtext">Order: <strong>{ticket.orderId}</strong></div>
                          ) : (
                            <div className="admin-subtext">General enquiry</div>
                          )}
                        </td>
                        <td>
                          <div style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: '0.88rem' }}>
                            {ticket.message}
                          </div>
                        </td>
                        <td>
                          <span className={ticket.status === 'resolved' ? 'ticket-status-resolved' : 'ticket-status-open'}>
                            {ticket.status === 'resolved' ? 'Resolved ✓' : 'Open'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-action-btn ${ticket.status === 'open' ? 'admin-action-resolve' : ''}`}
                            onClick={() => handleToggleTicketStatus(ticket.id, ticket.status)}
                          >
                            {ticket.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'users' && (
          <div>
            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontWeight: 600 }}>No registered customer accounts in database yet.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td><code style={{ fontSize: '0.85rem' }}>{u.id}</code></td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.phone}</td>
                        <td>{u.email || '—'}</td>
                        <td>
                          <span className="nav-role-badge">
                            {u.role || 'customer'}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRAFFIC & VISITS */}
        {activeTab === 'traffic' && visits && (
          <div>
            <div className="visits-panel" style={{ marginBottom: '1.5rem', background: '#ffffff', border: '1px solid var(--line)', borderRadius: '10px' }}>
              <div className="visits-stat">
                <span className="visits-stat-value">{visits.today}</span>
                <span className="visits-stat-label">site visits today</span>
              </div>
              <div className="visits-stat">
                <span className="visits-stat-value">{visits.total}</span>
                <span className="visits-stat-label">total visits recorded</span>
              </div>
              <div className="visits-recent">
                <span className="footer-heading" style={{ color: 'var(--ink)', fontWeight: 700 }}>Recent Site Activity (Real-time Live)</span>
                {visits.recent.length === 0 ? (
                  <p className="admin-subtext">No visits logged yet.</p>
                ) : (
                  <ul className="visits-list">
                    {visits.recent.slice(0, 10).map((v, i) => (
                      <li key={i}>
                        <span className="visits-path">{v.path}</span>
                        <span className="admin-subtext">{new Date(v.visitedAt).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: ORDER LIVE TRACKING & FOLLOW-UP                        */}
        {/* ============================================================== */}
        {trackingOrder && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
            onClick={() => setTrackingOrder(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '740px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid #e2e8f0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      📦 Live Order Tracking &amp; Follow-up
                    </span>
                    <span style={{ background: '#059669', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800 }}>
                      #{trackingOrder.id}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Placed at {new Date(trackingOrder.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })} • Value: ₹{trackingOrder.amount || 0} ({trackingOrder.paymentMethod === 'online' ? 'Paid Online' : 'Cash on Delivery'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem' }}>
                {/* PARTNER STORE BANNER WITH ONE-CLICK CALL */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                      🏪 Assigned Merchant Partner Store
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                      {trackingOrder.partnerStoreName || 'Nila Bakery'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '2px' }}>
                      Owner: <b>{trackingOrder.partnerName || 'Velan'}</b> • Contact: <b>{trackingOrder.partnerPhone || '9750740587'}</b>
                    </div>
                  </div>
                  <a
                    href={`tel:${trackingOrder.partnerPhone || '9750740587'}`}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    📞 Call Partner Store
                  </a>
                </div>

                {/* SWIGGY STYLE 5-STEP VISUAL TIMELINE */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    📍 Live Stepper Timeline
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                    {[
                      { key: 'received', step: '1', title: 'Order Placed', icon: '🛒' },
                      { key: 'confirmed', step: '2', title: 'Store Accepted', icon: '🏪' },
                      { key: 'preparing', step: '3', title: 'Preparing', icon: '🧑‍🍳' },
                      { key: 'out_for_delivery', step: '4', title: 'Dispatched', icon: '🛵' },
                      { key: 'delivered', step: '5', title: 'Delivered', icon: '🎉' },
                    ].map((st, i) => {
                      const stepIdx = ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'].indexOf(trackingOrder.status)
                      const isCompleted = stepIdx >= i
                      const isCurrent = trackingOrder.status === st.key
                      return (
                        <div
                          key={st.key}
                          style={{
                            background: isCurrent ? '#059669' : isCompleted ? '#ecfdf5' : '#f8fafc',
                            border: '1.5px solid',
                            borderColor: isCurrent ? '#059669' : isCompleted ? '#a7f3d0' : '#e2e8f0',
                            borderRadius: '10px',
                            padding: '10px 8px',
                            textAlign: 'center',
                            color: isCurrent ? '#ffffff' : isCompleted ? '#065f46' : '#64748b',
                          }}
                        >
                          <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{st.icon}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{st.title}</div>
                          <div style={{ fontSize: '0.68rem', marginTop: '2px', opacity: 0.9 }}>
                            {isCurrent ? '● IN PROGRESS' : isCompleted ? '✓ Done' : 'Pending'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* QUICK PIPELINE ADVANCE BUTTONS */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                    ⚡ Instant Status Follow-up Actions:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((stKey) => (
                      <button
                        key={stKey}
                        type="button"
                        disabled={followUpSaving || trackingOrder.status === stKey}
                        onClick={() => handleSaveFollowUp(stKey as OrderStatus)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: trackingOrder.status === stKey ? '#059669' : '#cbd5e1',
                          background: trackingOrder.status === stKey ? '#059669' : '#ffffff',
                          color: trackingOrder.status === stKey ? '#ffffff' : '#1e293b',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: trackingOrder.status === stKey ? 'default' : 'pointer',
                        }}
                      >
                        {stKey === 'confirmed' ? '✓ Accept / Confirm' : stKey === 'preparing' ? '🧑‍🍳 Mark Preparing' : stKey === 'out_for_delivery' ? '🛵 Mark Dispatched' : stKey === 'delivered' ? '🎉 Mark Delivered' : '✕ Cancel'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUSTOMER & RIDER CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Customer Info */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Customer Details
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '4px', color: '#0f172a' }}>
                      {trackingOrder.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                      📞 {trackingOrder.phone}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                      📍 <b>Address:</b> {trackingOrder.address}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                      ⏱ <b>Slot:</b> {trackingOrder.deliverySlot}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <a
                        href={`tel:${trackingOrder.phone}`}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        📞 Call Customer
                      </a>
                      <a
                        href={`https://wa.me/91${trackingOrder.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Rider Assignment */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Delivery Rider Assignment
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                        Rider Name
                      </label>
                      <input
                        type="text"
                        value={riderNameInput}
                        onChange={(e) => setRiderNameInput(e.target.value)}
                        placeholder="e.g. Karthik (Zippo Rider)"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                        Rider Phone Number
                      </label>
                      <input
                        type="tel"
                        value={riderPhoneInput}
                        onChange={(e) => setRiderPhoneInput(e.target.value)}
                        placeholder="e.g. 9840123456"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    {riderPhoneInput && (
                      <a
                        href={`tel:${riderPhoneInput}`}
                        style={{
                          marginTop: '8px',
                          background: '#0284c7',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-block',
                        }}
                      >
                        📞 Call Rider ({riderNameInput || 'Assigned'})
                      </a>
                    )}
                  </div>
                </div>

                {/* Ordered Items List */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Items in this Order
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>
                    {trackingOrder.items}
                  </div>
                  {trackingOrder.notes && (
                    <div style={{ fontSize: '0.8rem', color: '#c2410c', marginTop: '4px', fontStyle: 'italic' }}>
                      Customer Note: "{trackingOrder.notes}"
                    </div>
                  )}
                </div>

                {/* ADMIN FOLLOW-UP NOTES LOG */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    📝 Admin Follow-up Activity Log &amp; Notes
                  </label>
                  <textarea
                    rows={3}
                    value={followUpNotesInput}
                    onChange={(e) => setFollowUpNotesInput(e.target.value)}
                    placeholder="e.g. Called Velan at Nila Bakery - brownie & cake ready for pickup. Rider dispatched..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={followUpSaving}
                  onClick={() => handleSaveFollowUp()}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  {followUpSaving ? 'Saving...' : '💾 Save Follow-up Updates'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

