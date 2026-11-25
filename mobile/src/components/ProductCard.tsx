import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart()

  const cartItem = items.find((i) => i.productId === product.id)
  const count = cartItem ? cartItem.quantity : 0

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* 100% Veg Icon Badge */}
        <View style={styles.vegIconBox}>
          <View style={styles.vegIconDot} />
        </View>

        {product.tamilName ? (
          <View style={styles.tamilBadge}>
            <Text style={styles.tamilText}>{product.tamilName}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.unit}>{product.unit}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {product.description}
      </Text>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>₹{product.price}</Text>
        </View>

        {count === 0 ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addItem(product.id, 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>ADD</Text>
            <Ionicons name="add" size={16} color={THEME.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.stepperBox}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => updateQuantity(product.id, count - 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={16} color="#ffffff" />
            </TouchableOpacity>

            <Text style={styles.stepperCount}>{count}</Text>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => updateQuantity(product.id, count + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vegIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.vegGreen,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.vegGreenBg,
  },
  vegIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.vegGreen,
  },
  tamilBadge: {
    backgroundColor: THEME.colors.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tamilText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.badgeText,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.colors.textMuted,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 10,
  },
  priceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 4,
    minWidth: 90,
  },
  addButtonText: {
    color: THEME.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 96,
    justifyContent: 'space-between',
  },
  stepBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepperCount: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    paddingHorizontal: 4,
  },
})
