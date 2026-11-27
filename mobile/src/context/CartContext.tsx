import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { Alert, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CartItem, Product } from '../types'
import { getProducts } from '../api'
import { getSocket } from '../socket'

interface CartContextValue {
  items: CartItem[]
  products: Product[]
  stockAlert: string | null
  notifyStockLimit: (productName: string, available: number) => void
  clearStockAlert: () => void
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

function triggerStockAlert(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}: ${message}`)
  } else {
    Alert.alert(title, message)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stockAlert, setStockAlert] = useState<string | null>(null)

  function notifyStockLimit(productName: string, available: number) {
    const msg =
      available <= 0
        ? `Not Available: "${productName}" is currently out of stock.`
        : `Not Available: Only ${available} item(s) available in stock for "${productName}".`
    setStockAlert(msg)
    if (Platform.OS !== 'web') {
      Alert.alert('Not Available', msg)
    }
    setTimeout(() => {
      setStockAlert((cur) => (cur === msg ? null : cur))
    }, 5000)
  }

  function clearStockAlert() {
    setStockAlert(null)
  }

  // Load products list from API or fallback & sanitize existing cart items against stock
  async function loadProducts() {
    try {
      const data = await getProducts()
      setProducts(data)

      // Clamp existing cart items if they exceed fresh stock
      setItems((prev) => {
        let changed = false
        const sanitized = prev
          .map((item) => {
            const prod = data.find((p) => p.id === item.productId)
            if (prod && prod.stockQuantity !== undefined && item.quantity > prod.stockQuantity) {
              changed = true
              return prod.stockQuantity > 0 ? { ...item, quantity: prod.stockQuantity } : null
            }
            return item
          })
          .filter((i): i is CartItem => i !== null)
        return changed ? sanitized : prev
      })
    } catch {
      // fallback already handled in getProducts
    }
  }

  useEffect(() => {
    loadProducts()

    // 1. Periodic auto-sync fallback (every 4 seconds) to guarantee stock is never stale
    const timer = setInterval(() => {
      loadProducts()
    }, 4000)

    // 2. Immediate re-sync when web tab or app window comes into view
    const onVisibilityChange = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        if (document.visibilityState === 'visible') {
          loadProducts()
        }
      }
    }
    const onFocus = () => {
      loadProducts()
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    return () => {
      clearInterval(timer)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
    }
  }, [])

  // Real-time catalog & stock sync with Socket.io
  useEffect(() => {
    const socket = getSocket()

    function onSocketConnect() {
      // Re-fetch full product catalog whenever socket connects or reconnects
      loadProducts()
    }

    function onStockUpdated(updatedList: (Product & { deleted?: boolean })[]) {
      if (!Array.isArray(updatedList)) return
      setProducts((prev) => {
        const next = [...prev]
        for (const upd of updatedList) {
          const idx = next.findIndex((p) => p.id === upd.id)
          if (idx >= 0) {
            if (upd.deleted) {
              next.splice(idx, 1)
            } else {
              next[idx] = { ...next[idx], ...upd }
            }
          } else if (!upd.deleted) {
            next.unshift(upd)
          }
        }
        return next
      })

      // Clamp cart quantities in real-time if partner reduces stock or items sell out
      setItems((prev) => {
        let changed = false
        const adjusted = prev
          .map((item) => {
            const upd = updatedList.find((u) => u.id === item.productId)
            if (upd && upd.stockQuantity !== undefined && item.quantity > upd.stockQuantity) {
              changed = true
              notifyStockLimit(upd.name || 'Product', upd.stockQuantity)
              return upd.stockQuantity > 0 ? { ...item, quantity: upd.stockQuantity } : null
            }
            return item
          })
          .filter((i): i is CartItem => i !== null)
        return changed ? adjusted : prev
      })
    }

    function onProductCreated(newProduct: Product) {
      if (!newProduct) return
      setProducts((prev) => {
        if (prev.some((p) => p.id === newProduct.id)) {
          return prev.map((p) => (p.id === newProduct.id ? { ...p, ...newProduct } : p))
        }
        return [newProduct, ...prev]
      })
    }

    function onProductDeleted(data: { productId: string }) {
      if (!data?.productId) return
      setProducts((prev) => prev.filter((p) => p.id !== data.productId))
      setItems((prev) => prev.filter((i) => i.productId !== data.productId))
    }

    socket.on('connect', onSocketConnect)
    socket.on('stock_updated', onStockUpdated)
    socket.on('product_created', onProductCreated)
    socket.on('product_deleted', onProductDeleted)

    return () => {
      socket.off('connect', onSocketConnect)
      socket.off('stock_updated', onStockUpdated)
      socket.off('product_created', onProductCreated)
      socket.off('product_deleted', onProductDeleted)
    }
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
    const product = products.find((p) => p.id === productId)
    if (product && product.stockQuantity !== undefined) {
      if (product.stockQuantity <= 0 || product.isAvailable === false) {
        notifyStockLimit(product.name, 0)
        return
      }
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      const currentQty = existing ? existing.quantity : 0

      if (product && product.stockQuantity !== undefined) {
        if (currentQty >= product.stockQuantity) {
          notifyStockLimit(product.name, product.stockQuantity)
          return prev
        }
        if (currentQty + quantity > product.stockQuantity) {
          notifyStockLimit(product.name, product.stockQuantity)
          const clamped = product.stockQuantity
          return prev.map((i) =>
            i.productId === productId ? { ...i, quantity: clamped } : i
          )
        }
      }

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

    const product = products.find((p) => p.id === productId)
    if (product && product.stockQuantity !== undefined) {
      if (quantity > product.stockQuantity) {
        notifyStockLimit(product.name, product.stockQuantity)
        quantity = product.stockQuantity
        if (quantity <= 0) {
          removeItem(productId)
          return
        }
      }
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
        stockAlert,
        notifyStockLimit,
        clearStockAlert,
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
