import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CartItem, Product } from '../types'
import { getProducts } from '../api'

interface CartContextValue {
  items: CartItem[]
  products: Product[]
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalCount: number
  totalPrice: number
  formatForOrder: () => string
  refreshProducts: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = '@zippo_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Load products list from API or fallback
  async function loadProducts() {
    try {
      const data = await getProducts()
      setProducts(data)
    } catch {
      // fallback already handled in getProducts
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Load persisted cart from AsyncStorage
  useEffect(() => {
    async function loadCart() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY)
        if (saved) {
          setItems(JSON.parse(saved))
        }
      } catch {}
    }
    loadCart()
  }, [])

  // Save changes to AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {})
  }, [items])

  function addItem(productId: string, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { productId, quantity }]
    })
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)))
  }

  function clearCart() {
    setItems([])
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const totalPrice = items.reduce((sum, i) => {
    const product = products.find((p) => p.id === i.productId)
    return sum + (product ? product.price * i.quantity : 0)
  }, 0)

  function formatForOrder() {
    return items
      .map((i) => {
        const product = products.find((p) => p.id === i.productId)
        return product ? `${i.quantity}x ${product.name}` : ''
      })
      .filter(Boolean)
      .join(', ')
  }

  return (
    <CartContext.Provider
      value={{
        items,
        products,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        totalPrice,
        formatForOrder,
        refreshProducts: loadProducts,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside a CartProvider')
  return ctx
}
