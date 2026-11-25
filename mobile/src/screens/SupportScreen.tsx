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
import Header from '../components/Header'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { submitSupportTicket } from '../api'

const ISSUE_TYPES = [
  'Damaged / Spoiled vegetable pack',
  'Wrong or missing items',
  'Delivery delay',
  'Payment or refund query',
  'Bulk kitchen or catering inquiry',
  'General feedback',
]

export default function SupportScreen() {
  const { user } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [orderId, setOrderId] = useState('')
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your contact name.')
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.')
      return
    }
    if (!message.trim()) {
      Alert.alert('Required', 'Please describe your issue or question.')
      return
    }

    setLoading(true)
    try {
      const res = await submitSupportTicket({
        name: name.trim(),
        phone: phone.trim(),
        orderId: orderId.trim() || undefined,
        issueType,
        message: message.trim(),
      })

      Alert.alert(
        'Ticket Submitted! 📩',
        `Ticket Ref: ${res.ticketId}\nOur Chennai kitchen support will contact you within 30 minutes.`,
        [{ text: 'OK', onPress: () => setMessage('') }]
      )
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send support request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Header title="Customer Help" showCart={false} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Direct Contact Card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Quick Help Line</Text>
          <Text style={styles.contactSub}>
            Reach our morning kitchen dispatch manager directly for urgent order queries.
          </Text>

          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color={THEME.colors.primary} />
              <Text style={styles.contactText}>+91 98765 43210</Text>
            </View>

            <View style={styles.contactItem}>
              <Ionicons name="time-outline" size={18} color={THEME.colors.primary} />
              <Text style={styles.contactText}>5:30 AM – 8:00 PM</Text>
            </View>
          </View>
        </View>

        {/* Ticket Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Submit a Support Ticket</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Anand"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Order ID (If related to an order)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CD-8K3F2A"
              value={orderId}
              onChangeText={setOrderId}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryList}>
              {ISSUE_TYPES.map((type) => {
                const isSelected = type === issueType
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, isSelected && styles.typePillActive]}
                    onPress={() => setIssueType(type)}
                  >
                    <Text style={[styles.typeText, isSelected && styles.typeTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>How can we help? *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us what went wrong or how we can assist..."
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Support Request</Text>
            )}
          </TouchableOpacity>
        </View>

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
  contactCard: {
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.badgeText,
  },
  contactSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
    paddingTop: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 8,
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  typePillActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primary,
  },
  typeText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  typeTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
})
