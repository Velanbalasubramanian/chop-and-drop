import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'

export default function RegisterScreen() {
  const navigation = useNavigation<any>()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleRegister() {
    setError(null)
    setIsAlreadyRegistered(false)
    setSuccessMessage(null)
    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Please enter a 10-digit mobile number.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      await register(name.trim(), phone.trim(), password, email.trim() || undefined)
      setSuccessMessage(`Account Created Successfully! 🎉 Welcome to Zippo, ${name.trim()}!`)
      setTimeout(() => {
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          })
        } catch {
          navigation.navigate('MainTabs', { screen: 'HomeTab' })
        }
      }, 1500)
    } catch (err: any) {
      const msg = err.message || 'Could not register this account.'
      if (err.alreadyRegistered || /already (exists|registered)/i.test(msg)) {
        setIsAlreadyRegistered(true)
        setError('This phone number already has an account.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Header title="Create Account" showCart={false} showBack />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={48} color={THEME.colors.primary} />
            </View>

            <Text style={styles.title}>Join Zippo</Text>
            <Text style={styles.sub}>
              Groceries, fresh cuts, bakery, water cans & more delivered fast to your home.
            </Text>

            {successMessage && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={26} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>Registration Successful! 🎉</Text>
                  <Text style={styles.successText}>{successMessage}</Text>
                  <Text style={styles.successSub}>Taking you to the store now...</Text>
                </View>
              </View>
            )}

            {isAlreadyRegistered && (
              <View style={styles.alreadyBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle" size={22} color="#b45309" />
                  <Text style={styles.alreadyTitle}>Account Already Created ⚠️</Text>
                </View>
                <Text style={styles.alreadyText}>
                  An account with mobile number <Text style={{ fontWeight: '800' }}>{phone}</Text> already exists in Zippo.
                </Text>
                <TouchableOpacity
                  style={styles.alreadyLoginBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Login', { phone: phone.trim() })}
                >
                  <Ionicons name="log-in-outline" size={16} color="#ffffff" />
                  <Text style={styles.alreadyLoginBtnText}>Sign In with Password Now →</Text>
                </TouchableOpacity>
              </View>
            )}

            {error && !isAlreadyRegistered && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Registration Error ⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </View>
            )}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Priyan Balan"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>10-Digit Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => {
                  setError('')
                  setIsAlreadyRegistered(false)
                  let clean = text.replace(/[^0-9]/g, '')
                  if (clean.startsWith('91') && clean.length > 10) clean = clean.slice(2)
                  else if (clean.startsWith('0') && clean.length > 10) clean = clean.slice(1)
                  setPhone(clean.slice(0, 10))
                }}
                maxLength={10}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password (at least 6 characters) *</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="For order receipts"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerBtn,
                successMessage ? { backgroundColor: '#059669' } : undefined,
              ]}
              onPress={() => {
                if (successMessage) {
                  try {
                    navigation.navigate('MainTabs', { screen: 'HomeTab' })
                  } catch {
                    navigation.navigate('HomeTab')
                  }
                  return
                }
                handleRegister()
              }}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : successMessage ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.registerBtnText}>Success! Entering Store →</Text>
                </View>
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already registered?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  iconCircle: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.text,
  },
  eyeBtn: {
    padding: 10,
  },
  registerBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  registerBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
    gap: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    lineHeight: 17,
  },
  alreadyBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 12,
    gap: 6,
  },
  alreadyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
  },
  alreadyText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  alreadyLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 7,
    marginTop: 6,
    gap: 6,
  },
  alreadyLoginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#6ee7b7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 12,
    gap: 10,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 2,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    lineHeight: 18,
  },
  successSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#059669',
    marginTop: 4,
  },
})
