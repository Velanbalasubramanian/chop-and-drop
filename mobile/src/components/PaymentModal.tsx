import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../config'

interface PaymentModalProps {
  visible: boolean
  amount: number
  customerName: string
  onSuccess: (transactionId: string) => void
  onCancel: () => void
}

export default function PaymentModal({
  visible,
  amount,
  customerName,
  onSuccess,
  onCancel,
}: PaymentModalProps) {
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay')
  const [upiId, setUpiId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [txnId, setTxnId] = useState('')

  function handlePay() {
    setProcessing(true)
    const generated = 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    setTxnId(generated)

    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess(generated)
      }, 1200)
    }, 1500)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Fast Online Checkout</Text>
              <Text style={styles.headerSub}>Secured by Zippo Pay</Text>
            </View>
            <TouchableOpacity onPress={onCancel} disabled={processing || success}>
              <Ionicons name="close" size={24} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Amount Box */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Total Payable</Text>
            <Text style={styles.amountValue}>₹{amount}</Text>
          </View>

          {success ? (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#ffffff" />
              </View>
              <Text style={styles.successTitle}>Payment Approved!</Text>
              <Text style={styles.successSub}>Txn Ref: {txnId}</Text>
            </View>
          ) : (
            <>
              {/* UPI Options */}
              <Text style={styles.sectionTitle}>Select UPI Application</Text>
              <View style={styles.appsRow}>
                <TouchableOpacity
                  style={[
                    styles.appButton,
                    selectedApp === 'gpay' && styles.appButtonSelected,
                  ]}
                  onPress={() => setSelectedApp('gpay')}
                >
                  <Ionicons
                    name="logo-google"
                    size={22}
                    color={selectedApp === 'gpay' ? THEME.colors.primary : '#4285F4'}
                  />
                  <Text
                    style={[
                      styles.appName,
                      selectedApp === 'gpay' && styles.appNameSelected,
                    ]}
                  >
                    Google Pay
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.appButton,
                    selectedApp === 'phonepe' && styles.appButtonSelected,
                  ]}
                  onPress={() => setSelectedApp('phonepe')}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color={selectedApp === 'phonepe' ? THEME.colors.primary : '#5f259f'}
                  />
                  <Text
                    style={[
                      styles.appName,
                      selectedApp === 'phonepe' && styles.appNameSelected,
                    ]}
                  >
                    PhonePe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.appButton,
                    selectedApp === 'paytm' && styles.appButtonSelected,
                  ]}
                  onPress={() => setSelectedApp('paytm')}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={22}
                    color={selectedApp === 'paytm' ? THEME.colors.primary : '#00b9f5'}
                  />
                  <Text
                    style={[
                      styles.appName,
                      selectedApp === 'paytm' && styles.appNameSelected,
                    ]}
                  >
                    Paytm UPI
                  </Text>
                </TouchableOpacity>
              </View>

              {/* UPI ID input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Or Enter UPI VPA ID</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. yourname@okhdfcbank"
                  placeholderTextColor="#94a3b8"
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                />
              </View>

              {/* Security Note */}
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={16} color={THEME.colors.vegGreen} />
                <Text style={styles.securityText}>
                  Test simulation mode: Instant verified mock payment
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={processing}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={handlePay}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.payBtnText}>Pay ₹{amount}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  amountBox: {
    backgroundColor: THEME.colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  amountLabel: {
    fontSize: 12,
    color: THEME.colors.badgeText,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  appsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  appButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  appButtonSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  appName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  appNameSelected: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.text,
    backgroundColor: '#f8fafc',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  payBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.vegGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  successSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
})
