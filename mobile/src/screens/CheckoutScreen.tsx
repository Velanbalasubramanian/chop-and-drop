import React, { useRef, useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Header from '../components/Header'
import PaymentModal from '../components/PaymentModal'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { submitOrder } from '../api'
import type { OrderPayload, PaymentMethod } from '../types'

const SAVED_ADDRESS_KEY = '@zippo_saved_address'

const SLOTS = [
  { id: '6-7am', label: '6:00 AM – 7:00 AM', tag: 'Early Morning Kitchen' },
  { id: '7-8am', label: '7:00 AM – 8:00 AM', tag: 'Most Popular for Breakfast' },
  { id: '8-9am', label: '8:00 AM – 9:00 AM', tag: 'Regular Morning' },
  { id: '9-10am', label: '9:00 AM – 10:00 AM', tag: 'Mid Morning' },
]

export default function CheckoutScreen() {
  const navigation = useNavigation<any>()
  const scrollRef = useRef<any>(null)
  const { user, token, loading: authLoading } = useAuth()
  const { items, formatForOrder, totalPrice, clearCart } = useCart()

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [address, setAddress] = useState('')
  const [slot, setSlot] = useState(SLOTS[0].label)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Validation & Error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)
  const [phoneError, setPhoneError] = useState(false)
  const [addressError, setAddressError] = useState(false)

  // Placed order success modal state
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string
    slot: string
    method: string
  } | null>(null)

  // Load saved address from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(SAVED_ADDRESS_KEY)
      .then((saved) => {
        if (saved && saved.trim().length > 0) {
          setAddress(saved.trim())
        }
      })
      .catch(() => {})
  }, [])

  // Sync user details if they change or if user logs in while on screen
  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name)
      if (!phone && user.phone) setPhone(user.phone)
      if (!email && user.email) setEmail(user.email)
    }
  }, [user])

  const itemsFormatted = formatForOrder()

  function validateForm(): boolean {
    setErrorMessage(null)
    setNameError(false)
    setPhoneError(false)
    setAddressError(false)

    if (!user || !token) {
      setErrorMessage('You must log in to your account to place an order.')
      return false
    }

    if (!name.trim()) {
      setNameError(true)
      setErrorMessage('Please enter your contact name.')
      scrollRef.current?.scrollTo({ y: 0, animated: true })
      return false
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setPhoneError(true)
      setErrorMessage('Please provide a valid 10-digit mobile number.')
      scrollRef.current?.scrollTo({ y: 0, animated: true })
      return false
    }
    if (!address.trim()) {
      setAddressError(true)
      setErrorMessage('Delivery Address is required! Please fill in your delivery address above.')
      scrollRef.current?.scrollTo({ y: 150, animated: true })
      return false
    }

    return true
  }

  async function handleProceed() {
    if (!validateForm()) return

    if (paymentMethod === 'online') {
      setShowPaymentModal(true)
    } else {
      await finalizeOrder('pending', undefined)
    }
  }

  async function finalizeOrder(paymentStatus: 'pending' | 'paid', transactionId?: string) {
    setShowPaymentModal(false)
    setLoading(true)
    setErrorMessage(null)

    const payload: OrderPayload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      deliverySlot: slot,
      items: itemsFormatted || 'Custom Fresh Cut Order',
      notes: notes.trim() || undefined,
      paymentMethod,
      paymentStatus,
      amount: totalPrice,
      transactionId,
      cartItems: (items || []).map((ci) => ({
        productId: ci.productId,
        name: ci.productId,
        quantity: ci.quantity,
      })),
    }

    try {
      const res = await submitOrder(payload, token)
      // Save address for fast future checkouts
      AsyncStorage.setItem(SAVED_ADDRESS_KEY, address.trim()).catch(() => {})
      clearCart()

      // Show dedicated in-screen success confirmation
      setPlacedOrder({
        orderId: res.orderId,
        slot,
        method: paymentMethod === 'online' ? 'Online UPI' : 'Cash on Delivery (COD)',
      })

      // Auto-transition directly to live tracking screen with persistent bottom tabs
      setTimeout(() => {
        navigation.replace('MainTabs', {
          screen: 'TrackTab',
          params: {
            orderId: res.orderId,
            phone: phone.trim(),
          },
        })
      }, 1800)
    } catch (err: any) {
      const msg = err.message || 'Could not place your order. Please try again.'
      setErrorMessage(msg)
      scrollRef.current?.scrollToEnd({ animated: true })
    } finally {
      setLoading(false)
    }
  }

  // 1. Loading auth state
  if (authLoading) {
    return (
      <View style={styles.container}>
        <Header title="Delivery & Checkout" showCart={false} showBack />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Checking login session...</Text>
        </View>
      </View>
    )
  }

  // 2. Auth Gate: login panna mattum order place aganum ilana agakudathu
  if (!user || !token) {
    return (
      <View style={styles.container}>
        <Header title="Delivery & Checkout" showCart={false} showBack />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Order Summary reminder */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>Ordering Items ({totalPrice > 0 ? `₹${totalPrice}` : ''})</Text>
            <Text style={styles.summaryItems}>{itemsFormatted || 'Custom Fresh Cut Order'}</Text>
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>₹{totalPrice}</Text>
            </View>
          </View>

          {/* Auth Gate Card */}
          <View style={styles.authGateCard}>
            <View style={styles.authGateIconCircle}>
              <Ionicons name="lock-closed" size={32} color={THEME.colors.primary} />
            </View>
            <Text style={styles.authGateTitle}>Sign In to Place Order</Text>
            <Text style={styles.authGateSub}>
              Order place panna login theva. Please log in with OTP or your account to confirm delivery address and track real-time delivery updates.
            </Text>

            <TouchableOpacity
              style={styles.authGatePrimaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('OtpLogin')}
            >
              <Ionicons name="phone-portrait-outline" size={18} color="#ffffff" />
              <Text style={styles.authGatePrimaryBtnText}>Fast Login with OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authGateSecondaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="key-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.authGateSecondaryBtnText}>Password Sign In / Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Delivery & Checkout" showCart={false} showBack />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Items Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>Ordering Items</Text>
          <Text style={styles.summaryItems}>{itemsFormatted}</Text>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
            <Text style={styles.summaryTotalValue}>₹{totalPrice}</Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>1. Delivery Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, nameError && styles.inputError]}
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChangeText={(val) => {
                setName(val)
                if (nameError) setNameError(false)
              }}
            />
            {nameError && <Text style={styles.fieldErrorText}>⚠️ Contact name is required</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>10-Digit Mobile Number *</Text>
            <TextInput
              style={[styles.input, phoneError && styles.inputError]}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(val) => {
                setPhone(val)
                if (phoneError) setPhoneError(false)
              }}
              maxLength={10}
            />
            {phoneError && <Text style={styles.fieldErrorText}>⚠️ Valid 10-digit phone number is required</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="For email order invoice"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea, addressError && styles.inputError]}
              placeholder="Door No, Street name, Landmark, Area, Chennai"
              multiline
              numberOfLines={3}
              value={address}
              onChangeText={(val) => {
                setAddress(val)
                if (addressError) setAddressError(false)
              }}
            />
            {addressError && (
              <Text style={styles.fieldErrorText}>
                ⚠️ Delivery address is required to deliver your order
              </Text>
            )}
          </View>
        </View>

        {/* Delivery Slot Selection */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>2. Choose Morning Slot</Text>
          <Text style={styles.cardSub}>Vegetables cut at 4 AM, delivered fresh</Text>

          <View style={styles.slotList}>
            {SLOTS.map((s) => {
              const isSelected = slot === s.label
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                  onPress={() => setSlot(s.label)}
                  activeOpacity={0.8}
                >
                  <View style={styles.slotRadio}>
                    {isSelected && <View style={styles.slotRadioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.slotLabel, isSelected && styles.slotLabelSelected]}>
                      {s.label}
                    </Text>
                    <Text style={styles.slotTag}>{s.tag}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>3. Payment Mode</Text>

          <TouchableOpacity
            style={[styles.payOption, paymentMethod === 'online' && styles.payOptionSelected]}
            onPress={() => setPaymentMethod('online')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="qr-code-outline"
              size={22}
              color={paymentMethod === 'online' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.payOptionTitle}>Online UPI / Cards (Recommended)</Text>
              <Text style={styles.payOptionSub}>Instant confirmation via Google Pay, PhonePe, Paytm</Text>
            </View>
            <View style={styles.slotRadio}>
              {paymentMethod === 'online' && <View style={styles.slotRadioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payOption, paymentMethod === 'cod' && styles.payOptionSelected]}
            onPress={() => setPaymentMethod('cod')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cash-outline"
              size={22}
              color={paymentMethod === 'cod' ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.payOptionTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.payOptionSub}>Pay cash to delivery partner at doorstep</Text>
            </View>
            <View style={styles.slotRadio}>
              {paymentMethod === 'cod' && <View style={styles.slotRadioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Cooking / Delivery Notes */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>4. Notes for Kitchen (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Leave package with security if door locked, cut onion extra fine..."
            multiline
            numberOfLines={2}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* In-Screen Error Banner */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={24} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Cannot Place Order ⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {addressError && (
                <TouchableOpacity
                  style={styles.quickFixBtn}
                  activeOpacity={0.85}
                  onPress={() => scrollRef.current?.scrollTo({ y: 150, animated: true })}
                >
                  <Ionicons name="location-outline" size={15} color="#ffffff" />
                  <Text style={styles.quickFixBtnText}>Scroll Up to Fill Delivery Address ↑</Text>
                </TouchableOpacity>
              )}
              {/stock|available|out of stock/i.test(errorMessage) && (
                <TouchableOpacity
                  style={[styles.quickFixBtn, { backgroundColor: '#ea580c' }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Cart')}
                >
                  <Ionicons name="cart-outline" size={15} color="#ffffff" />
                  <Text style={styles.quickFixBtnText}>Review & Adjust Cart Quantity 🛒</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleProceed}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>
                {paymentMethod === 'online' ? `Pay ₹${totalPrice} & Place Order` : `Place COD Order (₹${totalPrice})`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Online Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        amount={totalPrice}
        customerName={name}
        onCancel={() => setShowPaymentModal(false)}
        onSuccess={(txnId) => finalizeOrder('paid', txnId)}
      />

      {/* Placed Order Success Modal */}
      {placedOrder && (
        <Modal visible transparent animationType="fade">
          <View style={styles.successOverlay}>
            <View style={styles.successModalCard}>
              <View style={styles.successIconCircleBig}>
                <Ionicons name="checkmark-circle" size={58} color="#059669" />
              </View>
              <Text style={styles.successModalTitle}>Order Placed Successfully! 🎉</Text>
              <Text style={styles.successModalOrderId}>Order ID: #{placedOrder.orderId}</Text>

              <View style={styles.successDetailBox}>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Delivery Slot:</Text>
                  <Text style={styles.successDetailVal}>{placedOrder.slot}</Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Payment Method:</Text>
                  <Text style={styles.successDetailVal}>{placedOrder.method}</Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Total Paid/Due:</Text>
                  <Text style={[styles.successDetailVal, { color: THEME.colors.primary, fontWeight: '800' }]}>
                    ₹{totalPrice}
                  </Text>
                </View>
              </View>

              <View style={styles.successRedirectRow}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.successRedirectText}>Opening live order tracking...</Text>
              </View>

              <TouchableOpacity
                style={styles.trackNowBtn}
                activeOpacity={0.85}
                onPress={() => {
                  navigation.replace('MainTabs', {
                    screen: 'TrackTab',
                    params: {
                      orderId: placedOrder.orderId,
                      phone: phone.trim(),
                    },
                  })
                }}
              >
                <Text style={styles.trackNowBtnText}>Track Order Now →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  summaryCard: {
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
  },
  summaryHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.badgeText,
    textTransform: 'uppercase',
  },
  summaryItems: {
    fontSize: 14,
    color: THEME.colors.text,
    fontWeight: '600',
    marginVertical: 6,
    lineHeight: 20,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
    paddingTop: 8,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.badgeText,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 12,
  },
  inputGroup: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  slotList: {
    gap: 8,
    marginTop: 6,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  slotItemSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  slotRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.primary,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  slotLabelSelected: {
    color: THEME.colors.primary,
  },
  slotTag: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginTop: 10,
    gap: 12,
  },
  payOptionSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  payOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  payOptionSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.textMuted,
  },
  authGateCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  authGateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authGateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  authGateSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  authGatePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    gap: 8,
    marginBottom: 10,
  },
  authGatePrimaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  authGateSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    gap: 8,
  },
  authGateSecondaryBtnText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 1.5,
    backgroundColor: '#fff5f5',
  },
  fieldErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 10,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
    lineHeight: 18,
  },
  quickFixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
    marginTop: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  quickFixBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircleBig: {
    marginBottom: 12,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 4,
  },
  successModalOrderId: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 16,
  },
  successDetailBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successDetailLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  successDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  successRedirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  successRedirectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  trackNowBtn: {
    backgroundColor: '#059669',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNowBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
})
