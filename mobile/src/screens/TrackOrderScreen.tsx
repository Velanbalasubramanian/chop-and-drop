import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import Header from '../components/Header'
import OrderStatusStep from '../components/OrderStatusStep'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { trackOrder, cancelOrder, requestOrderRefund } from '../api'
import { getSocket } from '../socket'
import type { OrderStatus, TrackedOrder } from '../types'

const cleanOrderId = (id: string) => String(id || '').replace(/^#/, '').trim().toUpperCase()

export default function TrackOrderScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { user, token } = useAuth()
  const { totalCount } = useCart()

  const isInsideTabs = route.name === 'TrackTab'

  // Ensure bottom tabs are always visible: if opened via root stack 'TrackOrder', switch to TrackTab inside MainTabs
  React.useEffect(() => {
    if (route?.name === 'TrackOrder') {
      navigation.replace('MainTabs', {
        screen: 'TrackTab',
        params: route.params,
      })
    }
  }, [route?.name, navigation, route?.params])

  const initialOrderId = cleanOrderId(route.params?.orderId || '')
  const initialPhone = route.params?.phone || user?.phone || ''

  const [orderId, setOrderId] = useState(initialOrderId)
  const [phone, setPhone] = useState(initialPhone)
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liveBanner, setLiveBanner] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('Changed my mind')
  const [customReason, setCustomReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')

  // Call Partner Modal state
  const [showCallModal, setShowCallModal] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  async function copyToClipboard(text: string) {
    if (!text) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2500)
    } catch {
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2500)
    }
  }

  const CANCEL_REASONS = [
    'Changed my mind',
    'Delivery time is too long',
    'Ordered wrong items / address',
    'Placed a duplicate order',
    'Found better price elsewhere',
    'Other reason',
  ]

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

  // Auto-search on mount or whenever route params change
  useEffect(() => {
    const targetOrderId = cleanOrderId(route.params?.orderId || initialOrderId || '')
    const targetPhone = route.params?.phone || initialPhone || user?.phone || phone || ''
    if (targetOrderId) {
      setOrderId(targetOrderId)
      if (targetPhone) setPhone(targetPhone)
      handleSearch(targetOrderId, targetPhone)
    }
  }, [route.params?.orderId, route.params?.phone, initialOrderId])

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

  async function handleConfirmCancel() {
    if (!order) return
    const reason = selectedReason === 'Other reason'
      ? (customReason.trim() || 'Other reason')
      : selectedReason

    setCancelLoading(true)
    try {
      const activePhone = phone.trim() || order.phone || user?.phone || ''
      const res = await cancelOrder(order.id, activePhone, reason, token)
      setOrder(res.order)
      setShowCancelModal(false)
      setCustomReason('')
      setCancelSuccessMsg('Your order has been cancelled successfully.')
      setLiveBanner(`Order #${order.id} was cancelled.`)
      setTimeout(() => setCancelSuccessMsg(''), 8000)
    } catch (err: any) {
      const errMsg = err.message || 'Could not cancel order. Please try again.'
      setError(errMsg)
      Alert.alert('Cancellation Error', errMsg)
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header title="Live Order Tracking" showBack={!isInsideTabs} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {cancelSuccessMsg ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.successBannerText}>{cancelSuccessMsg}</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.headerCancelBtn}
                    onPress={() => setShowCancelModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={14} color={THEME.colors.danger} />
                    <Text style={styles.headerCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <View
                  style={[
                    styles.statusBadge,
                    order.status === 'delivered' && styles.statusBadgeDelivered,
                    order.status === 'cancelled' && styles.statusBadgeCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      order.status === 'delivered' && styles.statusBadgeDeliveredText,
                      order.status === 'cancelled' && styles.statusBadgeCancelledText,
                    ]}
                  >
                    {order.status === 'delivered'
                      ? 'DELIVERED ✓'
                      : order.status === 'cancelled'
                      ? 'CANCELLED ✕'
                      : order.status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cancelled Banner if cancelled */}
            {order.status === 'cancelled' ? (
              <View style={styles.cancelledAlertBox}>
                <Ionicons name="close-circle" size={22} color={THEME.colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancelledAlertTitle}>Order Has Been Cancelled</Text>
                  <Text style={styles.cancelledAlertText}>
                    {order.cancelReason ? `Reason: "${order.cancelReason}"` : 'This order has been cancelled.'}
                  </Text>
                  {order.paymentMethod === 'online' && (
                    <Text style={styles.cancelledAlertSub}>
                      Online Payment · Refund requested and will reflect back in your account.
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              /* Live Sync Indicator */
              <View style={styles.liveSyncBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveSyncText}>Live Real-Time Sync Active</Text>
              </View>
            )}

            {/* Visual Stepper */}
            <View style={styles.stepperContainer}>
              <OrderStatusStep currentStatus={order.status} />
            </View>

            {/* Live Delivery Partner Card */}
            {order.riderName && order.status !== 'cancelled' ? (
              <View style={styles.riderCard}>
                <View style={styles.riderAvatar}>
                  <Ionicons name="bicycle" size={24} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riderTag}>DELIVERY PARTNER ASSIGNED</Text>
                  <Text style={styles.riderName}>{order.riderName}</Text>
                  <Text style={styles.riderStatus}>
                    {order.status === 'out_for_delivery'
                      ? '⚡ On the way with your package'
                      : order.status === 'delivered'
                      ? '✓ Delivered your package safely'
                      : 'Heading to store for pickup'}
                  </Text>
                </View>
                {order.riderPhone ? (
                  <TouchableOpacity
                    style={styles.riderCallBtn}
                    onPress={() => setShowCallModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={14} color="#ffffff" />
                    <Text style={styles.riderCallBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

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

            {/* Cancel Action Button (only if active) */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={() => setShowCancelModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color={THEME.colors.danger} />
                <Text style={styles.cancelActionText}>Cancel This Order</Text>
              </TouchableOpacity>
            )}

            {/* Quick Action Navigation Buttons */}
            <View style={styles.orderActionsContainer}>
              <TouchableOpacity
                style={styles.continueShoppingBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
              >
                <Ionicons name="home" size={18} color="#ffffff" />
                <Text style={styles.continueShoppingBtnText}>Return to Home Page</Text>
              </TouchableOpacity>

              <View style={styles.orderSecondaryActionsRow}>
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab' })}
                >
                  <Ionicons name="grid-outline" size={16} color={THEME.colors.primary} />
                  <Text style={styles.secondaryActionBtnText}>Browse Store</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('OrdersTab')}
                >
                  <Ionicons name="receipt-outline" size={16} color="#0f172a" />
                  <Text style={[styles.secondaryActionBtnText, { color: '#0f172a' }]}>My Orders</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={24} color={THEME.colors.danger} />
                <Text style={styles.modalTitle}>Cancel Order #{order?.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCancelModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Are you sure you want to cancel? Any items reserved from store stock will be immediately restored.
            </Text>

            <Text style={styles.reasonSectionTitle}>Reason for cancellation:</Text>
            <View style={styles.reasonsList}>
              {CANCEL_REASONS.map((r) => {
                const isSelected = selectedReason === r
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReason(r)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInnerCircle} />}
                    </View>
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {selectedReason === 'Other reason' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Please describe why you are cancelling..."
                value={customReason}
                onChangeText={setCustomReason}
                placeholderTextColor="#94a3b8"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.keepOrderBtn}
                onPress={() => setShowCancelModal(false)}
                disabled={cancelLoading}
              >
                <Text style={styles.keepOrderBtnText}>Keep Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleConfirmCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmCancelBtnText}>Yes, Cancel Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Call Delivery Partner In-App Modal */}
      <Modal
        visible={showCallModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCallModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callModalCard}>
            <View style={styles.callModalHeader}>
              <View style={styles.callModalIconBox}>
                <Ionicons name="call" size={26} color="#2563eb" />
              </View>
              <Text style={styles.callModalTitle}>Call Delivery Partner</Text>
              <Text style={styles.callModalSub}>
                Contact your assigned rider for order handover & delivery updates.
              </Text>
            </View>

            {/* Rider Details Card */}
            <View style={styles.callRiderBox}>
              <View style={styles.callRiderAvatar}>
                <Ionicons name="bicycle" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.callRiderName}>{order?.riderName || 'Delivery Partner'}</Text>
                <Text style={styles.callRiderPhone}>+91 {order?.riderPhone || ''}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyPhoneBtn}
                onPress={() => copyToClipboard(order?.riderPhone || '')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copiedPhone ? 'checkmark-circle' : 'copy-outline'}
                  size={15}
                  color={copiedPhone ? '#16a34a' : '#2563eb'}
                />
                <Text style={[styles.copyPhoneBtnText, copiedPhone && { color: '#16a34a' }]}>
                  {copiedPhone ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Actions */}
            <View style={styles.callModalActions}>
              <TouchableOpacity
                style={styles.dialBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (order?.riderPhone) {
                    Linking.openURL(`tel:${order.riderPhone}`).catch(() => {
                      Alert.alert('Dialer Unavailable', `Please dial +91 ${order.riderPhone} directly.`)
                    })
                  }
                }}
              >
                <Ionicons name="call" size={16} color="#ffffff" />
                <Text style={styles.dialBtnText}>Open Phone Dialer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeCallModalBtn}
                activeOpacity={0.7}
                onPress={() => setShowCallModal(false)}
              >
                <Text style={styles.closeCallModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Navigation Menu */}
      {!isInsideTabs && (
        <View style={styles.bottomNavContainer}>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
          >
            <Ionicons name="home-outline" size={18} color="#64748b" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab' })}
          >
            <Ionicons name="grid-outline" size={18} color="#64748b" />
            <Text style={styles.navLabel}>Store</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'CartTab' })}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name="bag-handle-outline" size={18} color="#64748b" />
              {totalCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalCount > 99 ? '99+' : totalCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.navLabel}>Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, styles.navItemActive]}
            activeOpacity={0.8}
            onPress={() => {
              if (order?.id) {
                handleSearch(order.id, phone)
              }
            }}
          >
            <View style={styles.activeIconCircle}>
              <Ionicons name="navigate" size={12} color="#ffffff" />
            </View>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Track</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
          >
            <Ionicons name="person-circle-outline" size={18} color="#64748b" />
            <Text style={styles.navLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      )}
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
  statusBadgeCancelled: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusBadgeCancelledText: {
    color: '#ef4444',
  },
  cancelledAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    gap: 10,
  },
  cancelledAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b91c1c',
  },
  cancelledAlertText: {
    fontSize: 12,
    color: '#7f1d1d',
    marginTop: 2,
    lineHeight: 16,
  },
  cancelledAlertSub: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 4,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  successBannerText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  cancelActionText: {
    fontSize: 13,
    color: THEME.colors.danger,
    fontWeight: '700',
  },
  headerCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  headerCancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 9999,
        } as any)
      : {}),
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 14,
  },
  reasonSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  reasonOptionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#fff7ed',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: THEME.colors.primary,
  },
  radioInnerCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: THEME.colors.primary,
  },
  reasonOptionText: {
    fontSize: 13,
    color: THEME.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  reasonOptionTextSelected: {
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#ffffff',
    color: THEME.colors.text,
    marginBottom: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  keepOrderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  keepOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmCancelBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: THEME.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  riderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  riderName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  riderStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginTop: 2,
  },
  riderCallBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderCallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderActionsContainer: {
    marginTop: 18,
    gap: 10,
  },
  continueShoppingBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  continueShoppingBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  orderSecondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryActionBtnText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    height: Platform.OS === 'ios' ? 74 : 58,
    paddingBottom: Platform.OS === 'ios' ? 18 : 6,
    paddingTop: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#fff7ed',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 2,
  },
  navLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  activeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: THEME.colors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  callModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  callModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  callModalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  callModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  callModalSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  callRiderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 18,
  },
  callRiderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callRiderName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  callRiderPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  copyPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  copyPhoneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  callModalActions: {
    gap: 10,
    width: '100%',
  },
  dialBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  dialBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  closeCallModalBtn: {
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeCallModalBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
})
