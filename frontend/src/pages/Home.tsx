import { Link } from 'react-router-dom'
import { ClockIcon, KnifeIcon, TruckIcon } from '../components/Icons'
import { products } from '../data/products'
import ProductCard from '../components/ProductCard'

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
    title: 'It reaches your door by 7 AM',
    body: 'Pick a delivery slot that fits your cooking time, daily or on the days you choose.',
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
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="hero-eyebrow">Your Everyday Delivery Hub</p>
          <h1>
            Groceries, Veggies,
            <br />
            Cakes &amp; More in Minutes.
          </h1>
          <p className="hero-sub">
            Zippo delivers fresh cut vegetables, pantry groceries, celebration cakes, 20L water cans,
            pooja flowers, and electrical essentials fast to your doorstep across Chennai.
          </p>
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
          <div className="hero-floating-badge hero-badge-top">⚡ Fast Delivery</div>
          <div className="hero-card hero-card-1">
            <span className="hero-card-label">Today's cut</span>
            <span className="hero-card-value">Sambar Mix</span>
          </div>
          <div className="hero-card hero-card-2">
            <span className="hero-card-label">Delivery slot</span>
            <span className="hero-card-value">6:00 – 7:00 AM</span>
          </div>
          <div className="hero-floating-badge hero-badge-bottom">⚡ Ready to Cook · 0 Prep</div>
          <div className="hero-blob" />
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
              style={{
                backgroundColor: cat.bg,
                borderRadius: '20px',
                padding: '1.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.04)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)'
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

      <section className="section featured-section">
        <div className="section-heading-row">
          <h2>Popular this week</h2>
          <Link to="/products" className="text-link">
            View all packs →
          </Link>
        </div>
        <div className="product-grid">
          {products.slice(0, 3).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      <section className="section cta-section">
        <div className="cta-box">
          <h2>Cooking for a mess or small hotel?</h2>
          <p>We supply bulk cut vegetables on a standing schedule, sized to your kitchen's daily count.</p>
          <Link to="/order" className="btn btn-primary">
            Set up a bulk order
          </Link>
        </div>
      </section>
    </>
  )
}

