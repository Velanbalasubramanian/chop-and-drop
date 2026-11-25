import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Header from '../components/Header'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { fetchMyOrders } from '../api'

export default function MyOrdersScreen() {
  const navigation = useNavigation<any>()
  const { user, token } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function loadOrders() {
    if (!token) return
    setLoading(true)
    try {
      const data = await fetchMyOrders(token)
      setOrders(data)
    } catch (e) {
      console.log('Error loading orders:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [token])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  if (!user || !token) {
    return (
      <View style={styles.container}>
        <Header title="My Orders" />
        <View style={styles.notLoggedInBox}>
          <Ionicons name="lock-closed-outline" size={48} color={THEME.colors.primary} />
          <Text style={styles.notLoggedInTitle}>Please Log In</Text>
          <Text style={styles.notLoggedInSub}>
            Sign in with your phone number to see your past orders and morning deliveries.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Log In / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="My Orders" />

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const isDelivered = item.status === 'delivered'
            const isCancelled = item.status === 'cancelled'

            return (
              <TouchableOpacity
                style={styles.orderCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('TrackOrder', {
                    orderId: item.id,
                    phone: item.phone,
                  })
                }
              >
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderId}>#{item.id}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(item.receivedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isDelivered && styles.statusDelivered,
                      isCancelled && styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isDelivered && styles.statusTextDelivered,
                        isCancelled && styles.statusTextCancelled,
                      ]}
                    >
                      {item.status?.toUpperCase() || 'RECEIVED'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.orderItems} numberOfLines={2}>
                  {item.items}
                </Text>

                <View style={styles.orderFooter}>
                  <View>
                    <Text style={styles.slotText}>Slot: {item.deliverySlot}</Text>
                    <Text style={styles.amountText}>
                      ₹{item.amount || 0} · {item.paymentMethod?.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.trackLink}>
                    <Text style={styles.trackLinkText}>Live Track</Text>
                    <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your Zippo delivery orders will appear here.</Text>
              <TouchableOpacity
                style={styles.orderNowBtn}
                onPress={() => navigation.navigate('Products')}
              >
                <Text style={styles.orderNowBtnText}>Browse Vegetables</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notLoggedInBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notLoggedInTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 12,
  },
  notLoggedInSub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 10,
    marginBottom: 10,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  orderDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDelivered: {
    backgroundColor: THEME.colors.vegGreenBg,
  },
  statusCancelled: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  statusTextDelivered: {
    color: THEME.colors.vegGreen,
  },
  statusTextCancelled: {
    color: THEME.colors.danger,
  },
  orderItems: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 10,
  },
  slotText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 2,
  },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  orderNowBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  orderNowBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
})
