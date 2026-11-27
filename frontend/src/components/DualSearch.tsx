import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import ProductCard from './ProductCard'

interface DualSearchProps {
  placeholder?: string
  autoFocus?: boolean
}

export default function DualSearch({
  placeholder = 'Search stores, bakeries, or items (e.g. Nila Bakery, Brownie, Rice)...',
}: DualSearchProps) {
  const { products, stores } = useCart()
  const [query, setQuery] = useState('')

  // Filter Matching Stores
  const matchingStores = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return stores.filter(
      (s) =>
        s.storeName.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    )
  }, [stores, query])

  // Filter Matching Products
  const matchingProducts = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tamilName && p.tamilName.toLowerCase().includes(q)) ||
        p.category?.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.storeName && p.storeName.toLowerCase().includes(q))
    )
  }, [products, query])

  const hasSearch = Boolean(query.trim())

  return (
    <div className="dual-search-container" style={{ width: '100%', margin: '0 auto' }}>
      {/* Search Input Bar */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto 1.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '0.9rem 1.25rem 0.9rem 3rem',
            borderRadius: '999px',
            border: '2px solid #059669',
            fontSize: '1rem',
            outline: 'none',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.12)',
            background: '#ffffff',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '1.1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.2rem',
            color: '#059669',
          }}
        >
          🔍
        </span>
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: '1.1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              color: '#64748b',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dual Search Results Overlay / Results Area */}
      {hasSearch && (
        <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
          {/* 1. MATCHING STORES SECTION (Swiggy Style Store Cards) */}
          {matchingStores.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🏪</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Matching Stores &amp; Bakeries ({matchingStores.length})
                </h3>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {matchingStores.map((st) => (
                  <Link
                    key={st.id}
                    to={`/store/${st.id}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      transition: 'transform 0.2s, border-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.borderColor = '#059669'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = '#e2e8f0'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          {st.storeName}
                        </h4>
                        <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                          ★ {st.rating || 4.9}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                        {st.category}
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 10px', lineHeight: 1.35 }}>
                        {st.description || 'Quality local partner store'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.82rem', color: '#475569' }}>
                      <span>📍 {st.address}</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>View Menu →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 2. MATCHING PRODUCTS SECTION */}
          {matchingProducts.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎂</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Matching Items &amp; Dishes ({matchingProducts.length})
                </h3>
              </div>

              <div className="product-grid">
                {matchingProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {matchingStores.length === 0 && matchingProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '16px' }}>
              <p style={{ fontSize: '1.1rem', color: '#64748b', margin: '0 0 0.5rem' }}>
                No stores or items found for "{query}".
              </p>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Try searching for "Nila Bakery", "Brownie", "Cake", or "Rice".
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
