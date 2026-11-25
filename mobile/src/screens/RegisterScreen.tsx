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

  async function handleRegister() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.')
      return
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a 10-digit mobile number.')
      return
    }
    if (!password || password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    try {
      await register(name.trim(), phone.trim(), password, email.trim() || undefined)
      Alert.alert('Account Created! 🎉', 'Welcome to Zippo.', [
        { text: 'Start Ordering', onPress: () => navigation.navigate('HomeTab') },
      ])
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register this account.')
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
                onChangeText={setPhone}
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
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
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
})
