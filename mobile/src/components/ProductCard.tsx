import React from 'react'
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../config'
import { useCart } from '../context/CartContext'
import type { Product } from '../types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { items, products, addItem, updateQuantity, notifyStockLimit } = useCart()

  // Always use the latest live product state from CartContext for real-time stock sync
  const liveProduct = products.find((p) => p.id === product.id) || product
  const stock = liveProduct.stockQuantity

  const cartItem = items.find((i) => i.productId === liveProduct.id)
  const count = cartItem ? cartItem.quantity : 0
  const isOutOfStock = stock !== undefined && (stock <= 0 || liveProduct.isAvailable === false)
  const isLowStock = stock !== undefined && stock > 0 && stock <= 5
  const isMaxReached = stock !== undefined && count >= stock

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* 100% Veg Icon Badge */}
        <View style={styles.vegIconBox}>
          <View style={styles.vegIconDot} />
        </View>

        {liveProduct.tamilName ? (
          <View style={styles.tamilBadge}>
            <Text style={styles.tamilText}>{liveProduct.tamilName}</Text>
          </View>
        ) : null}
      </View>

      {stock !== undefined && (
        <View style={{ marginVertical: 3 }}>
          {isOutOfStock ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>● Out of Stock</Text>
          ) : isLowStock ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>● Only {stock} left</Text>
          ) : (
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>● {stock} in stock</Text>
          )}
        </View>
      )}

      <Text style={styles.title}>{liveProduct.name}</Text>
      {liveProduct.storeName ? (
        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.primary, marginVertical: 1 }}>
          🏪 {liveProduct.storeName}
        </Text>
      ) : null}
      <Text style={styles.unit}>{liveProduct.unit}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {liveProduct.description}
      </Text>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>₹{liveProduct.price}</Text>
        </View>

        {isOutOfStock ? (
          <View style={[styles.addButton, { opacity: 0.6, borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.addButtonText, { color: '#64748b' }]}>SOLD OUT</Text>
          </View>
        ) : count === 0 ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              if (stock !== undefined && (stock <= 0 || liveProduct.isAvailable === false)) {
                notifyStockLimit(liveProduct.name, 0)
                return
              }
              addItem(liveProduct.id, 1)
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>ADD</Text>
            <Ionicons name="add" size={16} color={THEME.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.stepperBox}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => updateQuantity(liveProduct.id, count - 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={16} color="#ffffff" />
            </TouchableOpacity>

            <Text style={styles.stepperCount}>{count}</Text>

            <TouchableOpacity
              style={[
                styles.stepBtn,
                isMaxReached && {
                  backgroundColor: '#94a3b8',
                  opacity: 0.6,
                },
              ]}
              onPress={() => {
                if (isMaxReached) {
                  notifyStockLimit(liveProduct.name, stock ?? 0)
                  return
                }
                updateQuantity(liveProduct.id, count + 1)
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Prominent Red Text In-Card Stock Limit Notification */}
      {isMaxReached && (
        <View style={styles.stockAlertCardBanner}>
          <Ionicons name="alert-circle" size={15} color="#dc2626" />
          <Text style={styles.stockAlertCardText}>
            Not Available: Only {stock} item(s) available in stock for "{liveProduct.name}".
          </Text>
        </View>
      )}
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
  stockAlertCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
    gap: 6,
  },
  stockAlertCardText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    lineHeight: 16,
  },
})
