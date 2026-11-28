import React, { useState, useEffect, useMemo } from 'react'
import {
  partnerLogin,
  fetchPartnerProducts,
  createPartnerProduct,
  updatePartnerProduct,
  deletePartnerProduct,
  fetchPartnerOrders,
  updatePartnerOrderStatus,
  fetchPartnerStats,
  fetchActivePartners,
} from './api'
import { getSocket, joinPartnerRoom } from './socket'
import { Partner, PartnerOrder, PartnerProduct, PartnerStats } from './types'

const CATEGORY_LABELS: Record<string, string> = {
  All: 'All Categories (Super Hub)',
  grocery: 'Groceries & Staples',
  cakes: 'Cakes & Bakery',
  cut_veggies: 'Cut Vegetables',
  water: '20L Water Cans',
  flowers: 'Pooja Flowers',
  electricals: 'Electricals & Hardware',
}

function getPartnerIcon(category?: string) {
  switch (category) {
    case 'cakes':
      return '🎂'
    case 'grocery':
      return '🛒'
    case 'cut_veggies':
      return '🥗'
    case 'water':
      return '💧'
    case 'flowers':
      return '🌸'
    case 'electricals':
      return '⚡'
    default:
      return '🏪'
  }
}

export function App() {
  // Auth state
  const [token, setToken] = useState<string>(() => localStorage.getItem('zippo_partner_token') || '')
  const [partner, setPartner] = useState<Partner | null>(() => {
    const saved = localStorage.getItem('zippo_partner_info')
    return saved ? JSON.parse(saved) : null
  })

  // Dynamic Active Partners list for Login & quick access (synced via WebSocket)
  const [activePartners, setActivePartners] = useState<Partner[]>([])

  // Login form state
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Portal state
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'analytics'>('inventory')
  const [products, setProducts] = useState<PartnerProduct[]>([])
  const [orders, setOrders] = useState<PartnerOrder[]>([])
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState<string>('all')

  // Stock flash animation tracker (for dynamic reduction visual)
  const [recentlyUpdatedProductId, setRecentlyUpdatedProductId] = useState<string | null>(null)

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemTamilName, setNewItemTamilName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('grocery')
  const [newItemUnit, setNewItemUnit] = useState('1 kg')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemStock, setNewItemStock] = useState('20')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  // Quick Restock Edit Modal
  const [editProduct, setEditProduct] = useState<PartnerProduct | null>(null)
  const [editStockInput, setEditStockInput] = useState('')

  // Cancel Order Reason Modal
  const [cancelModalOrder, setCancelModalOrder] = useState<PartnerOrder | null>(null)
  const [cancelReasonOption, setCancelReasonOption] = useState<string>('Item out of stock')
  const [cancelCustomReason, setCancelCustomReason] = useState<string>('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelModalError, setCancelModalError] = useState('')

  // 1. Handle Login
  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await partnerLogin(loginPhone, loginPassword)
      setToken(res.token)
      setPartner(res.partner)
      localStorage.setItem('zippo_partner_token', res.token)
      localStorage.setItem('zippo_partner_info', JSON.stringify(res.partner))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials'
      setLoginError(msg)
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    setToken('')
    setPartner(null)
    localStorage.removeItem('zippo_partner_token')
    localStorage.removeItem('zippo_partner_info')
  }

  // Quick-fill credentials for testing
  function fillDemo(phone: string, pass = 'partner123') {
    setLoginPhone(phone)
    setLoginPassword(pass)
    setLoginError('')
  }

  // 2. Load Data
  async function loadAllData() {
    if (!token) return
    setLoading(true)
    try {
      const [prods, ordRes, st] = await Promise.all([
        fetchPartnerProducts(token),
        fetchPartnerOrders(token),
        fetchPartnerStats(token),
      ])
      // Deduplicate products by ID
      const uniqueProds = Array.from(new Map(prods.map((p) => [p.id, p])).values())
      setProducts(uniqueProds)
      setOrders(ordRes.orders)
      setStats(st)
    } catch (err) {
      console.error('Failed to load partner data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch active partner demo accounts on mount
  useEffect(() => {
    let mounted = true
    fetchActivePartners().then((list) => {
      if (mounted) setActivePartners(list)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (token) {
      loadAllData()
    }
  }, [token])

  // 3. Socket.io Real-time synchronization
  useEffect(() => {
    const socket = getSocket()

    function onConnect() {
      setSocketConnected(true)
      if (token) {
        joinPartnerRoom(token)
      }
    }

    function onDisconnect() {
      setSocketConnected(false)
    }

    // Dynamic Partner Updates: Add, update, or remove partner instantly
    function onPartnersUpdated(updatedList: Partner[]) {
      if (Array.isArray(updatedList)) {
        setActivePartners(updatedList)
      }
    }

    function onPartnerDeleted(data: { partnerId: string }) {
      if (!data?.partnerId) return
      setActivePartners((prev) => prev.filter((p) => p.id !== data.partnerId))

      // If the currently logged in partner was removed by admin
      if (partner && partner.id === data.partnerId) {
        alert('⚠️ Your partner account has been removed by the Admin. You will now be signed out.')
        handleLogout()
      }
    }

    function onPartnerCreated(newPartner: Partner) {
      if (!newPartner) return
      setActivePartners((prev) => {
        if (prev.some((p) => p.id === newPartner.id)) return prev
        return [newPartner, ...prev]
      })
    }

    function onPartnerUpdated(upd: Partner) {
      if (!upd) return
      setActivePartners((prev) => prev.map((p) => (p.id === upd.id ? { ...p, ...upd } : p)))
      if (partner && partner.id === upd.id) {
        setPartner((prev) => (prev ? { ...prev, ...upd } : null))
        localStorage.setItem('zippo_partner_info', JSON.stringify({ ...partner, ...upd }))
      }
    }

    // Live Stock updates from order placements or manual edits
    function onStockUpdated(updatedList: (PartnerProduct & { deleted?: boolean })[]) {
      if (!Array.isArray(updatedList)) return

      setProducts((prev) => {
        const next = [...prev]
        for (const upd of updatedList) {
          const idx = next.findIndex((p) => p.id === upd.id)
          if (idx >= 0) {
            if (upd.deleted) {
              next.splice(idx, 1)
            } else {
              next[idx] = {
                ...next[idx],
                stockQuantity: upd.stockQuantity,
                isAvailable: upd.isAvailable,
              }
              // Trigger highlight animation
              setRecentlyUpdatedProductId(upd.id)
              setTimeout(() => setRecentlyUpdatedProductId(null), 3000)
            }
          } else if (!upd.deleted && (upd.partnerId === partner?.id || (!upd.partnerId && partner?.category === upd.category))) {
            if (!next.some((p) => p.id === upd.id)) {
              next.unshift(upd)
            }
          }
        }
        return next
      })
    }

    // Live Orders received
    function onNewOrder(newOrder: PartnerOrder) {
      // Check if order belongs to partner's category
      setOrders((prev) => [newOrder, ...prev])
      setStats((prev) =>
        prev
          ? {
              ...prev,
              total: prev.total + 1,
              received: prev.received + 1,
              revenue: prev.revenue + (newOrder.amount || 0),
            }
          : null
      )
      // Visual notification
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
        audio.play().catch(() => {})
      } catch {
        // Audio might be blocked by browser autoplay policy
      }
    }

    // Live Order Status updates
    function onOrderStatusUpdated(data: { orderId: string; status: string }) {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status as any } : o))
      )
      if (token) {
        fetchPartnerStats(token).then(setStats).catch(() => {})
      }
    }

    function onRiderAssigned(data: { orderId: string; riderName: string; riderPhone: string }) {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, riderName: data.riderName, riderPhone: data.riderPhone } : o))
      )
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('partners_updated', onPartnersUpdated)
    socket.on('partner_deleted', onPartnerDeleted)
    socket.on('partner_created', onPartnerCreated)
    socket.on('partner_updated', onPartnerUpdated)
    socket.on('stock_updated', onStockUpdated)
    socket.on('new_order', onNewOrder)
    socket.on('order_status_updated', onOrderStatusUpdated)
    socket.on('rider_assigned', onRiderAssigned)

    if (socket.connected) {
      onConnect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('partners_updated', onPartnersUpdated)
      socket.off('partner_deleted', onPartnerDeleted)
      socket.off('partner_created', onPartnerCreated)
      socket.off('partner_updated', onPartnerUpdated)
      socket.off('stock_updated', onStockUpdated)
      socket.off('new_order', onNewOrder)
      socket.off('order_status_updated', onOrderStatusUpdated)
    }
  }, [token, partner?.id])

  // 4. Inventory Actions
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName || !newItemUnit || !newItemPrice) {
      setModalError('Please fill in Item Name, Unit, and Price.')
      return
    }
    setAddLoading(true)
    setModalError('')
    try {
      const created = await createPartnerProduct(token, {
        name: newItemName.trim(),
        tamilName: newItemTamilName.trim(),
        category: newItemCategory,
        unit: newItemUnit.trim(),
        price: Number(newItemPrice),
        stockQuantity: Number(newItemStock) || 0,
        description: newItemDesc.trim(),
      })
      // Safely insert only if not already added by live socket
      setProducts((prev) => {
        if (prev.some((p) => p.id === created.id)) return prev
        return [created, ...prev]
      })
      setShowAddModal(false)
      // Reset form
      setNewItemName('')
      setNewItemTamilName('')
      setNewItemPrice('')
      setNewItemStock('20')
      setNewItemDesc('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add item'
      setModalError(msg)
    } finally {
      setAddLoading(false)
    }
  }

  async function handleQuickStockChange(prod: PartnerProduct, delta: number) {
    const current = Number(prod.stockQuantity) || 0
    const newQty = Math.max(0, current + delta)
    try {
      const updated = await updatePartnerProduct(token, prod.id, {
        stockQuantity: newQty,
        isAvailable: newQty > 0,
      })
      setProducts((prev) => prev.map((p) => (p.id === prod.id ? updated : p)))
      setRecentlyUpdatedProductId(prod.id)
      setTimeout(() => setRecentlyUpdatedProductId(null), 2500)
    } catch (err) {
      alert('Failed to update stock: ' + (err as Error).message)
    }
  }

  async function handleSaveStockEdit() {
    if (!editProduct) return
    const newQty = Math.max(0, Number(editStockInput) || 0)
    try {
      const updated = await updatePartnerProduct(token, editProduct.id, {
        stockQuantity: newQty,
        isAvailable: newQty > 0,
      })
      setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? updated : p)))
      setEditProduct(null)
    } catch (err) {
      alert('Failed to update stock: ' + (err as Error).message)
    }
  }

  async function handleDeleteProduct(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove "${name}" from your inventory?`)) return
    try {
      await deletePartnerProduct(token, id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert('Failed to delete item: ' + (err as Error).message)
    }
  }

  // 5. Order Fulfillment Actions
  async function handleOrderStatusChange(orderId: string, nextStatus: string, reason?: string) {
    try {
      const res = await updatePartnerOrderStatus(token, orderId, nextStatus, reason)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)))
      if (token) {
        fetchPartnerStats(token).then(setStats).catch(() => {})
      }
    } catch (err) {
      alert('Failed to update order status: ' + (err as Error).message)
    }
  }

  function openCancelModal(order: PartnerOrder) {
    setCancelModalOrder(order)
    setCancelReasonOption('Item out of stock')
    setCancelCustomReason('')
    setCancelModalError('')
  }

  function closeCancelModal() {
    setCancelModalOrder(null)
    setCancelReasonOption('Item out of stock')
    setCancelCustomReason('')
    setCancelModalError('')
    setCancelLoading(false)
  }

  async function handleConfirmCancel() {
    if (!cancelModalOrder) return
    const finalReason = cancelReasonOption === 'Other reason'
      ? cancelCustomReason.trim()
      : (cancelCustomReason.trim() ? `${cancelReasonOption} - ${cancelCustomReason.trim()}` : cancelReasonOption)

    if (!finalReason) {
      setCancelModalError('Please select or specify a reason for cancellation.')
      return
    }

    setCancelLoading(true)
    setCancelModalError('')
    try {
      await handleOrderStatusChange(cancelModalOrder.id, 'cancelled', finalReason)
      closeCancelModal()
    } catch (err) {
      setCancelModalError((err as Error).message || 'Failed to cancel order.')
    } finally {
      setCancelLoading(false)
    }
  }

  // Filters & Computations
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    return orders.filter((o) => o.status === orderFilter)
  }, [orders, orderFilter])

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5).length
  }, [products])

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= 0 || !p.isAvailable).length
  }, [products])

  // -------------------------------------------------------------
  // VIEW: LOGIN SCREEN (if not authenticated)
  // -------------------------------------------------------------
  if (!token || !partner) {
    return (
      <div className="partner-login-screen">
        <div className="login-card">
          <div className="login-brand-header">
            <div className="login-logo-pill">Z</div>
            <h1 className="login-title">Zippo Partner Portal</h1>
            <p className="login-desc">Merchant Dashboard for Stock & Order Management</p>
          </div>

          {loginError && <div className="alert-box error">{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Partner Registered Mobile Number</label>
              <input
                type="tel"
                placeholder="e.g. 9876543211"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Password (Provided by Admin)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter partner password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '42px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                >
                  {showLoginPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 15 }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing In...' : 'Sign In to Partner Portal →'}
            </button>
          </form>

          {/* Quick Demo Partners - Dynamically fetched and synced live via WebSockets */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--gray-200)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Quick Demo Accounts (Password: partner123)</span>
              <span style={{ fontSize: 11, color: socketConnected ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                ● {socketConnected ? 'Live Real-time Sync' : 'Connecting...'}
              </span>
            </p>
            {activePartners.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--gray-500)', padding: '16px', background: 'var(--gray-50)', borderRadius: 8, textAlign: 'center', border: '1px dashed var(--gray-300)' }}>
                No active partner accounts found. Add a partner in the Admin Portal to sign in.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {activePartners.map((p) => {
                  const isCake = p.category === 'cakes'
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="btn-outline"
                      style={{
                        fontSize: 12,
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderColor: isCake ? '#f43f5e' : 'var(--gray-200)',
                        background: isCake ? '#fff1f2' : '#ffffff',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => fillDemo(p.phone)}
                      title={`Click to fill ${p.name}'s login credentials`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>{getPartnerIcon(p.category)}</span>
                        <b style={{ color: isCake ? '#9f1239' : 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.storeName || p.name}
                        </b>
                      </div>
                      <div style={{ fontSize: 11, color: isCake ? '#be123c' : 'var(--gray-600)' }}>
                        👤 {p.name} • 📞 {p.phone}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>
                        {CATEGORY_LABELS[p.category] || p.category}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: PARTNER DASHBOARD (Authenticated)
  // -------------------------------------------------------------
  return (
    <div className="partner-app">
      {/* 1. Header */}
      <header className="partner-header">
        <div className="partner-header-inner">
          <div className="brand-section">
            <div className="brand-logo-badge">Z</div>
            <div>
              <div className="brand-title">Zippo Partner Portal</div>
              <div className="brand-subtitle">
                <span>{partner.storeName || partner.name}</span>
                <span>•</span>
                <span className="category-tag">
                  {CATEGORY_LABELS[partner.category] || partner.category}
                </span>
              </div>
            </div>
          </div>

          <div className="user-section">
            <div className="live-indicator">
              <span className={`live-dot ${socketConnected ? '' : 'disconnected'}`} style={{ background: socketConnected ? '#10b981' : '#ef4444' }}></span>
              <span>{socketConnected ? 'Live Real-time Sync' : 'Reconnecting...'}</span>
            </div>

            <div className="partner-chip">
              <span>👤 {partner.name}</span>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>({partner.phone})</span>
            </div>

            <button className="btn-outline" onClick={loadAllData} title="Refresh data" disabled={loading}>
              {loading ? 'Syncing...' : '↻ Refresh'}
            </button>

            <button className="btn-outline" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* 2. Nav Tabs */}
      <nav className="partner-nav">
        <div className="partner-nav-inner">
          <button
            className={`nav-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Inventory & Live Stock
            <span className="badge-count">{products.length}</span>
            {lowStockCount > 0 && <span className="badge-count alert">{lowStockCount} Low</span>}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Customer Orders
            <span className="badge-count">{orders.length}</span>
            {orders.filter((o) => o.status === 'received').length > 0 && (
              <span className="badge-count alert">
                {orders.filter((o) => o.status === 'received').length} New
              </span>
            )}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Performance & KPIs
          </button>
        </div>
      </nav>

      {/* 3. Main Workspace */}
      <main className="partner-main">
        {/* KPI Summary Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Total Listed Products</div>
              <div className="stat-value">{products.length} Items</div>
            </div>
            <div className="stat-icon-wrap green">📦</div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Low / Out of Stock</div>
              <div className="stat-value" style={{ color: outOfStockCount > 0 ? '#dc2626' : '#d97706' }}>
                {lowStockCount + outOfStockCount} Alerts
              </div>
            </div>
            <div className="stat-icon-wrap amber">⚠️</div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Orders Received</div>
              <div className="stat-value">{stats?.total || orders.length} Orders</div>
            </div>
            <div className="stat-icon-wrap blue">🛒</div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Partner Revenue</div>
              <div className="stat-value">₹{stats?.revenue?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-icon-wrap purple">💰</div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: INVENTORY & STOCK MANAGEMENT                            */}
        {/* ============================================================== */}
        {activeTab === 'inventory' && (
          <div>
            <div className="section-toolbar">
              <div className="search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search products by name, Tamil name, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setNewItemCategory(partner.category !== 'All' ? partner.category : 'grocery')
                    setShowAddModal(true)
                  }}
                >
                  + Add New Inventory Item
                </button>
              </div>
            </div>

            {/* Information Banner on Dynamic Stock */}
            <div className="alert-box info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                💡 <b>Dynamic Stock Active:</b> Items added here appear directly in the Customer App.
                When a customer orders an item, its stock automatically reduces in real time!
              </div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                Category: <span style={{ textTransform: 'uppercase' }}>{partner.category}</span>
              </div>
            </div>

            {/* Products Table */}
            <div className="data-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product & Name</th>
                      <th>Category</th>
                      <th>Unit Size</th>
                      <th>Price</th>
                      <th>Current Stock</th>
                      <th>Status</th>
                      <th>Quick Restock</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-600)' }}>
                          {products.length === 0
                            ? 'No products added yet. Click "+ Add New Inventory Item" to list your available items!'
                            : 'No products match your search.'}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isRecentlyChanged = recentlyUpdatedProductId === p.id
                        const isOut = p.stockQuantity <= 0 || !p.isAvailable
                        const isLow = !isOut && p.stockQuantity <= 5

                        return (
                          <tr
                            key={p.id}
                            style={{
                              backgroundColor: isRecentlyChanged ? '#ecfdf5' : undefined,
                              transition: 'background-color 0.8s ease',
                            }}
                          >
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{p.name}</div>
                              {p.tamilName && (
                                <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{p.tamilName}</div>
                              )}
                              {p.description && (
                                <div style={{ fontSize: 11, color: 'var(--gray-400)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.description}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="category-tag">{p.category}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{p.unit}</td>
                            <td style={{ fontWeight: 700, color: 'var(--gray-900)' }}>₹{p.price}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontWeight: 800,
                                    fontSize: 16,
                                    color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669',
                                  }}
                                >
                                  {p.stockQuantity}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>available</span>
                                {isRecentlyChanged && (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                                    ● updated
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {isOut ? (
                                <span className="stock-pill out-of-stock">Out of Stock</span>
                              ) : isLow ? (
                                <span className="stock-pill low-stock">Low Stock</span>
                              ) : (
                                <span className="stock-pill in-stock">In Stock</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  className="quick-stock-btn"
                                  onClick={() => handleQuickStockChange(p, 5)}
                                  title="Add 5 to stock"
                                >
                                  +5
                                </button>
                                <button
                                  className="quick-stock-btn"
                                  onClick={() => handleQuickStockChange(p, 10)}
                                  title="Add 10 to stock"
                                >
                                  +10
                                </button>
                                <button
                                  className="quick-stock-btn"
                                  onClick={() => handleQuickStockChange(p, -1)}
                                  disabled={p.stockQuantity <= 0}
                                  title="Reduce 1 from stock"
                                >
                                  -1
                                </button>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  className="btn-outline"
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                  onClick={() => {
                                    setEditProduct(p)
                                    setEditStockInput(String(p.stockQuantity))
                                  }}
                                >
                                  Edit Qty
                                </button>
                                <button
                                  className="btn-danger"
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: CUSTOMER ORDERS (Managed by Partner)                    */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div>
            <div className="section-toolbar">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['all', 'received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    className={`action-step-btn ${orderFilter === st ? 'active' : ''}`}
                    onClick={() => setOrderFilter(st)}
                  >
                    {st === 'all'
                      ? 'All Orders'
                      : st === 'received'
                      ? 'New (Received)'
                      : st === 'confirmed'
                      ? 'Accepted'
                      : st === 'preparing'
                      ? 'Preparing'
                      : st === 'out_for_delivery'
                      ? 'Dispatched'
                      : st === 'delivered'
                      ? 'Delivered'
                      : 'Cancelled'}
                  </button>
                ))}
              </div>
            </div>

            <div className="orders-list">
              {filteredOrders.length === 0 ? (
                <div className="data-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-600)' }}>
                  No customer orders found under this status.
                </div>
              ) : (
                filteredOrders.map((ord) => (
                  <div key={ord.id} className="order-card">
                    <div className="order-card-header">
                      <div className="order-id-badge">
                        <span>🛒 Order #{ord.id}</span>
                        <span className="order-time">
                          {new Date(ord.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div>
                        <span className={`order-status-badge ${ord.status}`}>
                          {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="order-body-grid">
                      {/* Customer Details */}
                      <div className="order-info-block">
                        <div className="order-info-label">Customer Details</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.name}</div>
                        <div style={{ color: 'var(--gray-600)' }}>📞 {ord.phone}</div>
                        <div style={{ color: 'var(--gray-600)', marginTop: 4 }}>
                          📍 <b>Address:</b> {ord.address}
                        </div>
                        {ord.deliverySlot && (
                          <div style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 4 }}>
                            ⏱ Slot: {ord.deliverySlot}
                          </div>
                        )}

                        {(ord.riderName || (ord as any).rider_name) && (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e40af' }}>
                            🛵 <b>Delivery Partner:</b> {ord.riderName || (ord as any).rider_name}
                            {(ord.riderPhone || (ord as any).rider_phone) && (
                              <span style={{ marginLeft: 6, color: '#2563eb', fontWeight: 600 }}>
                                (📞 {ord.riderPhone || (ord as any).rider_phone})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Items Ordered */}
                      <div className="order-info-block">
                        <div className="order-info-label">Ordered Items</div>
                        <div className="items-box">
                          {ord.items}
                        </div>
                        {ord.matchingItems && ord.matchingItems.length > 0 && (
                          <div className="highlight-items">
                            🎯 Your category items: {ord.matchingItems.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Payment & Amount */}
                      <div className="order-info-block">
                        <div className="order-info-label">Payment & Value</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>
                          ₹{ord.amount || 0}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <span
                            className="stock-pill"
                            style={{
                              background: ord.paymentMethod === 'online' ? '#d1fae5' : '#f1f5f9',
                              color: ord.paymentMethod === 'online' ? '#065f46' : '#334155',
                            }}
                          >
                            {ord.paymentMethod === 'online' ? 'PAID ONLINE (Razorpay)' : 'CASH ON DELIVERY'}
                          </span>
                        </div>
                        {ord.notes && (
                          <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 6, fontStyle: 'italic' }}>
                            Note: "{ord.notes}"
                          </div>
                        )}
                      </div>

                      {/* Cancelled Alert Box */}
                      {ord.status === 'cancelled' && (
                        <div style={{ gridColumn: '1 / -1', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                            🚫 Order Cancelled: {ord.cancelReason || 'Cancelled by merchant / customer'}
                          </span>
                          {ord.cancelledAt && (
                            <div style={{ fontSize: 11, color: '#991b1b', marginTop: 2 }}>
                              Cancelled at: {new Date(ord.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Order Fulfillment 4-Step Actions */}
                    <div className="order-actions-bar">
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>
                        Fulfillment Workflow:
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ord.status === 'received' && (
                          <button
                            className="btn-primary"
                            onClick={() => handleOrderStatusChange(ord.id, 'confirmed')}
                          >
                            ✓ Accept Order
                          </button>
                        )}

                        {ord.status === 'confirmed' && (
                          <button
                            className="btn-primary"
                            onClick={() => handleOrderStatusChange(ord.id, 'preparing')}
                          >
                            🧑‍🍳 Start Preparing
                          </button>
                        )}

                        {ord.status === 'preparing' && (
                          <button
                            className="btn-primary"
                            onClick={() => handleOrderStatusChange(ord.id, 'out_for_delivery')}
                          >
                            🛵 Dispatch (Out for Delivery)
                          </button>
                        )}

                        {ord.status === 'out_for_delivery' && (
                          <button
                            className="btn-primary"
                            style={{ background: '#10b981' }}
                            onClick={() => handleOrderStatusChange(ord.id, 'delivered')}
                          >
                            🎉 Mark Delivered
                          </button>
                        )}

                        {ord.status === 'delivered' && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ✓ Order Completed & Delivered
                          </span>
                        )}

                        {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: 12, borderColor: '#fca5a5', color: '#dc2626' }}
                            onClick={() => openCancelModal(ord)}
                          >
                            ✕ Cancel / Reject Order
                          </button>
                        )}

                        {ord.status === 'cancelled' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                              ✕ Order Cancelled &amp; Stock Restored
                            </span>
                            {ord.cancelReason && (
                              <span style={{ fontSize: 11, color: '#991b1b', fontStyle: 'italic' }}>
                                Reason: {ord.cancelReason} {ord.cancelledBy ? `(by ${ord.cancelledBy})` : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PERFORMANCE & ANALYTICS                                 */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div>
            <div className="data-card" style={{ padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 12 }}>
                Merchant Account Summary
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>Partner ID</div>
                  <div style={{ fontWeight: 700 }}>{partner.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>Assigned Category</div>
                  <div style={{ fontWeight: 700 }}>{CATEGORY_LABELS[partner.category] || partner.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>Store Location</div>
                  <div style={{ fontWeight: 700 }}>{partner.address || 'Chennai Central'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>Registered Phone</div>
                  <div style={{ fontWeight: 700 }}>{partner.phone}</div>
                </div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 16 }}>
                Orders by Status Breakdown
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div style={{ background: '#e0f2fe', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0369a1' }}>
                    {orders.filter((o) => o.status === 'received').length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0284c7' }}>New / Received</div>
                </div>
                <div style={{ background: '#fef3c7', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>
                    {orders.filter((o) => o.status === 'confirmed').length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706' }}>Accepted</div>
                </div>
                <div style={{ background: '#ffedd5', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#c2410c' }}>
                    {orders.filter((o) => o.status === 'preparing').length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#ea580c' }}>Preparing</div>
                </div>
                <div style={{ background: '#f3e8ff', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#7e22ce' }}>
                    {orders.filter((o) => o.status === 'out_for_delivery').length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9333ea' }}>Dispatched</div>
                </div>
                <div style={{ background: '#d1fae5', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#047857' }}>
                    {orders.filter((o) => o.status === 'delivered').length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>Delivered</div>
                </div>
                <div style={{ background: '#fee2e2', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c' }}>
                    {orders.filter((o) => o.status === 'cancelled').length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>Cancelled</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: ADD NEW INVENTORY ITEM                                  */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">+ Add Product to 🏪 {partner.storeName || partner.name}</h2>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="modal-body">
                {modalError && <div className="alert-box error">{modalError}</div>}

                <div className="form-group">
                  <label>Item / Dish Name (English) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sizzling Chocolate Brownie / Dutch Truffle / Ponni Rice"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Item Name (Tamil - Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. பிரவுனி கேக் / பொன்னி அரிசி"
                    value={newItemTamilName}
                    onChange={(e) => setNewItemTamilName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Store Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    >
                      <option value="cakes">🎂 Cakes &amp; Bakery</option>
                      <option value="grocery">🛒 Groceries &amp; Staples</option>
                      <option value="cut_veggies">🥗 Cut Vegetables</option>
                      <option value="water">💧 20L Water Cans</option>
                      <option value="flowers">🌼 Pooja Flowers</option>
                      <option value="electricals">⚡ Electricals &amp; Hardware</option>
                      <option value="general">📦 General</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Unit / Pack Spec *</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 pc, 500g, 1 kg, Piece"
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      required
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {['1 pc', '500g', '1 kg', 'Pack of 2', 'Piece'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          className="quick-stock-btn"
                          style={{ padding: '2px 6px', fontSize: 11 }}
                          onClick={() => setNewItemUnit(u)}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 140"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Initial Stock Quantity *</label>
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={newItemStock}
                      onChange={(e) => setNewItemStock(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Freshly baked molten brownie with rich Belgian cocoa..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={addLoading}
                >
                  {addLoading ? 'Saving...' : 'Add Product to App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT STOCK QUANTITY                                     */}
      {/* ============================================================== */}
      {editProduct && (
        <div className="modal-overlay" onClick={() => setEditProduct(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Stock: {editProduct.name}</h2>
              <button className="modal-close-btn" onClick={() => setEditProduct(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                Set available quantity for customers to order ({editProduct.unit}).
              </p>

              <div className="form-group">
                <label>Available Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editStockInput}
                  onChange={(e) => setEditStockInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="quick-stock-btn"
                  onClick={() => setEditStockInput((prev) => String(Number(prev || 0) + 5))}
                >
                  +5 units
                </button>
                <button
                  type="button"
                  className="quick-stock-btn"
                  onClick={() => setEditStockInput((prev) => String(Number(prev || 0) + 10))}
                >
                  +10 units
                </button>
                <button
                  type="button"
                  className="quick-stock-btn"
                  onClick={() => setEditStockInput('0')}
                  style={{ color: '#dc2626' }}
                >
                  Set to 0 (Out of stock)
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setEditProduct(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveStockEdit}
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CANCEL / REJECT ORDER WITH REASON                       */}
      {/* ============================================================== */}
      {cancelModalOrder && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2', background: '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <h2 className="modal-title" style={{ color: '#b91c1c', margin: 0, fontSize: 18 }}>
                    Cancel / Reject Order #{cancelModalOrder.id.slice(-6).toUpperCase()}
                  </h2>
                  <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                    Customer: <strong>{cancelModalOrder.name}</strong> ({cancelModalOrder.phone})
                  </div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeCancelModal}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {cancelModalError && <div className="alert-box error">{cancelModalError}</div>}

              {/* Order quick summary box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Ordered Items:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    ₹{cancelModalOrder.amount} ({cancelModalOrder.paymentMethod?.toUpperCase() || 'COD'})
                  </span>
                </div>
                <div style={{ color: '#334155', fontWeight: 500 }}>
                  {cancelModalOrder.items}
                </div>
              </div>

              {/* Stock restoration alert */}
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📦</span>
                <span>
                  <strong>Inventory Auto-Restore:</strong> Cancelling will automatically add items' quantities back to your store's live stock.
                </span>
              </div>

              {/* Reason selection */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                  Select Reason for Cancellation *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: '📦 Item out of stock', val: 'Item out of stock' },
                    { label: '🏪 Store / Kitchen closed', val: 'Store closed' },
                    { label: '⏳ High rush / Cannot fulfill', val: 'High rush - unable to prepare' },
                    { label: '📍 Address out of delivery area', val: 'Delivery area unreachable' },
                    { label: '📞 Customer requested cancellation', val: 'Customer requested cancellation' },
                    { label: '✍️ Other custom reason', val: 'Other reason' },
                  ].map((r) => {
                    const isSelected = cancelReasonOption === r.val
                    return (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => setCancelReasonOption(r.val)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          background: isSelected ? '#fef2f2' : '#ffffff',
                          color: isSelected ? '#b91c1c' : '#334155',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{isSelected ? '🔘' : '⚪'}</span>
                        <span>{r.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Additional notes textarea */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  {cancelReasonOption === 'Other reason' ? 'Please specify reason details *' : 'Additional Note for Customer (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    cancelReasonOption === 'Other reason'
                      ? 'e.g. Ingredients finished for today, or kitchen breakdown...'
                      : 'e.g. We apologize for the inconvenience...'
                  }
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #fee2e2', background: '#fff5f5' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={closeCancelModal}
                disabled={cancelLoading}
              >
                No, Keep Order
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <span>✕</span>
                    Confirm Cancellation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
