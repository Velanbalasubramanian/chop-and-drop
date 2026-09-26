import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminLogin,
  fetchAdminOrders,
  fetchAdminUsers,
  fetchSupportTickets,
  fetchVisitsSummary,
  updateOrderStatus,
  updateTicketStatus,
} from '../api'
import { getSocket } from '../socket'
import type { AdminOrder, OrderStatus, SupportTicket, User, VisitsSummary } from '../types'
import PasswordInput from '../components/PasswordInput'

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
}

const BACKUP_POLL_INTERVAL_MS = 60000

export default function Admin() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem('chop_drop_admin_token') || '')
  const [authed, setAuthed] = useState(() => Boolean(sessionStorage.getItem('chop_drop_admin_token')))
  const [loginError, setLoginError] = useState('')
  const [notification, setNotification] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)

  // Active dashboard tab: 'orders' | 'tickets' | 'users' | 'traffic'
  const [activeTab, setActiveTab] = useState<'orders' | 'tickets' | 'users' | 'traffic'>('orders')

  // Data states
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [statuses, setStatuses] = useState<OrderStatus[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [visits, setVisits] = useState<VisitsSummary | null>(null)

  // Filters & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [orderSearch, setOrderSearch] = useState<string>('')
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all')

  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadAll = useCallback(
    async (authToken: string, showSpinner = false) => {
      if (showSpinner) setLoading(true)
      try {
        const [ordersData, visitsData, ticketsData, usersData] = await Promise.all([
          fetchAdminOrders(authToken).catch(() => ({ orders: [], statuses: [] })),
          fetchVisitsSummary(authToken).catch(() => null),
          fetchSupportTickets(authToken).catch(() => ({ tickets: [] })),
          fetchAdminUsers(authToken).catch(() => ({ users: [] })),
        ])

        setOrders(ordersData.orders || [])
        setStatuses(ordersData.statuses || [])
        setVisits(visitsData)
        setTickets(ticketsData.tickets || [])
        setUsers(usersData.users || [])
        setLastUpdated(new Date())
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : 'Could not load the dashboard.')
        setAuthed(false)
        setToken('')
        sessionStorage.removeItem('chop_drop_admin_token')
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
      setNotification(`ðŸŸ¢ New Order Placed: ${newOrder.id} from ${newOrder.name} (â‚¹${newOrder.amount || 0})`)
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
      setNotification(`ðŸŽ« New Support Ticket: ${ticket.id} from ${ticket.name} (${ticket.issueType})`)
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

    // Gentle fallback periodic sync
    const interval = setInterval(() => loadAll(token), BACKUP_POLL_INTERVAL_MS)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('new_order')
      socket.off('order_status_updated')
      socket.off('new_ticket')
      socket.off('new_visit')
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

    sessionStorage.setItem('chop_drop_admin_token', result.token)
    setToken(result.token)
    setAuthed(true)
    setPassword('')
    await loadAll(result.token, true)
  }

  function handleLogout() {
    sessionStorage.removeItem('chop_drop_admin_token')
    setToken('')
    setAuthed(false)
    setOrders([])
    setTickets([])
    setUsers([])
    setVisits(null)
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(token, orderId, status)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    } catch {
      alert('Failed to update status. Please try again.')
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

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter = orderStatusFilter === 'all' || o.status === orderStatusFilter
    const term = orderSearch.trim().toLowerCase()
    const matchesSearch =
      !term ||
      o.id.toLowerCase().includes(term) ||
      o.name.toLowerCase().includes(term) ||
      o.phone.includes(term) ||
      (o.transactionId && o.transactionId.toLowerCase().includes(term))
    return matchesFilter && matchesSearch
  })

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (ticketStatusFilter === 'all') return true
    return t.status === ticketStatusFilter
  })

  const openTicketsCount = tickets.filter((t) => t.status === 'open').length
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0)

  // STANDALONE LOGIN SCREEN
  if (!authed) {
    return (
      <div className="admin-login-fullscreen">
        <div className="admin-login-card">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>ðŸ›¡ï¸</div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.3rem', color: '#1b4332' }}>Easy Foods</h1>
          <p style={{ fontWeight: 700, color: 'var(--carrot-dark)', margin: '0 0 0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Staff &amp; Admin Console
          </p>
          <p style={{ color: '#5f6368', fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
            Restricted staff access for order processing, support tickets, and system monitoring.
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
              ðŸ”‘ <strong>Admin Password:</strong> <code>admin123</code> (defined in <code>backend/.env</code>)
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
            >
              {loading ? 'Verifying Credentialsâ€¦' : 'Sign In to Admin Portal'}
            </button>

            {loginError && (
              <p style={{ color: '#c5221f', background: '#fce8e6', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
                {loginError}
              </p>
            )}
          </form>

          <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            <Link to="/" style={{ color: 'var(--leaf-deep)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
              â† Return to Customer Website
            </Link>
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
            <span>ðŸ›¡ï¸</span>
            <span>Easy Foods</span>
            <span className="admin-portal-badge">Admin Console</span>
          </div>

          <div className="admin-status-indicators">
            <span
              className={`admin-pill-badge ${socketConnected ? 'admin-pill-online' : 'admin-pill-connecting'}`}
              style={{ background: socketConnected ? '#2d6a4f' : '#b06000', color: '#ffffff', borderColor: 'transparent' }}
            >
              {socketConnected ? 'ðŸŸ¢ Live Push Active' : 'ðŸŸ¡ Socket Connectingâ€¦'}
            </span>
            <span
              className="admin-pill-badge"
              style={{ background: '#084298', color: '#cfe2ff', borderColor: 'transparent' }}
            >
              ðŸƒ MongoDB Engine
            </span>
          </div>

          <div className="admin-portal-nav-right">
            <Link to="/" className="admin-view-store-btn" title="Open customer website in new tab" target="_blank" rel="noopener noreferrer">
              ðŸŒ View Storefront â†—
            </Link>
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
              âœ•
            </button>
          </div>
        )}

        {/* Dashboard Top Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1b4332' }}>Operations Dashboard</h1>
            <p style={{ margin: '0.2rem 0 0', color: '#5f6368', fontSize: '0.9rem' }}>
              Real-time orders, customer support tickets, MongoDB customer database, and traffic analytics.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastUpdated && (
              <span className="admin-subtext" style={{ fontSize: '0.82rem' }}>
                Synced: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button className="btn btn-ghost" onClick={() => loadAll(token, true)} disabled={loading} style={{ padding: '0.45rem 0.9rem', fontSize: '0.88rem', background: '#fff' }}>
              {loading ? 'Refreshingâ€¦' : 'ðŸ”„ Refresh Data'}
            </button>
          </div>
        </div>

        {/* Key Metrics Overview Cards */}
        <div className="admin-metric-grid">
          <div className="admin-metric-card">
            <div className="admin-metric-num">{orders.length}</div>
            <div className="admin-metric-title">Total Orders</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-num" style={{ color: '#0f5132' }}>â‚¹{totalRevenue}</div>
            <div className="admin-metric-title">Revenue Generated</div>
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
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>ðŸ“¦ Orders</span>
            <span className="admin-tab-count">{orders.length}</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <span>ðŸŽ« Support Desk</span>
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
            <span>ðŸ‘¥ Customer Accounts</span>
            <span className="admin-tab-count">{users.length}</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'traffic' ? 'active' : ''}`}
            onClick={() => setActiveTab('traffic')}
          >
            <span>ðŸ“ˆ Traffic &amp; Analytics</span>
            {visits && <span className="admin-tab-count">{visits.today} today</span>}
          </button>
        </div>

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div>
            <div className="admin-filter-bar">
              <div className="admin-filter-group">
                {['all', 'received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'].map((s) => (
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
                placeholder="Search by ID, customer, phone, txn..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
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
                      <th>Slot &amp; Address</th>
                      <th>Payment Status</th>
                      <th>Status (Live push)</th>
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
                          <div style={{ maxWidth: 260, whiteSpace: 'normal', fontSize: '0.88rem' }}>
                            {order.items}
                          </div>
                          {order.notes && (
                            <div style={{ fontSize: '0.78rem', color: '#c2410c', fontStyle: 'italic', marginTop: 4 }}>
                              Note: {order.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.deliverySlot}</div>
                          <div className="admin-subtext" style={{ maxWidth: 200, whiteSpace: 'normal' }}>
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
                                background: order.paymentStatus === 'paid' ? '#e6f4ea' : '#fff4eb',
                                color: order.paymentStatus === 'paid' ? '#137333' : '#e35c00',
                              }}
                            >
                              {order.paymentMethod === 'online' ? 'Online (Paid) âœ“' : 'Cash on Delivery'}
                            </span>
                            {order.amount ? <strong style={{ fontSize: '0.95rem' }}>â‚¹{order.amount}</strong> : null}
                            {order.transactionId && (
                              <span style={{ fontSize: '0.72rem', color: '#686b78', fontFamily: 'monospace' }}>
                                {order.transactionId}
                              </span>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUPPORT DESK */}
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
                            {ticket.status === 'resolved' ? 'Resolved âœ“' : 'Open'}
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
                        <td>{u.email || 'â€”'}</td>
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
                <span className="footer-heading" style={{ color: 'var(--ink)' }}>Recent Site Activity (Real-time Live)</span>
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
      </div>
    </div>
  )
}

