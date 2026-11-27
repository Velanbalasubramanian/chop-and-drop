import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchPartnerMe,
  fetchPartnerOrders,
  fetchPartnerStats,
  partnerLogin,
  updatePartnerOrderStatus,
} from '../api'
import { getSocket } from '../socket'
import type { AdminOrder, OrderStatus, Partner, PartnerStats } from '../types'

const CATEGORY_META: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  All: { label: 'All Categories (Super Partner)', icon: '⚡', bg: '#eff6ff', color: '#1d4ed8' },
  cut_veggies: { label: 'Fresh Cut Veggies', icon: '🍏', bg: '#f0fdf4', color: '#15803d' },
  grocery: { label: 'Groceries', icon: '🛒', bg: '#fff7ed', color: '#c2410c' },
  cakes: { label: 'Cakes & Bakery', icon: '🎂', bg: '#fdf2f8', color: '#be185d' },
  water: { label: '20L Water Cans', icon: '💧', bg: '#f0f9ff', color: '#0369a1' },
  flowers: { label: 'Pooja Flowers', icon: '🌼', bg: '#fffbeb', color: '#b45309' },
  electricals: { label: 'Electricals', icon: '⚡', bg: '#f5f3ff', color: '#6d28d9' },
}

const DEMO_PARTNERS = [
  { name: '🎂 Cakes & Bakery Partner', phone: '9876543210', category: 'cakes', store: 'Velvet Oven Bakes' },
  { name: '🛒 Groceries Partner', phone: '9876543211', category: 'grocery', store: 'City Grocers Direct' },
  { name: '🍏 Cut Veggies Partner', phone: '9876543212', category: 'cut_veggies', store: 'Farm Fresh Cuts & Veg' },
  { name: '⚡ All Categories Super Partner', phone: '9876543213', category: 'All', store: 'Zippo Central Super Partner' },
]

