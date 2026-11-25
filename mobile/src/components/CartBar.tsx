import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'

export default function CartBar() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { totalCount, totalPrice } = useCart()

  if (totalCount === 0) return null

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('MainTabs', { screen: 'CartTab', params: { from: route?.name || 'ProductsTab' } })}
      >
        <View style={styles.left}>
          <View style={styles.iconCircle}>
            <Ionicons name="cart" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.itemCount}>
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.price}>₹{totalPrice}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  container: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCount: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.9,
    fontWeight: '500',
  },
  price: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewCartText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
})
