import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import Header from '../components/Header'
import { THEME } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function CartScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { user } = useAuth()
  const { items, products, updateQuantity, clearCart, totalPrice, totalCount } = useCart()

  // Ensure bottom tabs are always visible: if opened via root stack 'Cart', switch to CartTab
  React.useEffect(() => {
    if (route?.name === 'Cart') {
      navigation.replace('MainTabs', { screen: 'CartTab' })
    }
  }, [route?.name, navigation])

  function handleBrowse() {
    try {
      navigation.navigate('ProductsTab')
    } catch {
      navigation.navigate('MainTabs', { screen: 'ProductsTab' })
    }
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Your Cart" showCart={false} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="basket-outline" size={48} color={THEME.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>
            Explore groceries, fresh cut vegetables, cakes, 20L water cans, flowers & electricals.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={handleBrowse}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Explore Products</Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Your Cart" showCart={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cart items list */}
        <View style={styles.itemsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Items Selected ({totalCount})</Text>
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          </View>

          {items.map((cartItem) => {
            const product = products.find((p) => p.id === cartItem.productId)
            if (!product) return null
            const itemTotal = product.price * cartItem.quantity

            return (
              <View key={product.id} style={styles.itemRow}>
                {/* Left: Veg indicator + details */}
                <View style={styles.itemInfo}>
                  <View style={styles.vegIconBox}>
                    <View style={styles.vegIconDot} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{product.name}</Text>
                    {product.tamilName ? (
                      <Text style={styles.itemTamil}>{product.tamilName}</Text>
                    ) : null}
                    <Text style={styles.itemUnit}>
                      ₹{product.price} / {product.unit}
                    </Text>
                  </View>
                </View>

                {/* Right: Stepper + line total */}
                <View style={styles.itemRight}>
                  <View style={styles.stepperBox}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateQuantity(product.id, cartItem.quantity - 1)}
                    >
                      <Ionicons name="remove" size={14} color="#ffffff" />
                    </TouchableOpacity>

                    <Text style={styles.stepperCount}>{cartItem.quantity}</Text>

                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => updateQuantity(product.id, cartItem.quantity + 1)}
                    >
                      <Ionicons name="add" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemTotal}>₹{itemTotal}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Morning Promise Banner */}
        <View style={styles.promiseBanner}>
          <Ionicons name="sparkles" size={20} color={THEME.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.promiseTitle}>0 Prep Time Morning Promise</Text>
            <Text style={styles.promiseSub}>
              Everything cut fresh between 4:00 AM – 6:00 AM today. Never stored pre-cut overnight.
            </Text>
          </View>
        </View>

        {/* Bill Breakdown */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billValue}>₹{totalPrice}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Charges</Text>
            <Text style={[styles.billValue, { color: THEME.colors.vegGreen }]}>FREE</Text>
          </View>

          <View style={styles.billDivider} />

          <View style={styles.billRow}>
            <Text style={styles.grandLabel}>To Pay</Text>
            <Text style={styles.grandValue}>₹{totalPrice}</Text>
          </View>
        </View>

        {!user && (
          <View style={styles.loginNoticeBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#d97706" />
            <Text style={styles.loginNoticeText}>
              Login required at checkout to confirm delivery & track order
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Checkout CTA */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>TOTAL PAYABLE</Text>
          <Text style={styles.bottomPrice}>₹{totalPrice}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
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
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  browseBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  clearText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  vegIconBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: THEME.colors.vegGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  vegIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.vegGreen,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  itemTamil: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  itemUnit: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepperCount: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  promiseBanner: {
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promiseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  promiseSub: {
    fontSize: 11,
    color: '#9a3412',
    lineHeight: 16,
    marginTop: 2,
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  grandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  grandValue: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.text,
  },
  checkoutBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  loginNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  loginNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    flex: 1,
  },
})
