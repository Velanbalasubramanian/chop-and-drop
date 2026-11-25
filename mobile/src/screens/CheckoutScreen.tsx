import React, { useState } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import Header from '../components/Header'
import PaymentModal from '../components/PaymentModal'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { submitOrder } from '../api'
import type { OrderPayload, PaymentMethod } from '../types'

const SLOTS = [
  { id: '6-7am', label: '6:00 AM – 7:00 AM', tag: 'Early Morning Kitchen' },
  { id: '7-8am', label: '7:00 AM – 8:00 AM', tag: 'Most Popular for Breakfast' },
  { id: '8-9am', label: '8:00 AM – 9:00 AM', tag: 'Regular Morning' },
  { id: '9-10am', label: '9:00 AM – 10:00 AM', tag: 'Mid Morning' },
]

export default function CheckoutScreen() {
  const navigation = useNavigation<any>()
  const { user, token, loading: authLoading } = useAuth()
  const { formatForOrder, totalPrice, clearCart } = useCart()

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [address, setAddress] = useState('')
  const [slot, setSlot] = useState(SLOTS[0].label)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Sync user details if they change or if user logs in while on screen
  React.useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name)
      if (!phone && user.phone) setPhone(user.phone)
      if (!email && user.email) setEmail(user.email)
    }
  }, [user])

  const itemsFormatted = formatForOrder()

  async function handleProceed() {
    if (!user || !token) {
      Alert.alert(
        'Login Required',
        'You must log in to your account to place an order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In with OTP', onPress: () => navigation.navigate('OtpLogin') },
          { text: 'Password Login', onPress: () => navigation.navigate('Login') },
        ]
      )
      return
    }

    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your contact name.')
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please provide a valid 10-digit mobile number.')
      return
    }
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please provide your Chennai delivery address.')
      return
    }

    if (paymentMethod === 'online') {
      setShowPaymentModal(true)
    } else {
      await finalizeOrder('pending', undefined)
    }
  }

  async function finalizeOrder(paymentStatus: 'pending' | 'paid', transactionId?: string) {
    setShowPaymentModal(false)
    setLoading(true)

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
    }

    try {
      const res = await submitOrder(payload, token)
      clearCart()
      Alert.alert(
        'Order Placed Successfully! 🎉',
        `Order ID: ${res.orderId}\nDelivery Slot: ${slot}`,
        [
          {
            text: 'Track Order Now',
            onPress: () => {
              navigation.replace('TrackOrder', {
                orderId: res.orderId,
                phone: phone.trim(),
              })
            },
          },
        ]
      )
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'Could not place your order. Please try again.')
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>10-Digit Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
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
              style={[styles.input, styles.textArea]}
              placeholder="Door No, Street name, Landmark, Area, Chennai"
              multiline
              numberOfLines={3}
              value={address}
              onChangeText={setAddress}
            />
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
})
