import React, { useEffect, useState, useCallback } from 'react'
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
import type { DeliveryOrder, DeliveryStats, Rider } from '../types'
import {
  acceptDeliveryOrder,
  completeDeliveryOrder,
  deliveryLogin,
  deliveryRegister,
  fetchDeliveryMe,
  fetchDeliveryOrders,
  fetchDeliveryStats,
  fetchDemoRiders,
  pickupDeliveryOrder,
  updateDutyStatus,
} from '../api'
import { getSocket } from '../socket'

const STORAGE_TOKEN_KEY = '@zippo_delivery_token'
const STORAGE_RIDER_KEY = '@zippo_delivery_rider'

export default function RiderScreen() {
  const navigation = useNavigation<any>()

  // Auth state
  const [token, setToken] = useState<string>('')
  const [rider, setRider] = useState<Rider | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Login & Register form state
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [demoRiders, setDemoRiders] = useState<Rider[]>([])

  // Registration specific state
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regVehicle, setRegVehicle] = useState('Two Wheeler / Bike')
  const [regZone, setRegZone] = useState('Chennai Central')

  // Dashboard data state
  const [activeTab, setActiveTab] = useState<'pickups' | 'active' | 'history' | 'profile'>('pickups')
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([])
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([])
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([])
  const [stats, setStats] = useState<DeliveryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)

  // Modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [deliveryConfirmOrder, setDeliveryConfirmOrder] = useState<DeliveryOrder | null>(null)

  // 1. Check existing saved rider credentials on launch
  useEffect(() => {
    async function initAuth() {
      try {
        const [savedToken, savedRiderStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TOKEN_KEY),
          AsyncStorage.getItem(STORAGE_RIDER_KEY),
        ])
        if (savedToken) {
          setToken(savedToken)
          if (savedRiderStr) {
            const parsed = JSON.parse(savedRiderStr)
            setRider(parsed)
            setIsOnline(parsed.status !== 'offline')
          }
        }
      } catch (err) {
        console.log('Error reading rider token:', err)
      } finally {
        setAuthLoading(false)
      }
    }
    initAuth()
    fetchDemoRiders().then(setDemoRiders).catch(() => {})
  }, [])

  // 2. Fetch Deliveries & Statistics
  const loadDashboardData = useCallback(async (authToken: string) => {
    if (!authToken) return
    try {
      const [orderRes, statRes, meRes] = await Promise.all([
        fetchDeliveryOrders(authToken),
        fetchDeliveryStats(authToken).catch(() => null),
        fetchDeliveryMe(authToken).catch(() => null),
      ])
      setAvailableOrders(orderRes.available)
      setActiveOrders(orderRes.myActive)
      setCompletedOrders(orderRes.completed)
      if (statRes) setStats(statRes)
      if (meRes) {
        setRider(meRes)
        setIsOnline(meRes.status !== 'offline')
        AsyncStorage.setItem(STORAGE_RIDER_KEY, JSON.stringify(meRes))
      }
    } catch (err: any) {
      console.log('Error fetching rider data:', err.message)
    }
  }, [])

  useEffect(() => {
    if (token) {
      setLoading(true)
      loadDashboardData(token).finally(() => setLoading(false))
    }
  }, [token, loadDashboardData])

  // 3. Real-time Socket.IO synchronization
  useEffect(() => {
    if (!token) return

    const socket = getSocket()

    function onConnect() {
      setSocketConnected(true)
      socket.emit('join_delivery', { token })
    }

    function onDisconnect() {
      setSocketConnected(false)
    }

    function onRefresh() {
      loadDashboardData(token)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('order_status_updated', onRefresh)
    socket.on('rider_assigned', onRefresh)
    socket.on('partner_order_created', onRefresh)

    if (socket.connected) {
      onConnect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('order_status_updated', onRefresh)
      socket.off('rider_assigned', onRefresh)
      socket.off('partner_order_created', onRefresh)
    }
  }, [token, loadDashboardData])

  // Pull-to-refresh
  async function handleRefresh() {
    if (!token) return
    setRefreshing(true)
    await loadDashboardData(token)
    setRefreshing(false)
  }

  // 4. Rider Login
  async function handleLogin(customPhone?: string, customPassword?: string) {
    const p = customPhone || phone
    const pass = customPassword || password
    if (!p.trim() || !pass.trim()) {
      setLoginError('Please enter phone number and password.')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    setRegisterSuccess('')
    try {
      const res = await deliveryLogin(p.trim(), pass.trim())
      setToken(res.token)
      setRider(res.rider)
      setIsOnline(res.rider.status !== 'offline')
      setPhone('')
      setPassword('')
      await Promise.all([
        AsyncStorage.setItem(STORAGE_TOKEN_KEY, res.token),
        AsyncStorage.setItem(STORAGE_RIDER_KEY, JSON.stringify(res.rider)),
      ])
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check phone and password.')
    } finally {
      setLoginLoading(false)
    }
  }

  // 4b. Rider Register
  async function handleRegister() {
    if (!regName.trim()) {
      setLoginError('Please enter your full name.')
      return
    }
    const cleanP = regPhone.trim().replace(/[\s\-()]/g, '')
    if (!cleanP || cleanP.length < 10) {
      setLoginError('Please enter a valid 10-digit mobile number.')
      return
    }
    if (!regPassword.trim() || regPassword.length < 4) {
      setLoginError('Password must be at least 4 characters long.')
      return
    }
    setLoginLoading(true)
    setLoginError('')
    setRegisterSuccess('')
    try {
      const res = await deliveryRegister(
        regName.trim(),
        cleanP,
        regPassword.trim(),
        regVehicle.trim() || 'Two Wheeler / Bike',
        regZone.trim() || 'Chennai Central'
      )
      // Reset all registration input fields to empty
      setRegName('')
      setRegPhone('')
      setRegPassword('')
      setRegVehicle('Two Wheeler / Bike')
      setRegZone('Chennai Central')

      // Switch to Sign In tab and show success banner
      setLoginError('')
      setRegisterSuccess(`✅ Account created for ${res.rider.name}! Please sign in with your password.`)
      setPhone(cleanP)
      setPassword('')
      setIsRegisterMode(false)
      fetchDemoRiders().then(setDemoRiders).catch(() => {})
      setTimeout(() => setRegisterSuccess(''), 10000)
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed. Please check details.')
    } finally {
      setLoginLoading(false)
    }
  }

  // 5. Rider Logout
  async function performLogout() {
    try {
      await AsyncStorage.removeItem(STORAGE_TOKEN_KEY)
      await AsyncStorage.removeItem(STORAGE_RIDER_KEY)
    } catch (e) {
      console.warn('Logout storage clear error:', e)
    }
    setToken('')
    setRider(null)
    setPhone('')
    setPassword('')
    setRegName('')
    setRegPhone('')
    setRegPassword('')
    setRegVehicle('Two Wheeler / Bike')
    setLoginError('')
    setRegisterSuccess('')
    setAvailableOrders([])
    setActiveOrders([])
    setCompletedOrders([])
    setStats(null)
    setActiveTab('pickups')
  }

  function handleLogout() {
    setShowLogoutModal(true)
  }

  // 6. Duty Toggle
  async function handleToggleDuty(value: boolean) {
    if (!token) return
    setIsOnline(value)
    try {
      const res = await updateDutyStatus(token, value ? 'online' : 'offline')
      setRider(res.rider)
      await AsyncStorage.setItem(STORAGE_RIDER_KEY, JSON.stringify(res.rider))
    } catch (err: any) {
      setIsOnline(!value)
      Alert.alert('Error', err.message || 'Failed to update duty status')
    }
  }

  // 7. Accept Pickup Action
  async function handleAcceptOrder(order: DeliveryOrder) {
    if (!token) return
    setActionLoadingId(order.id)
    try {
      const res = await acceptDeliveryOrder(token, order.id)
      Alert.alert('Order Accepted!', `Head to ${order.partnerStoreName || 'store'} to collect the items.`)
      await loadDashboardData(token)
      setActiveTab('active')
    } catch (err: any) {
      Alert.alert('Cannot Accept', err.message || 'Failed to accept order.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // 8. Confirm Pickup Action (changes to OUT_FOR_DELIVERY)
  async function handleConfirmPickup(order: DeliveryOrder) {
    if (!token) return
    setActionLoadingId(order.id)
    try {
      await pickupDeliveryOrder(token, order.id)
      Alert.alert('Order Picked Up!', `Order is now Out for Delivery. Navigate to customer at ${order.address}.`)
      await loadDashboardData(token)
    } catch (err: any) {
      Alert.alert('Pickup Failed', err.message || 'Could not update pickup status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // 9. Deliver Order Action (changes to DELIVERED)
  function handleConfirmDelivery(order: DeliveryOrder) {
    if (!token) return
    setDeliveryConfirmOrder(order)
  }

  async function executeCompleteDelivery(order: DeliveryOrder) {
    if (!token) return
    setActionLoadingId(order.id)
    try {
      await completeDeliveryOrder(token, order.id)
      await loadDashboardData(token)
      setActiveTab('history')
    } catch (err: any) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Delivery Error:\n\n${err.message || 'Could not complete delivery.'}`)
      } else {
        Alert.alert('Delivery Error', err.message || 'Could not complete delivery.')
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  // External Linking Helpers
  function callNumber(num?: string) {
    if (!num) return
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert('Dialer Error', 'Could not open phone dialer.')
    })
  }

  function openDirections(destination: string) {
    if (!destination) return
    const encoded = encodeURIComponent(destination)
    const url = Platform.select({
      ios: `https://maps.apple.com/?q=${encoded}`,
      android: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    })
    Linking.openURL(url!).catch(() => {
      Alert.alert('Maps Error', 'Could not open maps navigation.')
    })
  }

  // ---------------- VIEW 1: LOADING STATE ----------------
  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Initializing Zippo Rider Portal…</Text>
      </View>
    )
  }

  // ---------------- VIEW 2: LOGIN SCREEN ----------------
  if (!token) {
    return (
      <View style={styles.container}>
        {/* Top Bar with Back Arrow */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Delivery Partner Portal</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.loginContent} showsVerticalScrollIndicator={false}>
          {/* Logo / Badge */}
          <View style={styles.brandHero}>
            <View style={styles.heroIconBox}>
              <Ionicons name="bicycle" size={44} color="#f97316" />
            </View>
            <Text style={styles.heroTitle}>Zippo Delivery Partner</Text>
            <Text style={styles.heroSub}>
              Rider Mobile App for Order Pickups & Deliveries (Android & iOS)
            </Text>
          </View>

          {/* Quick Demo Rider Accounts */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <Ionicons name="flash" size={16} color="#16a34a" />
              <Text style={styles.demoHeaderText}>QUICK DEMO RIDER SIGN IN</Text>
              <Text style={styles.demoBadge}>LIVE READY</Text>
            </View>
            <Text style={styles.demoSub}>
              Tap any rider below to log in instantly with default credentials (Password: RIDER123):
            </Text>

            <View style={styles.demoList}>
              {demoRiders.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.demoPill}
                  disabled={loginLoading}
                  onPress={() => {
                    setPhone(r.phone)
                    setPassword('RIDER123')
                    handleLogin(r.phone, 'RIDER123')
                  }}
                >
                  <View style={styles.demoPillLeft}>
                    <Text style={styles.demoPillName}>🛵 {r.name}</Text>
                    <Text style={styles.demoPillDetails}>
                      {r.vehicle} • {r.phone}
                    </Text>
                  </View>
                  <View style={styles.demoUseBtn}>
                    <Text style={styles.demoUseText}>Login →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Manual Login & Register Card */}
          <View style={styles.formCard}>
            {/* Toggle Tabs */}
            <View style={styles.authModeToggle}>
              <TouchableOpacity
                style={[styles.authModeBtn, !isRegisterMode && styles.authModeBtnActive]}
                onPress={() => { setIsRegisterMode(false); setLoginError(''); setRegisterSuccess('') }}
                activeOpacity={0.8}
              >
                <Text style={[styles.authModeBtnText, !isRegisterMode && styles.authModeBtnTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authModeBtn, isRegisterMode && styles.authModeBtnActive]}
                onPress={() => { setIsRegisterMode(true); setLoginError(''); setRegisterSuccess('') }}
                activeOpacity={0.8}
              >
                <Text style={[styles.authModeBtnText, isRegisterMode && styles.authModeBtnTextActive]}>
                  Register New Partner
                </Text>
              </TouchableOpacity>
            </View>

            {registerSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={styles.successText}>{registerSuccess}</Text>
              </View>
            ) : null}

            {loginError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {isRegisterMode ? (
              /* REGISTER FORM */
              <>
                <Text style={styles.inputLabel}>RIDER FULL NAME</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ragunath"
                    placeholderTextColor="#94a3b8"
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>MOBILE NUMBER (10 DIGITS)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 9840123456"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={regPhone}
                    onChangeText={setRegPhone}
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password (min 4 characters)"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={regPassword}
                    onChangeText={setRegPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>VEHICLE TYPE</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="bicycle-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Honda Activa / Bike"
                    placeholderTextColor="#94a3b8"
                    value={regVehicle}
                    onChangeText={setRegVehicle}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loginLoading && styles.btnDisabled, { marginTop: 20 }]}
                  disabled={loginLoading}
                  onPress={() => handleRegister()}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Register &amp; Start Delivering →</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 14, alignItems: 'center' }}
                  onPress={() => { setIsRegisterMode(false); setLoginError(''); setRegisterSuccess('') }}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                    Already have an account? <Text style={{ color: '#ea580c', fontWeight: '700' }}>Sign In here</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* LOGIN FORM */
              <>
                <Text style={styles.inputLabel}>RIDER REGISTERED PHONE (10 DIGITS)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 9840123456"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password (e.g. RIDER123)"
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
                    <Text style={styles.primaryBtnText}>Sign In as Delivery Partner →</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 14, alignItems: 'center' }}
                  onPress={() => { setIsRegisterMode(true); setLoginError(''); setRegisterSuccess('') }}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                    Don't have an account? <Text style={{ color: '#ea580c', fontWeight: '700' }}>Register here</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    )
  }

  // ---------------- VIEW 3: MAIN RIDER DASHBOARD ----------------
  return (
    <View style={styles.container}>
      {/* Rider Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Zippo Rider Portal</Text>
          <View style={styles.onlineStatusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: socketConnected ? '#22c55e' : '#eab308' },
              ]}
            />
            <Text style={styles.statusDotText}>
              {socketConnected ? 'Live Real-Time Sync' : 'Connecting to Hub…'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutSmallBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Duty Status Strip */}
      <View style={[styles.dutyStrip, isOnline ? styles.dutyOnline : styles.dutyOffline]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.dutyRiderName}>{rider?.name || 'Rider'}</Text>
            <Text style={styles.dutyRating}>⭐ {rider?.rating || 4.9}</Text>
          </View>
          <Text style={styles.dutyVehicle}>
            {rider?.vehicle || 'Two Wheeler'} • {isOnline ? '🟢 On Duty (Receiving Orders)' : '🔴 Off Duty (Resting)'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggleDuty}
          trackColor={{ false: '#64748b', true: '#16a34a' }}
          thumbColor={isOnline ? '#ffffff' : '#f1f5f9'}
        />
      </View>

      {/* Today's Earnings Bar */}
      <View style={styles.earningsStrip}>
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>TODAY EARNED</Text>
          <Text style={styles.earningsValue}>₹{stats?.totalEarnings ?? completedOrders.length * 50}</Text>
        </View>
        <View style={styles.earningsDivider} />
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>DELIVERED</Text>
          <Text style={styles.earningsValue}>{stats?.completedCount ?? completedOrders.length}</Text>
        </View>
        <View style={styles.earningsDivider} />
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>COD TO DEPOSIT</Text>
          <Text style={[styles.earningsValue, { color: '#f59e0b' }]}>₹{stats?.codCashCollected ?? 0}</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pickups' && styles.tabItemActive]}
          onPress={() => setActiveTab('pickups')}
        >
          <Ionicons
            name="cube-outline"
            size={18}
            color={activeTab === 'pickups' ? '#f97316' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'pickups' && styles.tabTextActive]}>
            Pickups ({availableOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'active' && styles.tabItemActive]}
          onPress={() => setActiveTab('active')}
        >
          <Ionicons
            name="bicycle-outline"
            size={18}
            color={activeTab === 'active' ? '#f97316' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={18}
            color={activeTab === 'history' ? '#f97316' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({completedOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={activeTab === 'profile' ? '#f97316' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Contents */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#f97316" />}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#f97316" />
            <Text style={styles.loadingBannerText}>Syncing deliveries…</Text>
          </View>
        )}

        {/* ---------------- TAB 1: AVAILABLE PICKUPS ---------------- */}
        {activeTab === 'pickups' && (
          <>
            {!isOnline && (
              <View style={styles.offlineNotice}>
                <Ionicons name="information-circle" size={20} color="#f59e0b" />
                <Text style={styles.offlineNoticeText}>
                  You are currently Off Duty. Toggle online above to accept deliveries.
                </Text>
              </View>
            )}

            {availableOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cafe-outline" size={54} color="#64748b" />
                <Text style={styles.emptyTitle}>No Orders Pending Pickup</Text>
                <Text style={styles.emptySub}>
                  All orders in your zone are currently assigned. New pickups appear here in real time!
                </Text>
              </View>
            ) : (
              availableOrders.map((ord) => (
                <View key={ord.id} style={styles.orderCard}>
                  {/* Top Bar of Card */}
                  <View style={styles.cardHeader}>
                    <View style={styles.idBadge}>
                      <Text style={styles.idBadgeText}>#{ord.id}</Text>
                    </View>
                    <View style={styles.payoutBadge}>
                      <Text style={styles.payoutBadgeText}>+ ₹50 Payout</Text>
                    </View>
                  </View>

                  {/* Merchant Node */}
                  <View style={styles.routeItem}>
                    <View style={[styles.routeIconBox, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="storefront" size={18} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeType}>PICK UP FROM STORE</Text>
                      <Text style={styles.routeName}>{ord.partnerStoreName || 'Zippo Hub'}</Text>
                      <Text style={styles.routeAddress}>📍 {ord.partnerAddress || 'Chennai Hub'}</Text>
                      <View style={styles.quickLinks}>
                        {ord.partnerPhone ? (
                          <TouchableOpacity
                            style={styles.quickLinkBtn}
                            onPress={() => callNumber(ord.partnerPhone)}
                          >
                            <Ionicons name="call" size={14} color="#0284c7" />
                            <Text style={styles.quickLinkText}>Call Store</Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={styles.quickLinkBtn}
                          onPress={() => openDirections((ord.partnerStoreName || '') + ' ' + (ord.partnerAddress || ''))}
                        >
                          <Ionicons name="navigate" size={14} color="#0284c7" />
                          <Text style={styles.quickLinkText}>Directions</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Customer Node */}
                  <View style={[styles.routeItem, { marginTop: 10 }]}>
                    <View style={[styles.routeIconBox, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="person" size={18} color="#d97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeType}>DELIVER TO CUSTOMER</Text>
                      <Text style={styles.routeName}>{ord.name}</Text>
                      <Text style={styles.routeAddress}>📍 {ord.address}</Text>
                      <Text style={styles.routeSlot}>⏱ Slot: {ord.deliverySlot}</Text>
                    </View>
                  </View>

                  {/* Items & Payment Info */}
                  <View style={styles.orderFooterInfo}>
                    <Text style={styles.footerItemsText} numberOfLines={1}>
                      📦 Items: {ord.items}
                    </Text>
                    <View style={styles.paymentTag}>
                      <Text style={styles.paymentTagText}>
                        {ord.paymentMethod === 'cod'
                          ? `COD • Collect ₹${ord.amount || 0}`
                          : `Paid Online • ₹${ord.amount || 0}`}
                      </Text>
                    </View>
                  </View>

                  {/* Accept Button */}
                  <TouchableOpacity
                    style={[styles.acceptBtn, actionLoadingId === ord.id && styles.btnDisabled]}
                    disabled={actionLoadingId === ord.id}
                    onPress={() => handleAcceptOrder(ord)}
                  >
                    {actionLoadingId === ord.id ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="flash" size={18} color="#ffffff" />
                        <Text style={styles.acceptBtnText}>Accept Delivery (Earn ₹50)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* ---------------- TAB 2: ACTIVE DELIVERIES ---------------- */}
        {activeTab === 'active' && (
          <>
            {activeOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bicycle-outline" size={54} color="#64748b" />
                <Text style={styles.emptyTitle}>No Active Deliveries</Text>
                <Text style={styles.emptySub}>
                  Switch to the Pickups tab to accept available orders in your zone!
                </Text>
              </View>
            ) : (
              activeOrders.map((ord) => {
                const isOut = ord.status === 'out_for_delivery'
                return (
                  <View key={ord.id} style={[styles.orderCard, styles.activeCardBorder]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.idBadgeActive}>
                        <Text style={styles.idBadgeTextActive}>#{ord.id}</Text>
                      </View>
                      <View style={[styles.statusBadge, isOut ? styles.statusOut : styles.statusPrep]}>
                        <Text style={styles.statusBadgeText}>
                          {isOut ? '🚀 OUT FOR DELIVERY' : '🏪 READY FOR PICKUP'}
                        </Text>
                      </View>
                    </View>

                    {/* Store Contact & Navigation */}
                    <View style={styles.routeItem}>
                      <View style={[styles.routeIconBox, { backgroundColor: '#e0f2fe' }]}>
                        <Ionicons name="storefront" size={18} color="#0284c7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeType}>PICKUP LOCATION</Text>
                        <Text style={styles.routeName}>{ord.partnerStoreName || 'Zippo Store'}</Text>
                        <Text style={styles.routeAddress}>📍 {ord.partnerAddress || 'Chennai Hub'}</Text>
                        <View style={styles.quickLinks}>
                          {ord.partnerPhone ? (
                            <TouchableOpacity
                              style={styles.quickLinkBtn}
                              onPress={() => callNumber(ord.partnerPhone)}
                            >
                              <Ionicons name="call" size={14} color="#0284c7" />
                              <Text style={styles.quickLinkText}>Call Merchant</Text>
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity
                            style={styles.quickLinkBtn}
                            onPress={() => openDirections((ord.partnerStoreName || '') + ' ' + (ord.partnerAddress || ''))}
                          >
                            <Ionicons name="navigate" size={14} color="#0284c7" />
                            <Text style={styles.quickLinkText}>Merchant Map</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Customer Contact & Navigation */}
                    <View style={[styles.routeItem, { marginTop: 12 }]}>
                      <View style={[styles.routeIconBox, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="person" size={18} color="#d97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeType}>CUSTOMER DESTINATION</Text>
                        <Text style={styles.routeName}>{ord.name}</Text>
                        <Text style={styles.routeAddress}>📍 {ord.address}</Text>
                        <View style={styles.quickLinks}>
                          <TouchableOpacity
                            style={styles.quickLinkBtnOrange}
                            onPress={() => callNumber(ord.phone)}
                          >
                            <Ionicons name="call" size={14} color="#ea580c" />
                            <Text style={styles.quickLinkTextOrange}>Call Customer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickLinkBtnOrange}
                            onPress={() => openDirections(ord.address)}
                          >
                            <Ionicons name="navigate" size={14} color="#ea580c" />
                            <Text style={styles.quickLinkTextOrange}>Customer Map</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Items Checklist Box */}
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsBoxTitle}>ORDER ITEMS:</Text>
                      <Text style={styles.itemsBoxContent}>{ord.items}</Text>
                    </View>

                    {/* Payment Instruction Banner */}
                    <View
                      style={[
                        styles.paymentBanner,
                        ord.paymentMethod === 'cod' ? styles.paymentCod : styles.paymentOnline,
                      ]}
                    >
                      <Ionicons
                        name={ord.paymentMethod === 'cod' ? 'cash' : 'checkmark-circle'}
                        size={18}
                        color={ord.paymentMethod === 'cod' ? '#b45309' : '#15803d'}
                      />
                      <Text
                        style={[
                          styles.paymentBannerText,
                          { color: ord.paymentMethod === 'cod' ? '#b45309' : '#15803d' },
                        ]}
                      >
                        {ord.paymentMethod === 'cod'
                          ? `COLLECT CASH ON DELIVERY: ₹${ord.amount || 0}`
                          : `PAID ONLINE (No cash to collect): ₹${ord.amount || 0}`}
                      </Text>
                    </View>

                    {/* Step Action Button */}
                    {!isOut ? (
                      <TouchableOpacity
                        style={[styles.pickupBtn, actionLoadingId === ord.id && styles.btnDisabled]}
                        disabled={actionLoadingId === ord.id}
                        onPress={() => handleConfirmPickup(ord)}
                      >
                        {actionLoadingId === ord.id ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="cube" size={18} color="#ffffff" />
                            <Text style={styles.pickupBtnText}>Confirm Store Pickup ➔ Out for Delivery</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.deliverBtn, actionLoadingId === ord.id && styles.btnDisabled]}
                        disabled={actionLoadingId === ord.id}
                        onPress={() => handleConfirmDelivery(ord)}
                      >
                        {actionLoadingId === ord.id ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                            <Text style={styles.deliverBtnText}>Hand Over & Confirm Delivered</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })
            )}
          </>
        )}

        {/* ---------------- TAB 3: DELIVERED HISTORY ---------------- */}
        {activeTab === 'history' && (
          <>
            {completedOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={54} color="#64748b" />
                <Text style={styles.emptyTitle}>No Completed Deliveries Yet</Text>
                <Text style={styles.emptySub}>
                  Orders you complete today will be recorded here with your earnings summary.
                </Text>
              </View>
            ) : (
              completedOrders.map((ord) => (
                <View key={ord.id} style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.idBadgeText}>#{ord.id}</Text>
                    <View style={styles.completedTag}>
                      <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                      <Text style={styles.completedTagText}>DELIVERED</Text>
                    </View>
                  </View>
                  <Text style={styles.historyCustomer}>{ord.name} • {ord.address}</Text>
                  <Text style={styles.historyItems}>Items: {ord.items}</Text>
                  <View style={styles.historyFooter}>
                    <Text style={styles.historySlot}>Slot: {ord.deliverySlot}</Text>
                    <Text style={styles.historyFee}>Fee Earned: +₹50</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ---------------- TAB 4: RIDER PROFILE ---------------- */}
        {activeTab === 'profile' && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarBox}>
              <Ionicons name="bicycle" size={40} color="#f97316" />
            </View>
            <Text style={styles.profileName}>{rider?.name || 'Rider'}</Text>
            <Text style={styles.profilePhone}>+91 {rider?.phone || ''}</Text>
            <Text style={styles.profileRating}>⭐ {rider?.rating || 4.9} Partner Rating</Text>

            <View style={styles.profileDivider} />

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Vehicle</Text>
              <Text style={styles.profileVal}>{rider?.vehicle || 'Two Wheeler'}</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Assigned Zone</Text>
              <Text style={styles.profileVal}>{rider?.zone || 'Chennai Hub'}</Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Duty Status</Text>
              <Text style={[styles.profileVal, { color: isOnline ? '#16a34a' : '#ef4444' }]}>
                {isOnline ? 'Online (Active)' : 'Offline (Paused)'}
              </Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Rate per Delivery</Text>
              <Text style={styles.profileVal}>₹50 / successful delivery</Text>
            </View>

            <TouchableOpacity style={styles.profileLogoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.profileLogoutText}>Log Out from Rider Mode</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Custom Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBoxDanger}>
              <Ionicons name="log-out-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out from Delivery Partner mode?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDestructiveBtn}
                onPress={() => {
                  setShowLogoutModal(false)
                  performLogout()
                }}
              >
                <Text style={styles.modalDestructiveBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Complete Delivery Confirmation Modal */}
      <Modal
        visible={!!deliveryConfirmOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setDeliveryConfirmOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBoxSuccess}>
              <Ionicons name="checkmark-circle-outline" size={34} color="#22c55e" />
            </View>
            <Text style={styles.modalTitle}>Complete Delivery</Text>
            <Text style={styles.modalMessage}>
              {deliveryConfirmOrder?.paymentMethod === 'cod'
                ? `Confirm cash collection of ₹${deliveryConfirmOrder?.amount || 0} from ${deliveryConfirmOrder?.name}?`
                : `Confirm delivery handover of order #${deliveryConfirmOrder?.id} to ${deliveryConfirmOrder?.name}?`}
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                disabled={actionLoadingId !== null}
                onPress={() => setDeliveryConfirmOrder(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSuccessBtn}
                disabled={actionLoadingId !== null}
                onPress={async () => {
                  if (!deliveryConfirmOrder) return
                  const orderToComplete = deliveryConfirmOrder
                  setDeliveryConfirmOrder(null)
                  await executeCompleteDelivery(orderToComplete)
                }}
              >
                {actionLoadingId ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSuccessBtnText}>Confirm Delivered</Text>
                )}
              </TouchableOpacity>
            </View>
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
    fontSize: 17,
    fontWeight: '700',
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
    borderColor: '#f97316',
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
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  demoBadge: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: '700',
    color: '#22c55e',
    backgroundColor: '#052e16',
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
    backgroundColor: '#f97316',
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
  authModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  authModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  authModeBtnActive: {
    backgroundColor: '#ea580c',
  },
  authModeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  authModeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#052e16',
    borderColor: '#22c55e',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  successText: {
    fontSize: 12,
    color: '#86efac',
    fontWeight: '600',
    flex: 1,
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
    backgroundColor: '#f97316',
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
  dutyStrip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dutyOnline: {
    backgroundColor: '#064e3b',
  },
  dutyOffline: {
    backgroundColor: '#451a03',
  },
  dutyRiderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  dutyRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fef08a',
  },
  dutyVehicle: {
    fontSize: 12,
    color: '#d1fae5',
    marginTop: 2,
  },
  earningsStrip: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  earningsBox: {
    flex: 1,
    alignItems: 'center',
  },
  earningsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22c55e',
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
    borderBottomColor: '#f97316',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#f97316',
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
  offlineNotice: {
    backgroundColor: '#78350f',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineNoticeText: {
    fontSize: 12,
    color: '#fef3c7',
    flex: 1,
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
  activeCardBorder: {
    borderColor: '#f97316',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  idBadgeActive: {
    backgroundColor: '#7c2d12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  idBadgeTextActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fdba74',
  },
  payoutBadge: {
    backgroundColor: '#052e16',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payoutBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ade80',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPrep: {
    backgroundColor: '#1e3a8a',
  },
  statusOut: {
    backgroundColor: '#7c2d12',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 1,
  },
  routeAddress: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  routeSlot: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '700',
    marginTop: 2,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  quickLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0c4a6e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  quickLinkBtnOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c2d12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickLinkTextOrange: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fdba74',
  },
  orderFooterInfo: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },
  footerItemsText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  paymentTag: {
    alignSelf: 'flex-start',
  },
  paymentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22c55e',
  },
  acceptBtn: {
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 8,
    marginTop: 12,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  itemsBoxTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  itemsBoxContent: {
    fontSize: 12,
    color: '#f8fafc',
    marginTop: 2,
  },
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  paymentCod: {
    backgroundColor: '#fef3c7',
  },
  paymentOnline: {
    backgroundColor: '#dcfce7',
  },
  paymentBannerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pickupBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 8,
    marginTop: 12,
  },
  pickupBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deliverBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 8,
    marginTop: 12,
  },
  deliverBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#052e16',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ade80',
  },
  historyCustomer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  historyItems: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  historySlot: {
    fontSize: 11,
    color: '#64748b',
  },
  historyFee: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22c55e',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileAvatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  profilePhone: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  profileRating: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fef08a',
    marginTop: 4,
  },
  profileDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  profileRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  profileLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  profileVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  profileLogoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconBoxDanger: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#450a0a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  modalIconBoxSuccess: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#052e16',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  modalDestructiveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDestructiveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSuccessBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSuccessBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
})
