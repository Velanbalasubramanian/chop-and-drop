import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'

const CATEGORIES = [
  { id: 'All', label: 'All Items' },
  { id: 'cut_veggies', label: 'Fresh Cut Veggies' },
  { id: 'grocery', label: 'Groceries' },
  { id: 'cakes', label: 'Cakes & Bakery' },
  { id: 'water', label: '20L Water Cans' },
  { id: 'flowers', label: 'Pooja Flowers' },
  { id: 'electricals', label: 'Electricals' },
]

export default function Products() {
  const { products } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category')
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam)
      setSearch('')
    }
    // Always scroll immediately to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [categoryParam])

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId)
    setSearchParams(catId === 'All' ? {} : { category: catId })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tamilName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (selectedCategory === 'All') return true
      if (selectedCategory === 'cut_veggies') {
        return p.category === 'cut_veggies' || (!p.category && (p.id.includes('mix') || p.id.includes('bulk')))
      }
      return p.category === selectedCategory
    })
  }, [products, selectedCategory, search])

  return (
    <section className="section page-section">
      <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2rem' }}>
        <p className="page-eyebrow">Zippo Super Store</p>
        <h1 style={{ marginBottom: '0.5rem' }}>Everything You Need, Delivered Fast</h1>
        <p className="page-intro" style={{ margin: '0 auto 1.5rem' }}>
          Explore groceries, fresh cut vegetables, celebration cakes, 20L water cans, pooja flowers, and electrical essentials.
        </p>

        {/* Live Search Input */}
        <div style={{ maxWidth: '480px', margin: '0 auto 1.5rem', position: 'relative' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groceries, veggies, cakes, bulbs, water..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: '999px',
              border: '1.5px solid #e2e8f0',
              fontSize: '0.95rem',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          />
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            🔍
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#94a3b8',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '1.5rem',
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: active ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                  background: active ? '#ea580c' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 2px 6px rgba(234, 88, 12, 0.25)' : 'none',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
          <h3>No items matched your search</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Try searching for something else or switch category tabs above.
          </p>
        </div>
      ) : (
        <div className="product-grid product-grid-wide">
          {filtered.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      )}
    </section>
  )
}
