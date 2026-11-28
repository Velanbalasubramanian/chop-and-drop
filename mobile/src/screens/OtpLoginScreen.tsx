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
import { requestOtp, verifyOtp } from '../api'

export default function OtpLoginScreen() {
  const navigation = useNavigation<any>()
  const { setSession } = useAuth()

  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendCode() {
    setError('')
    setSuccessMessage('')
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    setLoading(true)
    try {
      const res = await requestOtp(cleanPhone)
      setIsNewUser(res.isNewUser)
      if (res.devOtp) {
        setDevOtp(res.devOtp)
        setCode(res.devOtp) // Auto-fill dev OTP for instant test convenience!
      }
      setStep('verify')
    } catch (err: any) {
      setError(err.message || 'Could not send verification code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setError('')
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (!code.trim() || code.trim().length < 6) {
      setError('Please enter the 6-digit verification code.')
      return
    }
    if (isNewUser && !name.trim()) {
      setError('Please enter your name to complete account registration.')
      return
    }

    setLoading(true)
    try {
      const result = await verifyOtp(cleanPhone, code.trim(), name.trim() || undefined)
      await setSession(result)
      setSuccessMessage('Welcome to Zippo! 🎉 Signed in successfully.')
      setTimeout(() => {
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          })
        } catch {
          navigation.navigate('MainTabs', { screen: 'HomeTab' })
        }
      }, 1200)
    } catch (err: any) {
      if (err.needsName) {
        setIsNewUser(true)
        setError('First time logging in with this number? Please enter your name below.')
      } else {
        setError(err.message || 'Invalid or expired code. Please try again.')
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
        <Header title="OTP Sign In" showCart={false} showBack />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color={THEME.colors.primary} />
            </View>

            <Text style={styles.title}>Fast OTP Login</Text>
            <Text style={styles.sub}>
              {step === 'request'
                ? 'Enter your mobile number. We will send a 6-digit code via SMS.'
                : `Enter the 6-digit verification code sent to +91 ${phone}`}
            </Text>

            {successMessage ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>Signed In! 🎉</Text>
                  <Text style={styles.successText}>{successMessage}</Text>
                  <Text style={styles.successSub}>Taking you to the store now...</Text>
                </View>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Dev OTP Notice if Twilio not set */}
            {devOtp ? (
              <View style={styles.devOtpBanner}>
                <Ionicons name="information-circle" size={20} color={THEME.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.devOtpTitle}>Dev / Test SMS Mode</Text>
                  <Text style={styles.devOtpText}>
                    Your test verification code is: <Text style={styles.devCode}>{devOtp}</Text>
                  </Text>
                </View>
              </View>
            ) : null}

            {step === 'request' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>10-Digit Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(text) => {
                      setError('')
                      let clean = text.replace(/[^0-9]/g, '')
                      if (clean.startsWith('91') && clean.length > 10) clean = clean.slice(2)
                      else if (clean.startsWith('0') && clean.length > 10) clean = clean.slice(1)
                      setPhone(clean.slice(0, 10))
                    }}
                    maxLength={10}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    successMessage ? { backgroundColor: '#059669' } : undefined,
                  ]}
                  onPress={handleSendCode}
                  disabled={loading || !!successMessage}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.actionBtnText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {isNewUser && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Your Name (First-Time User)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Priyan"
                      value={name}
                      onChangeText={(val) => {
                        setError('')
                        setName(val)
                      }}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-Digit Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="••••••"
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={(val) => {
                      setError('')
                      setCode(val)
                    }}
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    successMessage ? { backgroundColor: '#059669' } : undefined,
                  ]}
                  onPress={handleVerify}
                  disabled={loading || !!successMessage}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.actionBtnText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => {
                    setError('')
                    setStep('request')
                  }}
                >
                  <Text style={styles.resendBtnText}>Change phone number / Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.switchBtnText}>Or sign in with Password instead</Text>
            </TouchableOpacity>
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
    marginBottom: 16,
    lineHeight: 18,
  },
  devOtpBanner: {
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  devOtpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.badgeText,
  },
  devOtpText: {
    fontSize: 12,
    color: THEME.colors.text,
    marginTop: 2,
  },
  devCode: {
    fontWeight: '900',
    color: THEME.colors.primary,
    fontSize: 14,
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
  codeInput: {
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  resendBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  resendBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  switchBtn: {
    alignItems: 'center',
  },
  switchBtnText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
    lineHeight: 18,
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
