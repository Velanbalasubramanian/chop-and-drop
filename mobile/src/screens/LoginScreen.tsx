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

export default function LoginScreen() {
  const navigation = useNavigation<any>()
  const { login } = useAuth()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter your 10-digit mobile number.')
      return
    }
    if (!password) {
      Alert.alert('Required', 'Please enter your password.')
      return
    }

    setLoading(true)
    try {
      await login(phone.trim(), password)
      Alert.alert('Welcome Back! 👋', 'Logged in successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Incorrect phone or password.')
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
        <Header title="Log In" showCart={false} showBack />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle-outline" size={48} color={THEME.colors.primary} />
            </View>

            <Text style={styles.title}>Sign in to Zippo</Text>
            <Text style={styles.sub}>
              Track your deliveries, view order history, and manage saved addresses.
            </Text>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
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

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginBtnText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* OTP Login Option */}
            <TouchableOpacity
              style={styles.otpBtn}
              onPress={() => navigation.navigate('OtpLogin')}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.otpBtnText}>Log in with SMS OTP instead</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Register Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New to Zippo?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Create Account</Text>
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
  loginBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
    gap: 6,
  },
  otpBtnText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 13,
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
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
})
