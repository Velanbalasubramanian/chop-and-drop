import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { THEME } from '../config'
import type { Partner, PartnerOrder, PartnerProduct, PartnerStats } from '../types'
import {
  createPartnerProduct,
  deletePartnerProduct,
  fetchActivePartners,
  fetchPartnerMe,
  fetchPartnerOrders,
  fetchPartnerProducts,
  fetchPartnerStats,
  partnerLogin,
  updatePartnerOrderStatus,
  updatePartnerProduct,
} from '../api'
import { getSocket } from '../socket'

const STORAGE_PARTNER_TOKEN = '@zippo_partner_token'
const STORAGE_PARTNER_INFO = '@zippo_partner_info'

const CANCEL_REASONS = [
  'Item out of stock',
  'Store closed / High order volume',
  'Kitchen / Power outage',
  'Delivery address out of service area',
  'Other reason',
]

function getCategoryIcon(cat?: string) {
  switch (cat) {
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

export default function PartnerScreen() {
  const navigation = useNavigation<any>()

  // Auth State
  const [token, setToken] = useState<string>('')
  const [partner, setPartner] = useState<Partner | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Login Form State
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [demoPartners, setDemoPartners] = useState<Partner[]>([])

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'stats'>('orders')
  const [orders, setOrders] = useState<PartnerOrder[]>([])
  const [products, setProducts] = useState<PartnerProduct[]>([])
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)

  // Filters & Search
  const [orderFilter, setOrderFilter] = useState<string>('all')
  const [searchProductQuery, setSearchProductQuery] = useState('')

  // Action Loading
  const [actionOrderId, setActionOrderId] = useState<string | null>(null)

  // Cancel Order Modal
  const [cancelModalOrder, setCancelModalOrder] = useState<PartnerOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('Item out of stock')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  // Restock Modal
  const [stockModalProduct, setStockModalProduct] = useState<PartnerProduct | null>(null)
  const [newStockInput, setNewStockInput] = useState('')
  const [stockLoading, setStockLoading] = useState(false)

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdTamil, setNewProdTamil] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdUnit, setNewProdUnit] = useState('1 kg')
  const [newProdStock, setNewProdStock] = useState('20')
  const [newProdDesc, setNewProdDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // 1. Initial Load: Check saved partner credentials
  useEffect(() => {
    async function initAuth() {
      try {
        const [savedToken, savedInfoStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PARTNER_TOKEN),
          AsyncStorage.getItem(STORAGE_PARTNER_INFO),
        ])
        if (savedToken) {
          setToken(savedToken)
          if (savedInfoStr) {
            setPartner(JSON.parse(savedInfoStr))
          }
        }
      } catch (err) {
        console.log('Error restoring partner session:', err)
      } finally {
        setAuthLoading(false)
      }
    }
    initAuth()
    fetchActivePartners().then(setDemoPartners).catch(() => {})
  }, [])

  // 2. Load Partner Dashboard Data
  const loadDashboard = useCallback(async (authToken: string) => {
    if (!authToken) return
    try {
      const [orderRes, prodRes, statRes, meRes] = await Promise.all([
        fetchPartnerOrders(authToken),
        fetchPartnerProducts(authToken),
        fetchPartnerStats(authToken).catch(() => null),
        fetchPartnerMe(authToken).catch(() => null),
      ])
      setOrders(orderRes.orders || [])
      setProducts(prodRes || [])
      if (statRes) setStats(statRes)
      if (meRes) {
        setPartner(meRes)
        AsyncStorage.setItem(STORAGE_PARTNER_INFO, JSON.stringify(meRes))
      }
    } catch (err: any) {
      console.log('Error loading partner data:', err.message)
    }
  }, [])

  useEffect(() => {
    if (token) {
      setLoading(true)
      loadDashboard(token).finally(() => setLoading(false))
    }
  }, [token, loadDashboard])

  // 3. Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!token || !partner) return

    const socket = getSocket()

    function onConnect() {
      setSocketConnected(true)
      socket.emit('join_partner', { token, partnerId: partner?.id })
    }

    function onDisconnect() {
      setSocketConnected(false)
    }

    function onRefresh() {
      loadDashboard(token)
    }

    function onOrderCreated(newOrder: PartnerOrder) {
      Alert.alert('🔔 New Order Received!', `Order #${newOrder.id} placed by ${newOrder.name}.`)
      loadDashboard(token)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('order_created', onOrderCreated)
    socket.on('order_status_updated', onRefresh)
    socket.on('rider_assigned', onRefresh)
    socket.on('partner_stock_reduced', onRefresh)

    if (socket.connected) {
      onConnect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('order_created', onOrderCreated)
      socket.off('order_status_updated', onRefresh)
      socket.off('rider_assigned', onRefresh)
      socket.off('partner_stock_reduced', onRefresh)
    }
  }, [token, partner, loadDashboard])

  // Pull-to-refresh
  async function handleRefresh() {
    if (!token) return
    setRefreshing(true)
    await loadDashboard(token)
    setRefreshing(false)
  }

  // 4. Partner Login Action
  async function handleLogin(customPhone?: string, customPass?: string) {
    const p = customPhone || phone
    const pass = customPass || password
    if (!p.trim() || !pass.trim()) {
      setLoginError('Please enter partner mobile number and password.')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await partnerLogin(p.trim(), pass.trim())
      setToken(res.token)
      setPartner(res.partner)
      await Promise.all([
        AsyncStorage.setItem(STORAGE_PARTNER_TOKEN, res.token),
        AsyncStorage.setItem(STORAGE_PARTNER_INFO, JSON.stringify(res.partner)),
      ])
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  // 5. Logout Action
  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to log out from Partner Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_PARTNER_TOKEN)
          await AsyncStorage.removeItem(STORAGE_PARTNER_INFO)
          setToken('')
          setPartner(null)
          setOrders([])
          setProducts([])
          setStats(null)
        },
      },
    ])
  }

  // 6. Update Order Status (Accept or Prepare)
  async function handleUpdateStatus(orderId: string, status: string) {
    if (!token) return
    setActionOrderId(orderId)
    try {
      await updatePartnerOrderStatus(token, orderId, status)
      await loadDashboard(token)
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update order status.')
    } finally {
      setActionOrderId(null)
    }
  }

  // 7. Submit Cancel Order
  async function handleConfirmCancel() {
    if (!token || !cancelModalOrder) return
    const finalReason =
      cancelReason === 'Other reason'
        ? cancelNote.trim() || 'Store unable to fulfill'
        : cancelNote.trim()
        ? `${cancelReason} - ${cancelNote.trim()}`
        : cancelReason

    setCancelLoading(true)
    try {
      await updatePartnerOrderStatus(token, cancelModalOrder.id, 'cancelled', finalReason)
      Alert.alert('Order Cancelled', `Order #${cancelModalOrder.id} has been cancelled.`)
      setCancelModalOrder(null)
      setCancelNote('')
      await loadDashboard(token)
    } catch (err: any) {
      Alert.alert('Cancellation Error', err.message || 'Could not cancel order.')
    } finally {
      setCancelLoading(false)
    }
  }

  // 8. Toggle Product Stock Availability
  async function handleToggleStock(product: PartnerProduct) {
    if (!token) return
    const nextVal = !product.isAvailable
    try {
      await updatePartnerProduct(token, product.id, { isAvailable: nextVal })
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isAvailable: nextVal } : p))
      )
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update stock status.')
    }
  }

  // 9. Save Quick Restock Number
  async function handleSaveStock() {
    if (!token || !stockModalProduct) return
    const qty = parseInt(newStockInput, 10)
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid stock number.')
      return
    }
    setStockLoading(true)
    try {
      await updatePartnerProduct(token, stockModalProduct.id, {
        stockQuantity: qty,
        isAvailable: qty > 0,
      })
      Alert.alert('Stock Updated', `${stockModalProduct.name} stock set to ${qty}.`)
      setStockModalProduct(null)
      await loadDashboard(token)
    } catch (err: any) {
      Alert.alert('Stock Update Error', err.message || 'Could not update stock.')
    } finally {
      setStockLoading(false)
    }
  }

  // 10. Delete Product
  function handleDeleteProduct(productId: string, productName: string) {
    Alert.alert('Delete Product', `Are you sure you want to remove "${productName}" from your store?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) return
          try {
            await deletePartnerProduct(token, productId)
            setProducts((prev) => prev.filter((p) => p.id !== productId))
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message || 'Could not delete product.')
          }
        },
      },
    ])
  }

  // 11. Create New Product
  async function handleCreateProduct() {
    if (!token) return
    if (!newProdName.trim() || !newProdPrice.trim()) {
      Alert.alert('Required Fields', 'Please enter product name and price.')
      return
    }
    const priceNum = parseFloat(newProdPrice)
    const stockNum = parseInt(newProdStock, 10) || 50
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price amount.')
      return
    }

    setAddLoading(true)
    try {
      await createPartnerProduct(token, {
        name: newProdName.trim(),
        tamilName: newProdTamil.trim(),
        category: partner?.category || 'grocery',
        unit: newProdUnit.trim() || '1 kg',
        price: priceNum,
        stockQuantity: stockNum,
        description: newProdDesc.trim(),
      })
      Alert.alert('Product Added', `"${newProdName}" is now live in your store!`)
      setShowAddModal(false)
      setNewProdName('')
      setNewProdTamil('')
      setNewProdPrice('')
      setNewProdDesc('')
      await loadDashboard(token)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create product.')
    } finally {
      setAddLoading(false)
    }
  }

  // Helpers
  function callNumber(num?: string) {
    if (!num) return
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert('Dialer Error', 'Could not open phone dialer.')
    })
  }

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    return orders.filter((o) => o.status === orderFilter)
  }, [orders, orderFilter])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!searchProductQuery.trim()) return products
    const q = searchProductQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(q))
    )
  }, [products, searchProductQuery])

  // ---------------- VIEW 1: LOADING ----------------
  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading Partner Portal…</Text>
      </View>
    )
  }

  // ---------------- VIEW 2: LOGIN ----------------
  if (!token) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Merchant Partner Portal</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.loginContent} showsVerticalScrollIndicator={false}>
          {/* Logo Header */}
          <View style={styles.brandHero}>
            <View style={styles.heroIconBox}>
              <Ionicons name="storefront" size={44} color="#10b981" />
            </View>
            <Text style={styles.heroTitle}>Zippo Partner Portal</Text>
            <Text style={styles.heroSub}>
              Merchant Dashboard for Store Stock & Order Management (Android & iOS)
            </Text>
          </View>

          {/* Quick Demo Partners */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <Ionicons name="flash" size={16} color="#10b981" />
              <Text style={styles.demoHeaderText}>QUICK DEMO STORE SIGN IN</Text>
              <Text style={styles.demoBadge}>LIVE SYNC</Text>
            </View>
            <Text style={styles.demoSub}>
              Tap any partner store to sign in instantly (Password: PARTNER123):
            </Text>

            <View style={styles.demoList}>
              {demoPartners.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.demoPill}
                  disabled={loginLoading}
                  onPress={() => {
                    setPhone(p.phone)
                    setPassword('PARTNER123')
                    handleLogin(p.phone, 'PARTNER123')
                  }}
                >
                  <View style={styles.demoPillLeft}>
                    <Text style={styles.demoPillName}>
                      {getCategoryIcon(p.category)} {p.storeName || p.name}
                    </Text>
                    <Text style={styles.demoPillDetails}>
                      👤 {p.name} • 📞 {p.phone}
                    </Text>
                  </View>
                  <View style={styles.demoUseBtn}>
                    <Text style={styles.demoUseText}>Login →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Manual Login Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Or Sign In with Registered Number</Text>

            {loginError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>PARTNER REGISTERED MOBILE NUMBER</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="e.g. 9750740587"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD (PROVIDED BY ADMIN)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter partner password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loginLoading && styles.btnDisabled]}
              disabled={loginLoading}
              onPress={() => handleLogin()}
            >
              {loginLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In to Partner Portal →</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  // ---------------- VIEW 3: MAIN PARTNER DASHBOARD ----------------
  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {getCategoryIcon(partner?.category)} {partner?.storeName || partner?.name || 'Partner Store'}
            </Text>
          </View>
          <View style={styles.onlineStatusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: socketConnected ? '#22c55e' : '#eab308' },
              ]}
            />
            <Text style={styles.statusDotText}>
              {socketConnected ? 'Live Real-Time Sync' : 'Connecting to Server…'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutSmallBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Store Quick Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TOTAL ORDERS</Text>
          <Text style={styles.statVal}>{stats?.total ?? orders.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>REVENUE</Text>
          <Text style={[styles.statVal, { color: '#22c55e' }]}>
            ₹{stats?.revenue ?? orders.reduce((s, o) => s + (o.amount || 0), 0)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>PENDING</Text>
          <Text style={[styles.statVal, { color: '#f59e0b' }]}>
            {orders.filter((o) => o.status === 'received' || o.status === 'confirmed').length}
          </Text>
        </View>
      </View>

      {/* Tabs Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons
            name="receipt-outline"
            size={18}
            color={activeTab === 'orders' ? '#10b981' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'inventory' && styles.tabItemActive]}
          onPress={() => setActiveTab('inventory')}
        >
          <Ionicons
            name="cube-outline"
            size={18}
            color={activeTab === 'inventory' ? '#10b981' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>
            Stock ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons
            name="bar-chart-outline"
            size={18}
            color={activeTab === 'stats' ? '#10b981' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.loadingBannerText}>Updating store data…</Text>
          </View>
        )}

        {/* ---------------- TAB 1: ORDERS ---------------- */}
        {activeTab === 'orders' && (
          <>
            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'received', label: 'New / Received' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'preparing', label: 'Preparing' },
                { id: 'out_for_delivery', label: 'In Transit' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, orderFilter === f.id && styles.filterPillActive]}
                  onPress={() => setOrderFilter(f.id)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      orderFilter === f.id && styles.filterPillTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={54} color="#64748b" />
                <Text style={styles.emptyTitle}>No Orders Found</Text>
                <Text style={styles.emptySub}>
                  {orderFilter === 'all'
                    ? 'Orders placed for your store will appear here in real time.'
                    : `No orders currently in ${orderFilter} state.`}
                </Text>
              </View>
            ) : (
              filteredOrders.map((ord) => {
                const isReceived = ord.status === 'received'
                const isConfirmed = ord.status === 'confirmed'
                const isPreparing = ord.status === 'preparing'
                const isCancelled = ord.status === 'cancelled'

                return (
                  <View
                    key={ord.id}
                    style={[
                      styles.orderCard,
                      isReceived && { borderColor: '#10b981', borderWidth: 1.5 },
                      isCancelled && { opacity: 0.75 },
                    ]}
                  >
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.idBadge}>
                        <Text style={styles.idBadgeText}>#{ord.id}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          ord.status === 'received'
                            ? styles.statusRec
                            : ord.status === 'confirmed'
                            ? styles.statusConf
                            : ord.status === 'preparing'
                            ? styles.statusPrep
                            : ord.status === 'out_for_delivery'
                            ? styles.statusOut
                            : ord.status === 'delivered'
                            ? styles.statusDel
                            : styles.statusCanc,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {ord.status.toUpperCase().replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Customer Info */}
                    <View style={styles.customerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.custName}>👤 {ord.name}</Text>
                        <Text style={styles.custAddress}>📍 {ord.address}</Text>
                        <Text style={styles.custSlot}>⏱ Slot: {ord.deliverySlot}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callCustBtn}
                        onPress={() => callNumber(ord.phone)}
                      >
                        <Ionicons name="call" size={16} color="#ffffff" />
                        <Text style={styles.callCustText}>Call</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Items Box */}
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsBoxTitle}>ORDER ITEMS:</Text>
                      <Text style={styles.itemsBoxText}>{ord.items}</Text>
                    </View>

                    {/* Rider Info Strip (if assigned) */}
                    {ord.riderName ? (
                      <View style={styles.riderAssignedBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.riderBoxTitle}>ASSIGNED DELIVERY PARTNER:</Text>
                          <Text style={styles.riderBoxName}>🛵 {ord.riderName}</Text>
                        </View>
                        {ord.riderPhone ? (
                          <TouchableOpacity
                            style={styles.callRiderBtn}
                            onPress={() => callNumber(ord.riderPhone)}
                          >
                            <Ionicons name="call" size={14} color="#38bdf8" />
                            <Text style={styles.callRiderText}>Call Rider</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Cancellation Note (if cancelled) */}
                    {isCancelled && (
                      <View style={styles.cancelAlertBox}>
                        <Ionicons name="alert-circle" size={18} color="#ef4444" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cancelAlertTitle}>Order Cancelled</Text>
                          <Text style={styles.cancelAlertSub}>
                            Reason: {ord.cancelReason || 'Cancelled by store'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Payment Footer */}
                    <View style={styles.orderFooter}>
                      <Text style={styles.orderAmount}>Amount: ₹{ord.amount || 0}</Text>
                      <Text
                        style={[
                          styles.orderPaymentMode,
                          { color: ord.paymentMethod === 'cod' ? '#f59e0b' : '#22c55e' },
                        ]}
                      >
                        {ord.paymentMethod === 'cod' ? 'Cash On Delivery' : 'Paid Online'}
                      </Text>
                    </View>

                    {/* Action Buttons for Merchant */}
                    {!isCancelled && ord.status !== 'delivered' && (
                      <View style={styles.orderActionsRow}>
                        {isReceived && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            disabled={actionOrderId === ord.id}
                            onPress={() => handleUpdateStatus(ord.id, 'confirmed')}
                          >
                            {actionOrderId === ord.id ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                                <Text style={styles.actionBtnText}>Accept Order</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        {isConfirmed && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.prepareBtn]}
                            disabled={actionOrderId === ord.id}
                            onPress={() => handleUpdateStatus(ord.id, 'preparing')}
                          >
                            {actionOrderId === ord.id ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="cube" size={16} color="#ffffff" />
                                <Text style={styles.actionBtnText}>Mark Ready &amp; Packed</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        {isPreparing && (
                          <View style={styles.waitingRiderPill}>
                            <Text style={styles.waitingRiderText}>
                              ✓ Ready for Delivery Rider Pickup
                            </Text>
                          </View>
                        )}

                        {(isReceived || isConfirmed) && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.cancelBtn]}
                            onPress={() => setCancelModalOrder(ord)}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </>
        )}

        {/* ---------------- TAB 2: INVENTORY & STOCK ---------------- */}
        {activeTab === 'inventory' && (
          <>
            {/* Search & Add Bar */}
            <View style={styles.inventoryTopRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search store products…"
                  placeholderTextColor="#94a3b8"
                  value={searchProductQuery}
                  onChangeText={setSearchProductQuery}
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.addBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={54} color="#64748b" />
                <Text style={styles.emptyTitle}>No Products in Inventory</Text>
                <Text style={styles.emptySub}>
                  Tap "Add Item" above to add products to your digital storefront.
                </Text>
              </View>
            ) : (
              filteredProducts.map((p) => (
                <View key={p.id} style={styles.productCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prodName}>{p.name}</Text>
                    {p.tamilName ? <Text style={styles.prodTamil}>{p.tamilName}</Text> : null}
                    <Text style={styles.prodPrice}>
                      ₹{p.price} <Text style={styles.prodUnit}>/ {p.unit}</Text>
                    </Text>

                    {/* Stock Count Pill */}
                    <View style={styles.stockStatusRow}>
                      <View
                        style={[
                          styles.stockPill,
                          p.stockQuantity > 5 ? styles.stockGood : styles.stockLow,
                        ]}
                      >
                        <Text style={styles.stockPillText}>
                          Stock: {p.stockQuantity} {p.unit}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.restockBtn}
                        onPress={() => {
                          setStockModalProduct(p)
                          setNewStockInput(String(p.stockQuantity))
                        }}
                      >
                        <Text style={styles.restockBtnText}>Edit Qty ✎</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Stock Switch & Delete */}
                  <View style={styles.prodRightControls}>
                    <Switch
                      value={p.isAvailable && p.stockQuantity > 0}
                      onValueChange={() => handleToggleStock(p)}
                      trackColor={{ false: '#475569', true: '#10b981' }}
                      thumbColor="#ffffff"
                    />
                    <Text
                      style={[
                        styles.availableText,
                        { color: p.isAvailable && p.stockQuantity > 0 ? '#10b981' : '#94a3b8' },
                      ]}
                    >
                      {p.isAvailable && p.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteProdBtn}
                      onPress={() => handleDeleteProduct(p.id, p.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ---------------- TAB 3: STATS & ANALYTICS ---------------- */}
        {activeTab === 'stats' && (
          <View style={styles.statsCard}>
            <Text style={styles.analyticsTitle}>📊 Store Performance Summary</Text>

            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Store Category</Text>
              <Text style={styles.analyticsVal}>{partner?.category || 'General Hub'}</Text>
            </View>

            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Total Orders Processed</Text>
              <Text style={styles.analyticsVal}>{stats?.total ?? orders.length}</Text>
            </View>

            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Total Revenue Generated</Text>
              <Text style={[styles.analyticsVal, { color: '#22c55e', fontSize: 16 }]}>
                ₹{stats?.revenue ?? orders.reduce((s, o) => s + (o.amount || 0), 0)}
              </Text>
            </View>

            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Successfully Delivered</Text>
              <Text style={styles.analyticsVal}>
                {stats?.delivered ?? orders.filter((o) => o.status === 'delivered').length}
              </Text>
            </View>

            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Orders Cancelled</Text>
              <Text style={[styles.analyticsVal, { color: '#ef4444' }]}>
                {stats?.cancelled ?? orders.filter((o) => o.status === 'cancelled').length}
              </Text>
            </View>

            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Total Catalog Items</Text>
              <Text style={styles.analyticsVal}>{products.length}</Text>
            </View>

            <TouchableOpacity style={styles.partnerLogoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.partnerLogoutText}>Sign Out from Store Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ---------------- MODAL 1: CANCEL ORDER REASON ---------------- */}
      <Modal visible={!!cancelModalOrder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Order #{cancelModalOrder?.id}</Text>
              <TouchableOpacity onPress={() => setCancelModalOrder(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Please select reason for cancelling customer order:
            </Text>

            <View style={styles.reasonList}>
              {CANCEL_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.reasonOption,
                    cancelReason === r && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(r)}
                >
                  <Ionicons
                    name={cancelReason === r ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={cancelReason === r ? '#10b981' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      cancelReason === r && styles.reasonTextSelected,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>ADDITIONAL NOTE (OPTIONAL)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Fresh batch arriving tomorrow morning"
              placeholderTextColor="#94a3b8"
              value={cancelNote}
              onChangeText={setCancelNote}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalOrder(null)}
              >
                <Text style={styles.modalCancelText}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                disabled={cancelLoading}
                onPress={handleConfirmCancel}
              >
                {cancelLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- MODAL 2: QUICK RESTOCK ---------------- */}
      <Modal visible={!!stockModalProduct} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Stock: {stockModalProduct?.name}</Text>
              <TouchableOpacity onPress={() => setStockModalProduct(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Enter new available inventory count:</Text>

            <TextInput
              style={[styles.modalInput, { fontSize: 20, textAlign: 'center' }]}
              keyboardType="number-pad"
              value={newStockInput}
              onChangeText={setNewStockInput}
            />

            {/* Quick Increment Buttons */}
            <View style={styles.quickIncsRow}>
              {[10, 20, 50, 100].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.incBtn}
                  onPress={() => setNewStockInput(String(num))}
                >
                  <Text style={styles.incBtnText}>Set {num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStockModalProduct(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtnGreen}
                disabled={stockLoading}
                onPress={handleSaveStock}
              >
                {stockLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- MODAL 3: ADD PRODUCT ---------------- */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product to Store</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>PRODUCT NAME (ENGLISH)*</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Chocolate Truffle Cake"
                placeholderTextColor="#94a3b8"
                value={newProdName}
                onChangeText={setNewProdName}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>TAMIL NAME (OPTIONAL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. சாக்லேட் கேக்"
                placeholderTextColor="#94a3b8"
                value={newProdTamil}
                onChangeText={setNewProdTamil}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PRICE (₹)*</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 450"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={newProdPrice}
                    onChangeText={setNewProdPrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>UNIT*</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 500g / 1 kg"
                    placeholderTextColor="#94a3b8"
                    value={newProdUnit}
                    onChangeText={setNewProdUnit}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>INITIAL STOCK QUANTITY</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 25"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={newProdStock}
                onChangeText={setNewProdStock}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Brief description of product"
                placeholderTextColor="#94a3b8"
                multiline
                value={newProdDesc}
                onChangeText={setNewProdDesc}
              />

              <View style={[styles.modalActions, { marginTop: 18 }]}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtnGreen}
                  disabled={addLoading}
                  onPress={handleCreateProduct}
                >
                  {addLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Publish Product</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  topBar: {
    backgroundColor: '#1e293b',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  logoutSmallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginContent: {
    padding: 20,
    gap: 16,
  },
  brandHero: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  heroIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  demoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  demoBadge: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 6,
    marginBottom: 12,
  },
  demoList: {
    gap: 8,
  },
  demoPill: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoPillLeft: {
    flex: 1,
  },
  demoPillName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  demoPillDetails: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  demoUseBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  demoUseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#fca5a5',
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statsBar: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  listContent: {
    padding: 14,
    gap: 12,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingBannerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  idBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  idBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusRec: { backgroundColor: '#064e3b' },
  statusConf: { backgroundColor: '#1e3a8a' },
  statusPrep: { backgroundColor: '#78350f' },
  statusOut: { backgroundColor: '#7c2d12' },
  statusDel: { backgroundColor: '#065f46' },
  statusCanc: { backgroundColor: '#7f1d1d' },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  custAddress: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  custSlot: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
    marginTop: 2,
  },
  callCustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callCustText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  itemsBoxTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  itemsBoxText: {
    fontSize: 12,
    color: '#f8fafc',
    marginTop: 2,
  },
  riderAssignedBox: {
    backgroundColor: '#082f49',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  riderBoxTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  riderBoxName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
  },
  callRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  callRiderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelAlertBox: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cancelAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  cancelAlertSub: {
    fontSize: 11,
    color: '#fca5a5',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  orderAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  orderPaymentMode: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 8,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  prepareBtn: {
    backgroundColor: '#d97706',
  },
  cancelBtn: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    maxWidth: 90,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  waitingRiderPill: {
    flex: 1,
    backgroundColor: '#064e3b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  waitingRiderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  inventoryTopRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    borderRadius: 8,
    height: 44,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  productCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  prodTamil: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  prodPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 4,
  },
  prodUnit: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  stockPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockGood: {
    backgroundColor: '#064e3b',
  },
  stockLow: {
    backgroundColor: '#78350f',
  },
  stockPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  restockBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  restockBtnText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  prodRightControls: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  availableText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteProdBtn: {
    marginTop: 6,
    padding: 4,
  },
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  analyticsLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  analyticsVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  partnerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  partnerLogoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reasonOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  reasonText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  reasonTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnGreen: {
    flex: 1,
    backgroundColor: '#10b981',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  quickIncsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  incBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  incBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
})
