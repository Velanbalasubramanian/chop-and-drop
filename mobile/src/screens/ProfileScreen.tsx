import React, { useEffect, useState } from 'react'
import {
  Alert,
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
import { getServerUrl, setServerUrl, checkServerHealth } from '../api'

export default function ProfileScreen() {
  const navigation = useNavigation<any>()
  const { user, logout } = useAuth()

  const [currentUrl, setCurrentUrl] = useState('')
  const [editingUrl, setEditingUrl] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [serverOnline, setServerOnline] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadUrl() {
      const u = await getServerUrl()
      setCurrentUrl(u)
      setCustomInput(u)
      const isOk = await checkServerHealth()
      setServerOnline(isOk)
    }
    loadUrl()
  }, [])

  async function handleSaveServerUrl() {
    if (!customInput.trim().startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid HTTP/HTTPS URL (e.g. http://192.168.29.143:4000)')
      return
    }
    await setServerUrl(customInput.trim())
    setCurrentUrl(customInput.trim())
    setEditingUrl(false)
    const isOk = await checkServerHealth()
    setServerOnline(isOk)
    Alert.alert('Updated', 'Backend server URL updated successfully!')
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ])
  }

  return (
    <View style={styles.container}>
      <Header title="Account & Settings" showCart={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {user ? (
              <>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userPhone}>+91 {user.phone}</Text>
                {user.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.userName}>Guest User</Text>
                <Text style={styles.userPhone}>Log in to manage orders</Text>
              </>
            )}
          </View>

          {!user && (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.signInBtnText}>Log In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Server Connection Status Card */}
        <View style={styles.settingsCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="server-outline" size={20} color={THEME.colors.primary} />
              <Text style={styles.cardTitle}>Backend Server Connection</Text>
            </View>
            <View
              style={[
                styles.healthBadge,
                serverOnline ? styles.healthOnline : styles.healthOffline,
              ]}
            >
              <Text
                style={[
                  styles.healthText,
                  serverOnline ? styles.healthTextOnline : styles.healthTextOffline,
                ]}
              >
                {serverOnline ? '● CONNECTED' : '○ OFFLINE'}
              </Text>
            </View>
          </View>

          <Text style={styles.serverUrlText} numberOfLines={1}>
            {currentUrl}
          </Text>

          {editingUrl ? (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={styles.serverInput}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="http://192.168.29.143:4000"
                autoCapitalize="none"
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={styles.saveUrlBtn}
                  onPress={handleSaveServerUrl}
                >
                  <Text style={styles.saveUrlBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelUrlBtn}
                  onPress={() => setEditingUrl(false)}
                >
                  <Text style={styles.cancelUrlBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.changeUrlBtn}
              onPress={() => setEditingUrl(true)}
            >
              <Text style={styles.changeUrlBtnText}>Change Server IP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Menu List */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('OrdersTab')}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="receipt-outline" size={20} color={THEME.colors.primary} />
            </View>
            <Text style={styles.menuTitle}>My Order History</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Support')}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="headset-outline" size={20} color={THEME.colors.primary} />
            </View>
            <Text style={styles.menuTitle}>Help & Customer Support</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('About')}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="information-circle-outline" size={20} color={THEME.colors.primary} />
            </View>
            <Text style={styles.menuTitle}>About Zippo Chennai</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Logout Option if logged in */}
        {user && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={THEME.colors.danger} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={styles.versionBox}>
          <Text style={styles.versionText}>Zippo Mobile v1.0.0</Text>
          <Text style={styles.versionSub}>Android & iOS Cross-Platform Super App</Text>
        </View>
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
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  userPhone: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  signInBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  healthOnline: {
    backgroundColor: THEME.colors.vegGreenBg,
  },
  healthOffline: {
    backgroundColor: '#fef2f2',
  },
  healthText: {
    fontSize: 10,
    fontWeight: '800',
  },
  healthTextOnline: {
    color: THEME.colors.vegGreen,
  },
  healthTextOffline: {
    color: THEME.colors.danger,
  },
  serverUrlText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  changeUrlBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  changeUrlBtnText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  serverInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#f8fafc',
  },
  saveUrlBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveUrlBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelUrlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelUrlBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
  },
  logoutBtnText: {
    color: THEME.colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  versionBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  versionSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
})