export default function PartnerDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem('zippo_partner_token') || '')
  const [partner, setPartner] = useState<Partner | null>(() => {
    try {
      const saved = sessionStorage.getItem('zippo_partner_info')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Login Form state
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Dashboard Data states
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'preparing' | 'out_for_delivery' | 'delivered'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [notification, setNotification] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)

  // Play audio chime on new incoming order
  const playChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.6)
    } catch {}
  }, [])

  const loadData = useCallback(async (authToken: string) => {
    setLoading(true)
    try {
      const [ordersRes, statsRes, meRes] = await Promise.all([
        fetchPartnerOrders(authToken).catch(() => ({ orders: [], partnerCategory: 'All' })),
        fetchPartnerStats(authToken).catch(() => null),
        fetchPartnerMe(authToken).catch(() => null),
      ])

      setOrders(ordersRes.orders || [])
      setStats(statsRes)
      if (meRes?.partner) {
        setPartner(meRes.partner)
        sessionStorage.setItem('zippo_partner_info', JSON.stringify(meRes.partner))
      }
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('token')) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      loadData(token)
    }
  }, [token, loadData])

  // Real-time WebSocket connection
  useEffect(() => {
    if (!token || !partner) return

    const socket = getSocket()

    function handleConnect() {
      setSocketConnected(true)
      socket.emit('join_partner', { token })
    }

    if (socket.connected) {
      handleConnect()
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', () => setSocketConnected(false))

    // Customer placed an order relevant to this partner
    socket.on('new_order', (newOrder: AdminOrder) => {
      // Refresh partner orders list
      loadData(token)
      playChime()
      setNotification(`🔔 NEW ORDER: ${newOrder.id} from ${newOrder.name} (₹${newOrder.amount || 0})`)
      setTimeout(() => setNotification(''), 9000)
    })

    // Order status changed
    socket.on('order_status_updated', ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    })

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect')
      socket.off('new_order')
      socket.off('order_status_updated')
    }
  }, [token, partner, loadData, playChime])

  // Partner Login
  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const res = await partnerLogin(phone.trim(), password)
      sessionStorage.setItem('zippo_partner_token', res.token)
      sessionStorage.setItem('zippo_partner_info', JSON.stringify(res.partner))
      setToken(res.token)
      setPartner(res.partner)
      setPhone('')
      setPassword('')
      await loadData(res.token)
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Quick Demo Login helper
  async function handleQuickLogin(demoPhone: string) {
    setPhone(demoPhone)
    setPassword('partner123')
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await partnerLogin(demoPhone, 'partner123')
      sessionStorage.setItem('zippo_partner_token', res.token)
      sessionStorage.setItem('zippo_partner_info', JSON.stringify(res.partner))
      setToken(res.token)
      setPartner(res.partner)
      await loadData(res.token)
    } catch (err: any) {
      setLoginError(err.message || 'Quick login failed.')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('zippo_partner_token')
    sessionStorage.removeItem('zippo_partner_info')
    setToken('')
    setPartner(null)
    setOrders([])
    setStats(null)
  }

  // Move order along the partner fulfillment pipeline
  async function handleUpdateStatus(orderId: string, nextStatus: string) {
    if (!token) return
    setActionLoadingId(orderId)
    try {
      await updatePartnerOrderStatus(token, orderId, nextStatus)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus as OrderStatus } : o)))
      if (stats) {
        loadData(token)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !searchTerm ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone.includes(searchTerm) ||
        o.items.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      if (statusFilter === 'all') return true
      if (statusFilter === 'received') return o.status === 'received'
      if (statusFilter === 'preparing') return o.status === 'confirmed' || o.status === 'preparing'
      if (statusFilter === 'out_for_delivery') return o.status === 'out_for_delivery'
      if (statusFilter === 'delivered') return o.status === 'delivered'
      return true
    })
  }, [orders, statusFilter, searchTerm])

  const categoryMeta = partner ? (CATEGORY_META[partner.category] || CATEGORY_META.All) : CATEGORY_META.All

  // ==========================================
  // VIEW 1: PARTNER LOGIN SCREEN
  // ==========================================
  if (!token || !partner) {
    return (
      <div style={{ minHeight: '85vh', backgroundColor: '#f8fafc', padding: '3rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%', backgroundColor: '#ffffff', borderRadius: '24px', padding: '2.5rem 2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem', border: '1.5px solid #fed7aa' }}>
              🏪
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem' }}>
              Zippo Partner Portal
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
              Order Receiving &amp; Fulfillment Dashboard for Category Partners
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Partner Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit registered phone"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Partner Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            {loginError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem' }}>
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
              }}
            >
              {loginLoading ? 'Authenticating…' : 'Log in to Partner Dashboard'}
            </button>
          </form>

          {/* Quick Demo Logins for instant evaluation */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ 1-Click Demo Partner Logins (Pre-configured)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {DEMO_PARTNERS.map((demo) => (
                <button
                  key={demo.phone}
                  type="button"
                  onClick={() => handleQuickLogin(demo.phone)}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ea580c'
                    e.currentTarget.style.backgroundColor = '#fff7ed'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{demo.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Pass: partner123</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: ACTIVE PARTNER DASHBOARD
  // ==========================================
  return (
    <div style={{ minHeight: '90vh', backgroundColor: '#f8fafc', padding: '1.5rem 1rem 4rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Real-time Notification Banner */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: '14px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            animation: 'slideIn 0.3s ease',
          }}>
            <span>{notification}</span>
          </div>
        )}

        {/* Partner Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '1.5rem 2rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{categoryMeta.icon}</span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {partner.storeName || partner.name}
              </h1>
              <span style={{
                backgroundColor: categoryMeta.bg,
                color: categoryMeta.color,
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.8rem',
                border: `1px solid ${categoryMeta.color}30`,
              }}>
                {categoryMeta.label}
              </span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
              Partner ID: <strong>{partner.id}</strong> · Phone: <strong>{partner.phone}</strong> · Managed Area: {partner.address || 'Chennai Central'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              backgroundColor: socketConnected ? '#f0fdf4' : '#fef2f2',
              color: socketConnected ? '#16a34a' : '#ef4444',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: `1px solid ${socketConnected ? '#bbf7d0' : '#fecaca'}`,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: socketConnected ? '#16a34a' : '#ef4444' }} />
              {socketConnected ? 'Live Incoming Orders Connected' : 'Connecting to Live Hub…'}
            </div>

            <button
              onClick={() => loadData(token)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              🔄 Refresh
            </button>

            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #fee2e2',
                backgroundColor: '#fff1f2',
                color: '#be123c',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🔔 Incoming Orders
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              {stats?.received || orders.filter((o) => o.status === 'received').length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Needs acceptance &amp; confirmation</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🍳 In Preparation
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              {stats?.preparing || orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing').length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Packing &amp; cooking in progress</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🛵 Out for Delivery
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              {stats?.outForDelivery || orders.filter((o) => o.status === 'out_for_delivery').length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Dispatched with rider</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ✅ Completed / Delivered
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
              {stats?.delivered || orders.filter((o) => o.status === 'delivered').length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Fulfilled successfully</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              💰 Category Revenue
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{stats ? stats.revenue.toLocaleString('en-IN') : 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Total active sales</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {[
              { id: 'all', label: 'All Orders', count: orders.length },
              { id: 'received', label: '🔔 Incoming', count: orders.filter((o) => o.status === 'received').length },
              { id: 'preparing', label: '🍳 In Kitchen', count: orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing').length },
              { id: 'out_for_delivery', label: '🛵 Dispatched', count: orders.filter((o) => o.status === 'out_for_delivery').length },
              { id: 'delivered', label: '✅ Delivered', count: orders.filter((o) => o.status === 'delivered').length },
            ].map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: active ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                    backgroundColor: active ? '#ea580c' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label} <span style={{ opacity: 0.85, fontSize: '0.78rem' }}>({tab.count})</span>
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, customer name, phone…"
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Live Orders Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            Loading partner orders…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', padding: '4rem 1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.4rem' }}>
              No orders found in this view
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              Incoming orders containing <strong>{categoryMeta.label}</strong> items will appear here automatically in real time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {filteredOrders.map((order) => {
              const isReceived = order.status === 'received'
              const isConfirmed = order.status === 'confirmed'
              const isPreparing = order.status === 'preparing'
              const isOut = order.status === 'out_for_delivery'
              const isDelivered = order.status === 'delivered'
              const isActionLoading = actionLoadingId === order.id

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px',
                    padding: '1.5rem',
                    border: isReceived ? '2px solid #ea580c' : '1px solid #e2e8f0',
                    boxShadow: isReceived ? '0 8px 24px rgba(234, 88, 12, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Top Row: Order ID, Amount, Payment */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          #{order.id}
                        </span>
                        {isReceived && (
                          <span style={{ backgroundColor: '#ea580c', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px', textTransform: 'uppercase' }}>
                            NEW
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          ₹{order.amount || 0}
                        </span>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: order.paymentMethod === 'online' ? '#16a34a' : '#ea580c' }}>
                          {order.paymentMethod === 'online' ? 'PAID ONLINE' : 'CASH ON DELIVERY'}
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>👤 {order.name}</div>
                      <div style={{ color: '#475569', marginTop: '0.15rem' }}>📞 <a href={`tel:${order.phone}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>{order.phone}</a></div>
                      <div style={{ color: '#64748b', marginTop: '0.15rem' }}>📍 {order.address}</div>
                      <div style={{ color: '#0369a1', fontWeight: 600, marginTop: '0.25rem', fontSize: '0.8rem' }}>
                        ⏰ Slot: {order.deliverySlot}
                      </div>
                      {order.notes && (
                        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.35rem 0.6rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.78rem' }}>
                          📝 Note: {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Items to Fulfill */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Items Ordered ({partner.category === 'All' ? 'All Items' : `${categoryMeta.label} Items`}):
                      </div>
                      <div style={{ backgroundColor: '#faf5ff', border: '1px solid #f3e8ff', padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, color: '#581c87', lineHeight: 1.4 }}>
                        {order.matchingItems && order.matchingItems.length > 0 ? (
                          order.matchingItems.map((itm, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>•</span>
                              <span>{itm}</span>
                            </div>
                          ))
                        ) : (
                          order.items
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Partner Workflow Action Controls */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Current Status:
                      </span>
                      <span style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        backgroundColor:
                          isReceived ? '#ffedd5' :
                          isConfirmed ? '#dbeafe' :
                          isPreparing ? '#fef3c7' :
                          isOut ? '#e0e7ff' :
                          isDelivered ? '#dcfce7' : '#f1f5f9',
                        color:
                          isReceived ? '#c2410c' :
                          isConfirmed ? '#1d4ed8' :
                          isPreparing ? '#b45309' :
                          isOut ? '#4338ca' :
                          isDelivered ? '#15803d' : '#475569',
                      }}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Stage Buttons */}
                    {isReceived && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                        disabled={isActionLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          border: 'none',
                          cursor: isActionLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
                        }}
                      >
                        {isActionLoading ? 'Updating…' : '✅ Accept & Confirm Order'}
                      </button>
                    )}

                    {isConfirmed && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        disabled={isActionLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          backgroundColor: '#ea580c',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          border: 'none',
                          cursor: isActionLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 10px rgba(234, 88, 12, 0.25)',
                        }}
                      >
                        {isActionLoading ? 'Updating…' : '🍳 Start Preparing / Packing'}
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                        disabled={isActionLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          border: 'none',
                          cursor: isActionLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        {isActionLoading ? 'Updating…' : '🛵 Handover / Out for Delivery'}
                      </button>
                    )}

                    {isOut && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        disabled={isActionLoading}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          border: 'none',
                          cursor: isActionLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)',
                        }}
                      >
                        {isActionLoading ? 'Updating…' : '🎉 Mark Order Delivered'}
                      </button>
                    )}

                    {isDelivered && (
                      <div style={{ textAlign: 'center', color: '#15803d', fontWeight: 700, fontSize: '0.85rem', padding: '0.4rem' }}>
                        ✓ Order completed and fulfilled
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
