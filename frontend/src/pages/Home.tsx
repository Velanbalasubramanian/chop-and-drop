import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClockIcon, KnifeIcon, TruckIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import DualSearch from '../components/DualSearch'
import { useCart } from '../context/CartContext'

const steps = [
  {
    icon: KnifeIcon,
    title: 'You pick what you need',
    body: 'Choose from ready packs — sambar mix, poriyal mix, salad mix — or tell us your regular order.',
  },
  {
    icon: ClockIcon,
    title: 'Quality checked & packed fresh',
    body: 'Picked fresh and prepared at our fulfillment hub the very morning of delivery.',
  },
  {
    icon: TruckIcon,
    title: 'It reaches your door fast',
    body: 'Pick a delivery slot that fits your schedule, daily or on the days you choose.',
  },
]

const HOME_CATEGORIES = [
  { id: 'cut_veggies', title: 'Cut Veggies', emoji: '🍏', bg: '#f0fdf4', color: '#16a34a' },
  { id: 'grocery', title: 'Groceries', emoji: '🛒', bg: '#fff7ed', color: '#ea580c' },
  { id: 'cakes', title: 'Cakes & Bakes', emoji: '🎂', bg: '#fdf2f8', color: '#db2777' },
  { id: 'water', title: '20L Water', emoji: '💧', bg: '#f0f9ff', color: '#0284c7' },
  { id: 'flowers', title: 'Pooja Flowers', emoji: '🌼', bg: '#fffbeb', color: '#d97706' },
  { id: 'electricals', title: 'Electricals', emoji: '⚡', bg: '#f5f3ff', color: '#7c3aed' },
]

export default function Home() {
  const { products, stores } = useCart()
  const [storeCategoryFilter, setStoreCategoryFilter] = useState('All')

  const filteredStores = stores.filter((s) => {
    if (storeCategoryFilter === 'All') return true
    return s.category === storeCategoryFilter
  })

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-text">
          <p className="hero-eyebrow">Your Everyday Quick Commerce Delivery Hub</p>
          <h1>
            Groceries, Bakeries,
            <br />
            Cakes &amp; Veggies in Minutes.
          </h1>
          <p className="hero-sub">
            Order directly from local merchant stores like <strong>Nila Bakery</strong>, City Mart Grocers, and fresh produce hubs across Chennai.
          </p>

          <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
            <DualSearch placeholder="Search stores (e.g. Nila Bakery) or items (e.g. Brownie, Rice)..." />
          </div>

          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary">
              Shop All Products
            </Link>
            <Link to="/track" className="btn btn-ghost">
              Track Order
            </Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-floating-badge hero-badge-top">⚡ 20 Min Delivery</div>
          <div className="hero-card hero-card-1">
            <span className="hero-card-label">🏪 Top Bakery</span>
            <span className="hero-card-value">Nila Bakery</span>
          </div>
          <div className="hero-card hero-card-2">
            <span className="hero-card-label">Trending Dish</span>
            <span className="hero-card-value">Hot Molten Brownie</span>
          </div>
          <div className="hero-floating-badge hero-badge-bottom">⭐ 4.9 Rating Verified</div>
          <div className="hero-blob" />
        </div>
      </section>

      {/* SWIGGY STYLE: FEATURED STORES & BAKERIES */}
      <section className="section stores-section" style={{ paddingTop: '1.5rem', paddingBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🏪 Top Merchant Outlets
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.2rem 0', color: '#0f172a' }}>
              Order From Top Stores &amp; Bakeries
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
              Tap any store to explore its dedicated menu &amp; fresh inventory
            </p>
          </div>

          {/* Store Category Filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['All', 'cakes', 'grocery', 'cut_veggies'].map((cat) => (
              <button
                key={cat}
                onClick={() => setStoreCategoryFilter(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: '1px solid #cbd5e1',
                  background: storeCategoryFilter === cat ? '#059669' : '#ffffff',
                  color: storeCategoryFilter === cat ? '#ffffff' : '#334155',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {cat === 'All' ? 'All Outlets' : cat === 'cakes' ? '🎂 Bakeries & Cakes' : cat === 'grocery' ? '🛒 Groceries' : '🥗 Cut Veggies'}
              </button>
            ))}
          </div>
        </div>

        {/* Store Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredStores.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '16px' }}>
              <p style={{ color: '#64748b' }}>No stores listed under this category.</p>
            </div>
          ) : (
            filteredStores.map((st) => (
              <Link
                key={st.id}
                to={`/store/${st.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(5, 150, 105, 0.12)'
                  e.currentTarget.style.borderColor = '#059669'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.04)'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* Store Header Banner */}
                <div
                  style={{
                    background:
                      st.category === 'cakes'
                        ? 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #fb7185 100%)'
                        : st.category === 'grocery'
                        ? 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)'
                        : 'linear-gradient(135deg, #047857 0%, #059669 50%, #34d399 100%)',
                    padding: '1.5rem 1.25rem',
                    color: '#ffffff',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {st.category}
                    </span>
                    <span style={{ background: '#ffffff', color: '#0f172a', padding: '3px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800 }}>
                      ★ {st.rating || 4.9}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    {st.storeName}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#f8fafc', opacity: 0.9, marginTop: '4px' }}>
                    ⚡ {st.deliveryTime || '20-25 mins'} • 📍 {st.address}
                  </div>
                </div>

                {/* Store Details Body */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 12px', lineHeight: 1.4 }}>
                    {st.description || 'Artisan local partner store providing direct daily delivery.'}
                  </p>

                  <div>
                    {st.sampleItems && st.sampleItems.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '12px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                        <b>Popular items:</b> {st.sampleItems.join(', ')}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                        {st.itemCount || 0} Items Available
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>
                        Open Store Menu →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Shop By Category Grid */}
      <section className="section categories-section" style={{ paddingTop: '1rem', paddingBottom: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem', color: '#0f172a' }}>
            Shop By Category
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.05rem' }}>
            Tap any category to explore products &amp; order in seconds
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.25rem',
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '0 1rem',
          }}
        >
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
              }}
              style={{
                backgroundColor: cat.bg,
                borderRadius: '20px',
                padding: '1.75rem 1rem',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginBottom: '0.85rem',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                }}
              >
                {cat.emoji}
              </div>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textAlign: 'center',
                  lineHeight: 1.25,
                }}
              >
                {cat.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Products Live Grid */}
      <section className="section featured-section">
        <div className="section-heading-row">
          <div>
            <h2 style={{ margin: '0 0 4px' }}>Popular This Week</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Freshly prepared and direct from merchant partners</p>
          </div>
          <Link to="/products" className="text-link">
            View all items →
          </Link>
        </div>
        <div className="product-grid">
          {products.slice(0, 4).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="section steps-section">
        <h2>How it reaches your kitchen</h2>
        <div className="steps-grid">
          {steps.map((step) => (
            <div className="step-card" key={step.title}>
              <step.icon className="step-icon" />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
