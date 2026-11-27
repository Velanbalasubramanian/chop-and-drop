import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import type { CartItem, Product, Store } from '../types'
import { products as fallbackProducts } from '../data/products'
import { fetchProducts, fetchStores } from '../api'
import { getSocket } from '../socket'

interface CartContextValue {
  items: CartItem[]
  products: Product[]
  stores: Store[]
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
  refreshStores: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'zippo_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [stores, setStores] = useState<Store[]>([])
  const [stockAlert, setStockAlert] = useState<string | null>(null)
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  function notifyStockLimit(productName: string, available: number) {
    const msg =
      available <= 0
        ? `Not Available: "${productName}" is currently out of stock.`
        : `Not Available: Only ${available} item(s) available in stock for "${productName}".`
    setStockAlert(msg)
    setTimeout(() => {
      setStockAlert((cur) => (cur === msg ? null : cur))
    }, 5000)
  }

  function clearStockAlert() {
    setStockAlert(null)
  }

  async function loadProducts() {
    try {
      const live = await fetchProducts()
      if (Array.isArray(live) && live.length > 0) {
        const unique = Array.from(new Map(live.map((p) => [p.id, p])).values())
        setProducts(unique)

        // Clamp cart items against fresh stock
        setItems((prev) => {
          let changed = false
          const sanitized = prev
            .map((item) => {
              const prod = unique.find((p) => p.id === item.productId)
              if (prod && prod.stockQuantity !== undefined && item.quantity > prod.stockQuantity) {
                changed = true
                return prod.stockQuantity > 0 ? { ...item, quantity: prod.stockQuantity } : null
              }
              return item
            })
            .filter((i): i is CartItem => i !== null)
          return changed ? sanitized : prev
        })
      }
    } catch {}
  }

  async function loadStores() {
    try {
      const liveStores = await fetchStores()
      if (Array.isArray(liveStores) && liveStores.length > 0) {
        setStores(liveStores)
      }
    } catch {}
  }

  useEffect(() => {
    loadProducts()
    loadStores()

    // 1. Periodic auto-sync fallback (every 4 seconds) to guarantee stock is never stale
    const timer = setInterval(() => {
      loadProducts()
      loadStores()
    }, 4000)

    // 2. Immediate re-sync when web tab comes into view
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadProducts()
        loadStores()
      }
    }
    const onFocus = () => {
      loadProducts()
      loadStores()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    const s = getSocket()

    function onSocketConnect() {
      loadProducts()
      loadStores()
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
            if (!next.some((p) => p.id === upd.id)) {
              next.push(upd)
            }
          }
        }
        return next
      })

      // Clamp cart quantities in real-time if partner reduces stock or item sells out
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

    s.on('connect', onSocketConnect)
    s.on('stock_updated', onStockUpdated)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      s.off('connect', onSocketConnect)
      s.off('stock_updated', onStockUpdated)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
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
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i,
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

  // Turns the cart into the plain-text "items" line the order form/backend expects
  // — e.g. "2x Sambar Vegetable Mix, 1x Bisleri 20L"
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
        stores,
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
        refreshStores: loadStores,
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
