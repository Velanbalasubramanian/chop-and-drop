import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchStoreById } from '../api'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import type { Product, Store } from '../types'

export default function StorePage() {
  const { storeId } = useParams<{ storeId: string }>()
  const { products: allProducts } = useCart()
  const [store, setStore] = useState<(Store & { products: Product[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    fetchStoreById(storeId)
      .then((res) => {
        setStore(res.store)
      })
      .catch((err) => {
        setError(err.message || 'Could not load store menu.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [storeId])

  // Sync with live real-time products in CartContext for live stock changes
  const liveStoreProducts = useMemo(() => {
    if (!store) return []
    // Match products from live CartContext by partnerId or category
    const matched = allProducts.filter(
      (p) => p.partnerId === store.id || (!p.partnerId && p.category === store.category)
    )
    return matched.length > 0 ? matched : store.products || []
  }, [store, allProducts])

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return liveStoreProducts.filter((p) => {
      const q = menuSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))

      if (!matchesSearch) return false
      if (activeCategory === 'All') return true
      return p.category === activeCategory
    })
  }, [liveStoreProducts, menuSearch, activeCategory])

  if (loading) {
    return (
      <section className="section page-section" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 1s infinite linear' }}>⏳</div>
        <h2>Loading Store Menu…</h2>
        <p style={{ color: '#64748b' }}>Fetching live products and freshly baked items</p>
      </section>
    )
  }

  if (error || !store) {
    return (
      <section className="section page-section" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏪</div>
        <h2>Store Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'This store is temporarily offline.'}</p>
        <Link to="/products" className="btn btn-primary">
          Browse All Products
        </Link>
      </section>
    )
  }

  const categoryOptions = Array.from(new Set(liveStoreProducts.map((p) => p.category || 'General')))

  return (
    <section className="section page-section store-page-section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 3.5rem' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
        <Link to="/" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
        {' / '}
        <Link to="/products" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>Stores</Link>
        {' / '}
        <span style={{ color: '#0f172a', fontWeight: 700 }}>{store.storeName}</span>
      </div>

      {/* Swiggy Style Store Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '2.25rem 2rem',
          marginBottom: '2rem',
          boxShadow: '0 12px 30px rgba(6, 78, 59, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: '0.78rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🏪 Verified Merchant Store
              </span>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '0.78rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px' }}>
                {store.category.toUpperCase()}
              </span>
            </div>

            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem', lineHeight: 1.15 }}>
              {store.storeName}
            </h1>

            <p style={{ fontSize: '1rem', color: '#a7f3d0', margin: '0 0 1rem', maxWidth: '640px', lineHeight: 1.4 }}>
              {store.description || 'Specialist in freshly made everyday essentials and quick local fulfillment.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '12px' }}>
                <span style={{ color: '#fbbf24', fontSize: '1.1rem' }}>★</span>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{store.rating || 4.9}</span>
                <span style={{ color: '#a7f3d0', fontSize: '0.8rem' }}>(250+ ratings)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '12px' }}>
                <span>⚡</span>
                <span style={{ fontWeight: 700 }}>{store.deliveryTime || '20-25 mins'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '12px' }}>
                <span>📍</span>
                <span>{store.address || 'Chennai'}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', padding: '16px 20px', textAlign: 'center', minWidth: '160px' }}>
            <div style={{ fontSize: '0.8rem', color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>Outlet Menu</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '4px 0' }}>{liveStoreProducts.length}</div>
            <div style={{ fontSize: '0.8rem', color: '#ffffff' }}>Items In Stock</div>
          </div>
        </div>
      </div>

      {/* Store Menu Search & Category Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <input
            type="text"
            placeholder={`Search dishes in ${store.storeName} (e.g. Brownie, Cake)...`}
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: '999px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.95rem',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          />
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            🔍
          </span>
          {menuSearch && (
            <button
              onClick={() => setMenuSearch('')}
              style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills if store has multiple categories */}
        {categoryOptions.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setActiveCategory('All')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeCategory === 'All' ? '#059669' : '#f1f5f9',
                color: activeCategory === 'All' ? '#ffffff' : '#334155',
              }}
            >
              All Items ({liveStoreProducts.length})
            </button>
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeCategory === cat ? '#059669' : '#f1f5f9',
                  color: activeCategory === cat ? '#ffffff' : '#334155',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
          Menu Items ({filteredProducts.length})
        </h2>
        <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>
          ⚡ 100% Fresh &amp; Direct from {store.storeName}
        </span>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#64748b' }}>
            No products match "{menuSearch}" under {store.storeName}.
          </p>
          <button
            onClick={() => setMenuSearch('')}
            className="btn btn-outline"
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </section>
  )
}
