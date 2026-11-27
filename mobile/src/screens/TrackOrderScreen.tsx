import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import Header from '../components/Header'
import OrderStatusStep from '../components/OrderStatusStep'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { trackOrder, requestOrderRefund } from '../api'
import { getSocket } from '../socket'
import type { OrderStatus, TrackedOrder } from '../types'

const cleanOrderId = (id: string) => String(id || '').replace(/^#/, '').trim().toUpperCase()

export default function TrackOrderScreen() {
  const route = useRoute<any>()
  const { user, token } = useAuth()

  const initialOrderId = cleanOrderId(route.params?.orderId || '')
  const initialPhone = route.params?.phone || user?.phone || ''

  const [orderId, setOrderId] = useState(initialOrderId)
  const [phone, setPhone] = useState(initialPhone)
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liveBanner, setLiveBanner] = useState('')

  async function handleSearch(targetOrderId = orderId, targetPhone = phone) {
    const cleanTargetId = cleanOrderId(targetOrderId)
    if (!cleanTargetId) {
      Alert.alert('Required', 'Please enter your Order ID (e.g. ZP-F28204)')
      return
    }

    setLoading(true)
    setError('')
    setLiveBanner('')

    try {
      const data = await trackOrder(cleanTargetId, targetPhone.trim())
      setOrder(data)
    } catch (err: any) {
      setError(err.message || 'Could not find that order. Verify the Order ID.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-search on mount if params passed from checkout
  useEffect(() => {
    if (initialOrderId) {
      handleSearch(initialOrderId, initialPhone)
    }
  }, [initialOrderId])

  // Real-time WebSockets integration via Socket.IO
  useEffect(() => {
    if (!order?.id) return

    const socket = getSocket()
    const activeOrderId = cleanOrderId(order.id)

    // Join room for this specific order
    socket.emit('join_order', activeOrderId)

    function handleStatusUpdate(data: { orderId: string; status: OrderStatus }) {
      if (cleanOrderId(data.orderId) === activeOrderId) {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : null))
        const statusLabel = data.status.replace(/_/g, ' ').toUpperCase()
        setLiveBanner(`🟢 Real-Time Update: Order is now "${statusLabel}"!`)
        setTimeout(() => setLiveBanner(''), 8000)
      }
    }

    function handleRefundUpdate(data: TrackedOrder) {
      if (cleanOrderId(data.id) === activeOrderId) {
        setOrder((prev) => (prev ? { ...prev, ...data } : null))
        setLiveBanner(
          data.paymentStatus === 'refunded'
            ? `💸 Refund Approved! Ref: ${data.refundId || ''}`
            : '⏳ Refund update: Request is in review.'
        )
        setTimeout(() => setLiveBanner(''), 8000)
      }
    }

    function onSocketConnect() {
      socket.emit('join_order', activeOrderId)
      // Auto re-fetch latest data on reconnection
      trackOrder(activeOrderId, phone || order?.phone || '').then(setOrder).catch(() => {})
    }

    socket.on('connect', onSocketConnect)
    socket.on('order_status_updated', handleStatusUpdate)
    socket.on('order_refund_updated', handleRefundUpdate)

    return () => {
      socket.emit('leave_order', activeOrderId)
      socket.off('connect', onSocketConnect)
      socket.off('order_status_updated', handleStatusUpdate)
      socket.off('order_refund_updated', handleRefundUpdate)
    }
  }, [order?.id])

  // Periodic background auto-refresh fallback (every 3 seconds) until order is delivered
  useEffect(() => {
    if (!order?.id || order.status === 'delivered' || order.status === 'cancelled') return

    const activeId = cleanOrderId(order.id)
    const targetPhone = phone || order?.phone || ''

    const interval = setInterval(async () => {
      try {
        const fresh = await trackOrder(activeId, targetPhone)
        if (fresh && fresh.status) {
          setOrder((prev) => {
            if (!prev) return fresh
            if (prev.status !== fresh.status) {
              const statusLabel = fresh.status.replace(/_/g, ' ').toUpperCase()
              setLiveBanner(`🟢 Real-Time Update: Order is now "${statusLabel}"!`)
              setTimeout(() => setLiveBanner(''), 8000)
            }
            return { ...prev, ...fresh }
          })
        }
      } catch {}
    }, 3000)

    // Also auto-refresh when user switches back to this browser tab
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        trackOrder(activeId, targetPhone).then(setOrder).catch(() => {})
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
    }
  }, [order?.id, order?.status, phone])

  async function handleCancelRequest() {
    if (!order) return
    Alert.prompt
      ? Alert.prompt(
          'Cancel / Refund Request',
          'Please state your reason for cancellation:',
          async (reason) => {
            if (!reason) return
            try {
              if (token) {
                await requestOrderRefund(order.id, token, reason, phone || order.phone)
                Alert.alert('Request Sent', 'Your refund request has been submitted.')
                handleSearch()
              } else {
                Alert.alert('Action Required', 'Please log in to submit official refund requests.')
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not submit request.')
            }
          }
        )
      : Alert.alert(
          'Cancel Order',
          'Are you sure you want to cancel this order?',
          [
            { text: 'No' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                if (token) {
                  try {
                    await requestOrderRefund(order.id, token, 'Customer requested cancellation via mobile', phone || order.phone)
                    Alert.alert('Request Sent', 'Cancellation request submitted.')
                    handleSearch()
                  } catch (e: any) {
                    Alert.alert('Error', e.message)
                  }
                } else {
                  Alert.alert('Log In', 'Please log in to manage your order refund.')
                }
              },
            },
          ]
        )
  }

  return (
    <View style={styles.container}>
      <Header title="Live Order Tracking" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchCard}>
          <Text style={styles.searchCardTitle}>Track Where Your Morning Cut Is</Text>
          <Text style={styles.searchCardSub}>
            Real-time WebSockets tracking directly connected to Chennai kitchen dispatch.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Order ID (e.g. CD-8K3F2A)"
              placeholderTextColor="#94a3b8"
              value={orderId}
              onChangeText={setOrderId}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Phone number used for order"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => handleSearch()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#ffffff" />
                <Text style={styles.trackBtnText}>Track Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Live Event Banner */}
        {liveBanner ? (
          <View style={styles.liveBanner}>
            <Ionicons name="radio" size={18} color="#ffffff" />
            <Text style={styles.liveBannerText}>{liveBanner}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={THEME.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Tracked Order Details */}
        {order ? (
          <View style={styles.orderCard}>
            {/* Header with ID and Status */}
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderIdLabel}>Order Reference</Text>
                <Text style={styles.orderIdValue}>#{order.id}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  order.status === 'delivered' && styles.statusBadgeDelivered,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    order.status === 'delivered' && styles.statusBadgeDeliveredText,
                  ]}
                >
                  {order.status === 'delivered' ? 'DELIVERED ✓' : order.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Live Sync Indicator */}
            <View style={styles.liveSyncBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveSyncText}>Live Real-Time Sync Active</Text>
            </View>

            {/* Visual Stepper */}
            <View style={styles.stepperContainer}>
              <OrderStatusStep currentStatus={order.status} />
            </View>

            {/* Info Grid */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color={THEME.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Delivery Slot</Text>
                  <Text style={styles.infoValue}>{order.deliverySlot}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="basket-outline" size={18} color={THEME.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Items</Text>
                  <Text style={styles.infoValue}>{order.items}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={18} color={THEME.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Payment</Text>
                  <Text style={styles.infoValue}>
                    {order.paymentMethod?.toUpperCase()} · ₹{order.amount || 0} (
                    {order.paymentStatus || 'pending'})
                  </Text>
                </View>
              </View>
            </View>

            {/* Cancel / Refund Action */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={handleCancelRequest}
              >
                <Text style={styles.cancelActionText}>Need Help or Want to Cancel?</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  searchCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  searchCardSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  inputRow: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.text,
    backgroundColor: '#f8fafc',
  },
  trackBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  trackBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  liveBanner: {
    backgroundColor: THEME.colors.vegGreen,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  liveBannerText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 13,
    flex: 1,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveSyncText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  orderIdLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderIdValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  statusBadgeDelivered: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  statusBadgeDeliveredText: {
    color: '#047857',
  },
  stepperContainer: {
    paddingVertical: 16,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 1,
  },
  cancelActionBtn: {
    marginTop: 18,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelActionText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '600',
  },
})
